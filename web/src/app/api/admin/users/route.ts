import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import ActivityLog from '@/models/ActivityLog';
import { requireAdmin } from '@/lib/adminAuth';

// GET /api/admin/users?page=1&limit=10&search=&role=&verified=
export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const search   = searchParams.get('search')   || '';
  const roleFilter    = searchParams.get('role')     || '';
  const verifiedFilter = searchParams.get('verified') || '';

  const query: any = {};
  if (search) {
    query.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (roleFilter === 'admin' || roleFilter === 'user') query.role = roleFilter;
  if (verifiedFilter === 'true')  query.isVerified = true;
  if (verifiedFilter === 'false') query.isVerified = false;

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .select('-password -twoFactorCode -twoFactorExpires -__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  // Fetch last login per user from ActivityLog
  const userIds = users.map((u: any) => u._id);
  const lastLogins = await ActivityLog.aggregate([
    { $match: { userId: { $in: userIds }, action: 'Logged in' } },
    { $sort:  { createdAt: -1 } },
    { $group: { _id: '$userId', lastLoginAt: { $first: '$createdAt' } } },
  ]);
  const loginMap: Record<string, Date> = {};
  lastLogins.forEach((l: any) => { loginMap[l._id.toString()] = l.lastLoginAt; });

  const enriched = users.map((u: any) => ({
    ...u,
    lastLoginAt: loginMap[u._id.toString()] || null,
  }));

  return NextResponse.json({ users: enriched, total, page, limit, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/users  — change role or ban/unban
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const { userId, action, value } = body;

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  if (!['setRole', 'ban', 'unban'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Prevent self-modification
  if ((session!.user as any).id === userId) {
    return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 403 });
  }

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (action === 'setRole') {
    if (!['user', 'admin'].includes(value)) {
      return NextResponse.json({ error: 'Role must be user or admin' }, { status: 400 });
    }
    user.role = value;
  } else if (action === 'ban') {
    user.isBanned = true;
  } else if (action === 'unban') {
    user.isBanned = false;
  }

  await user.save();
  return NextResponse.json({ success: true, user: { _id: user._id, role: user.role, isBanned: user.isBanned } });
}

// DELETE /api/admin/users?userId=xxx
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || '';

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }
  if ((session!.user as any).id === userId) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
  }

  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Soft delete: keep record but disable
  user.isBanned = true;
  user.role = 'user';
  await user.save();

  return NextResponse.json({ success: true });
}
