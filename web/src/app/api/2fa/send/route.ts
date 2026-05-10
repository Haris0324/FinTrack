import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is not enabled for this account' }, { status: 400 });
    }

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    
    // Set expiry to 10 minutes from now
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    user.twoFactorCode = code;
    user.twoFactorExpires = expires;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'FinTrack - Your 2-Factor Authentication Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Authentication Code</h2>
          <p>Please use the following code to complete your sign in:</p>
          <div style="background-color: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="margin: 0; color: #1e293b; letter-spacing: 5px;">${code}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this code, please secure your account immediately.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: '2FA code sent successfully' });

  } catch (error) {
    console.error("2FA send error:", error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
