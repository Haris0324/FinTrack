import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById((session.user as any).id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorCode !== code || !user.twoFactorExpires || new Date() > user.twoFactorExpires) {
      return NextResponse.json({ error: 'Invalid or expired 2FA code' }, { status: 400 });
    }

    // Code is valid! Enable 2FA.
    user.twoFactorEnabled = true;
    user.twoFactorCode = undefined;
    user.twoFactorExpires = undefined;
    await user.save();

    // Log Activity
    try {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
      await ActivityLog.create({
        userId: user._id,
        action: '2-Factor Authentication enabled',
        status: 'Success',
        type: 'success',
        ip
      });
    } catch(err) {}

    return NextResponse.json({ success: true, message: '2FA enabled successfully' });

  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
