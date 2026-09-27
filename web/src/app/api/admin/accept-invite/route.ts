import { createHash } from "node:crypto";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import { hasTrustedAdminOrigin } from "@/lib/admin-auth";
import ActivityLog from "@/models/ActivityLog";
import AdminInvite from "@/models/AdminInvite";
import User from "@/models/User";
import { validatePassword } from "@/lib/validation";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function POST(request: Request) {
  if (!hasTrustedAdminOrigin(request)) return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { token, password } = body as { token?: unknown; password?: unknown };
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token) || typeof password !== "string" || password.length > 256) {
      return NextResponse.json({ error: "Invitation link or password is invalid" }, { status: 400 });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) return NextResponse.json({ error: passwordValidation.message }, { status: 400 });

    await connectToDatabase();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const invitation = await AdminInvite.findOne({ tokenHash, expires: { $gt: new Date() } }).select("+tokenHash");
    if (!invitation) return NextResponse.json({ error: "Invitation link is invalid or expired" }, { status: 400 });

    const emailRegex = new RegExp(`^${escapeRegex(invitation.email)}$`, "i");
    if (await User.exists({ email: emailRegex })) {
      await AdminInvite.deleteOne({ _id: invitation._id });
      return NextResponse.json({ error: "An account already exists for this email. Contact an administrator." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    let user;
    try {
      user = await User.create({
        name: invitation.name,
        email: invitation.email,
        password: hashedPassword,
        role: "user",
        isActive: true,
        isVerified: true,
        providers: ["credentials"],
      });
    } catch (error: unknown) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
      }
      throw error;
    }

    await AdminInvite.deleteOne({ _id: invitation._id, tokenHash });
    try {
      await ActivityLog.create({
        userId: user._id,
        action: "Accepted account invitation",
        status: "Success",
        type: "success",
      });
    } catch (logError) {
      console.error("Invitation acceptance audit log failed:", logError);
    }

    return NextResponse.json({ success: true, message: "Account created. You can now sign in." }, { status: 201 });
  } catch (error) {
    console.error("Invitation acceptance error:", error);
    return NextResponse.json({ error: "Could not create the account" }, { status: 500 });
  }
}
