/* eslint-disable @typescript-eslint/no-require-imports */
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch {}
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  providers: { type: [String], default: ['credentials'] },
  isVerified: { type: Boolean, default: true },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI");
    process.exitCode = 1;
    return;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@fintrack.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123@';
  const strongPassword = typeof adminPassword === 'string'
    && adminPassword.length >= 8
    && /[A-Z]/.test(adminPassword)
    && /[a-z]/.test(adminPassword)
    && /[0-9]/.test(adminPassword)
    && /[^A-Za-z0-9]/.test(adminPassword);
  if (!adminEmail || !strongPassword) {
    console.error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (8+ characters with uppercase, lowercase, number, and symbol) in .env.local.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Remove admin role from all other existing admin accounts
    const demoted = await User.updateMany(
      { email: { $ne: adminEmail }, role: "admin" },
      { $set: { role: "user" } }
    );
    console.log(`Demoted ${demoted.modifiedCount} previous admin account(s) to 'user'.`);

    const existingAdmin = await User.findOne({ email: adminEmail });
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existingAdmin) {
      existingAdmin.role = "admin";
      existingAdmin.password = hashedPassword;
      existingAdmin.providers = [...new Set([...(existingAdmin.providers || []), "credentials"])];
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      console.log(`Admin account ${adminEmail} updated successfully with new credentials.`);
    } else {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        providers: ["credentials"],
        isVerified: true
      });
      console.log(`New admin account created successfully for ${adminEmail}.`);
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  } finally {
    mongoose.connection.close();
  }
}

seed();
