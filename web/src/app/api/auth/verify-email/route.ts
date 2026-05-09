import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 400 });
    }

    await connectToDatabase();

    const verifyToken = await VerificationToken.findOne({ token });

    if (!verifyToken) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    if (new Date() > verifyToken.expires) {
      await VerificationToken.deleteOne({ _id: verifyToken._id });
      return NextResponse.json({ message: "Token has expired. Please register again." }, { status: 400 });
    }

    const user = await User.findOne({ email: verifyToken.email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    user.isVerified = true;
    await user.save();

    await VerificationToken.deleteOne({ _id: verifyToken._id });

    return NextResponse.json({ message: "Email verified successfully" }, { status: 200 });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ message: "An error occurred during verification" }, { status: 500 });
  }
}
