import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) };
  }
  return { session, error: null };
}
