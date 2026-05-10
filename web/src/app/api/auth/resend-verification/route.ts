import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: "Account already verified" }, { status: 400 });
    }

    // Delete any existing tokens for this user
    await VerificationToken.deleteMany({ email });

    // Generate new token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({ email, token, expires });

    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to resend verification email:", emailError);
      return NextResponse.json({ message: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ message: "Verification link resent! Please check your email." });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
