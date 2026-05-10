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

    const { enable } = await req.json();

    if (enable === undefined) {
      return NextResponse.json({ error: 'Missing "enable" field' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById((session.user as any).id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.twoFactorEnabled = !!enable;
    await user.save();

    // Log Activity
    try {
      const ip = req.headers.get('x-forwarded-for') || 'Unknown IP';
      await ActivityLog.create({
        userId: user._id,
        action: enable ? '2-Factor Authentication enabled' : '2-Factor Authentication disabled',
        status: 'Success',
        type: 'success',
        ip
      });
    } catch(err) {}

    return NextResponse.json({ success: true, message: `2FA ${enable ? 'enabled' : 'disabled'}` });

  } catch (error) {
    console.error("2FA toggle error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
