import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import ActivityLog from '@/models/ActivityLog';
import SessionLog from '@/models/SessionLog';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    await connectToDatabase();

    const userId = (session.user as any).id;

    const activities = await ActivityLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const sessions = await SessionLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    return NextResponse.json({ success: true, activities, sessions });

  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
