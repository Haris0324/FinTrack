import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcrypt";
import dns from "dns/promises";

async function verifyEmailDomain(email: string) {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    console.error("DNS MX lookup failed for:", email, error);
    return false;
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

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      providers: ["credentials"],
    });

    return NextResponse.json(
      { message: "User registered successfully" },
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
