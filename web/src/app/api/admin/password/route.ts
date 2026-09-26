import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import { requireAdmin } from '@/lib/adminAuth';
import bcrypt from 'bcrypt';

// PATCH /api/admin/password — admin changes own password
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both currentPassword and newPassword are required' }, { status: 400 });
  }

  // Password strength validation
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json({ error: 'Password must contain uppercase, lowercase, and a number' }, { status: 400 });
  }

  await connectToDatabase();

  const adminId = (session!.user as any).id;
  const user = await User.findById(adminId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Verify current password
  if (!user.password) {
    return NextResponse.json({ error: 'Account uses OAuth provider. Cannot change password.' }, { status: 400 });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
  }

  // Hash and save new password
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  return NextResponse.json({ success: true, message: 'Password changed successfully' });
}
