import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, newPassword } = await req.json();

    if (!code || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Valid code and new password (min 6 chars) are required' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById((session.user as any).id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify OTP
    if (user.twoFactorCode !== code || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
      return NextResponse.json({ error: 'Invalid or expired reset code' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    // Clear code
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    
    await user.save();

    try {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
      await ActivityLog.create({
        userId: user._id,
        action: 'Password reset via OTP',
        status: 'Success',
        type: 'success',
        ip
      });
    } catch(e) {}

    return NextResponse.json({ success: true, message: 'Password reset successfully' });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
