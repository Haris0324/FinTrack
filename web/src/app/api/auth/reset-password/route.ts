import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import ResetToken from "@/models/ResetToken";
import bcrypt from "bcrypt";
import { validatePassword } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Missing token or password" }, { status: 400 });
    }

    await connectToDatabase();

    const resetToken = await ResetToken.findOne({ token });

    if (!resetToken) {
      return NextResponse.json({ message: "Invalid or expired reset token" }, { status: 400 });
    }

    if (new Date() > resetToken.expires) {
      await ResetToken.deleteOne({ _id: resetToken._id });
      return NextResponse.json({ message: "Token has expired. Please request a new link." }, { status: 400 });
    }

    const user = await User.findOne({ email: resetToken.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ message: passwordValidation.message }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    await ResetToken.deleteMany({ email: user.email });

    return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
