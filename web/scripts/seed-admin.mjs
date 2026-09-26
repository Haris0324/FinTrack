/**
 * Run this script ONCE to create a hardcoded admin account.
 * 
 * Usage:
 *   node scripts/seed-admin.mjs
 * 
 * This creates an admin user with:
 *   Email:    admin@fintrack.com
 *   Password: Admin@123
 * 
 * You can change the password from the Admin Panel → Settings after logging in.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintrack';

const ADMIN_EMAIL    = 'admin@fintrack.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME     = 'FinTrack Admin';

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  providers: { type: [String], default: ['credentials'] },
  isVerified: { type: Boolean, default: false },
  profilePicture: { type: String, default: '' },
  phone: { type: String, default: '' },
  company: { type: String, default: '' },
  position: { type: String, default: '' },
  twoFactorEnabled: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
}, { timestamps: true });

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      // Update to admin role if not already
      existing.role = 'admin';
      existing.isVerified = true;
      existing.isBanned = false;
      // Update password
      existing.password = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await existing.save();
      console.log(`\n✓ Admin account updated:`);
    } else {
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
      console.log(`\n✓ Admin account created:`);
    }

    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role:     admin`);
    console.log(`\n→ Login at http://localhost:3000/signin`);
    console.log(`→ Then go to http://localhost:3000/admin`);
    console.log(`→ Change password from Admin Panel → Settings\n`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
