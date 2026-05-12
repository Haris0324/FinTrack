import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import bcrypt from "bcrypt";
import dns from "dns/promises";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { validatePassword } from "@/lib/validation";

async function verifyEmailDomain(email: string) {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    
    // Add a race to prevent hanging on DNS lookups
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("DNS Timeout")), 3000)
    );
    
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      timeout
    ]) as any[];
    
    return mxRecords && mxRecords.length > 0;
  } catch (error: any) {
    console.error("DNS MX lookup skipped/failed for:", email, error.message);
    return true; // Fallback to true
  }
}

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Please fill all fields" },
        { status: 400 }
      );
    }

    // 1. Verify Domain MX records (Check if email is real)
    const isValidDomain = await verifyEmailDomain(email);
    if (!isValidDomain) {
      return NextResponse.json(
        { message: "The email domain is invalid or cannot receive emails. Please use a real email address." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Check if they signed up via OAuth and don't have a password
      if (!existingUser.password && existingUser.providers && existingUser.providers.length > 0) {
        return NextResponse.json(
          { message: `Email already registered via ${existingUser.providers[0]}. Please sign in using that provider.` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: "Email already exists. Please sign in." },
        { status: 400 }
      );
    }

    // 2.5 Validate Password Strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json({ message: passwordValidation.message }, { status: 400 });
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      providers: ["credentials"],
      isVerified: false,
    });

    // 5. Generate Verification Token and Send Email
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await VerificationToken.create({ email, token, expires });

    try {
      await sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      return NextResponse.json(
        { message: "Account created but failed to send verification email. Please contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Account created! Please check your email to verify your account." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
