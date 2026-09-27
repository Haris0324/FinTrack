/* eslint-disable @typescript-eslint/no-require-imports */
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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const strongPassword = typeof adminPassword === 'string'
    && adminPassword.length >= 12
    && /[A-Z]/.test(adminPassword)
    && /[a-z]/.test(adminPassword)
    && /[0-9]/.test(adminPassword)
    && /[^A-Za-z0-9]/.test(adminPassword);
  if (!adminEmail || !strongPassword) {
    console.error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters with uppercase, lowercase, number, and symbol) in .env.local.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const existingAdmin = await User.findOne({ email: adminEmail });
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existingAdmin) {
      existingAdmin.role = "admin";
      existingAdmin.password = hashedPassword;
      existingAdmin.providers = [...new Set([...(existingAdmin.providers || []), "credentials"])];
      existingAdmin.isVerified = true;
      await existingAdmin.save();
      console.log(`Existing account ${adminEmail} has been promoted to admin and its password updated.`);
    } else {
      await User.create({
        name: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
      });
      console.log("Default admin account created successfully.");
      console.log(`Admin account created for ${adminEmail}. The password is stored as a hash.`);
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  } finally {
    mongoose.connection.close();
  }
}

seed();
