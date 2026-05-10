import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongoose';
import SessionLog from '@/models/SessionLog';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const result = await SessionLog.findOneAndDelete({
      _id: sessionId,
      userId: (session.user as any).id
    });

    if (!result) {
      return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Session revoked successfully' });

  } catch (error) {
    console.error("Session revoke error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
