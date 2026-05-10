import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import SessionLog from '@/models/SessionLog';

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as any).id;

    // Delete associated data first
    await ActivityLog.deleteMany({ userId });
    await SessionLog.deleteMany({ userId });

    // Delete user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });

  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
