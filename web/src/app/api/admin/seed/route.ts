import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL    = 'admin@fintrack.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME     = 'FinTrack Admin';

// One-time setup key — prevents unauthorized seeding
const SEED_KEY = 'fintrack-setup-2024';

// POST /api/admin/seed?key=fintrack-setup-2024
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (key !== SEED_KEY) {
    return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      existing.role = 'admin';
      existing.isVerified = true;
      existing.isBanned = false;
      existing.password = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await existing.save();
      return NextResponse.json({
        success: true,
        message: 'Admin account updated',
        credentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      providers: ['credentials'],
      isVerified: true,
      isBanned: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Admin account created',
      credentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to seed admin', detail: e.message }, { status: 500 });
  }
}
