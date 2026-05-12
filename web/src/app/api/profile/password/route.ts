import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import bcrypt from 'bcrypt';
import { validatePassword } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById((session.user as any).id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Cannot update OAuth passwords' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Log Activity
    try {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
      await ActivityLog.create({
        userId: user._id,
        action: 'Changed password',
        status: 'Success',
        type: 'success',
        ip
      });
    } catch(err) {}

    return NextResponse.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error("Password update error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
