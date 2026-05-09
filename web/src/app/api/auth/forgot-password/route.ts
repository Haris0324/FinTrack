import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import ResetToken from "@/models/ResetToken";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });

    // Always return success even if user not found for security reasons
    if (!user) {
      return NextResponse.json({ message: "Reset link sent if the email exists." }, { status: 200 });
    }

    if (!user.password && user.providers?.length) {
      return NextResponse.json(
        { message: `You signed up with ${user.providers[0]}. Please login with that provider.` }, 
        { status: 400 }
      );
    }

    // Delete any existing tokens for this user
    await ResetToken.deleteMany({ email });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await ResetToken.create({ email, token, expires });

    try {
      await sendPasswordResetEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError);
      return NextResponse.json({ message: "Failed to send reset email. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({ message: "Reset link sent if the email exists." }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
