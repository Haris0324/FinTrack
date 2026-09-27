import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import { hasTrustedAdminOrigin, isCurrentAdmin } from "@/lib/admin-auth";
import { sendAdminInviteEmail } from "@/lib/email";
import ActivityLog from "@/models/ActivityLog";
import AdminInvite from "@/models/AdminInvite";
import User from "@/models/User";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(await isCurrentAdmin(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const url = new URL(request.url);
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const safeRequestedPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
    const status = url.searchParams.get("status") || "all";
    if (!["all", "active", "disabled"].includes(status)) {
      return NextResponse.json({ error: "Invalid account status filter" }, { status: 400 });
    }

    const query: Record<string, unknown> = {};
    if (status === "active") query.isActive = { $ne: false };
    if (status === "disabled") query.isActive = false;
    if (search) {
      const searchPattern = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: searchPattern }, { email: searchPattern }];
    }

    await connectToDatabase();
    const pageSize = 10;
    const total = await User.countDocuments(query);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(safeRequestedPage, pages);
    const records = await User.find(query)
      .select("_id name email role isActive isVerified createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return NextResponse.json({
      users: records.map(user => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.isActive !== false,
        verified: user.isVerified === true,
        createdAt: user.createdAt,
      })),
      page,
      pageSize,
      total,
      pages,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Admin user list error:", error);
    return NextResponse.json({ error: "Could not load user accounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const adminUserId = session?.user?.id;
  if (!adminUserId || !(await isCurrentAdmin(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasTrustedAdminOrigin(request)) return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { name, email } = body as { name?: unknown; email?: unknown };
    if (typeof name !== "string" || typeof email !== "string") {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedName.length < 2 || normalizedName.length > 80) {
      return NextResponse.json({ error: "Name must be between 2 and 80 characters" }, { status: 400 });
    }
    if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }

    await connectToDatabase();
    const emailRegex = new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i");
    if (await User.exists({ email: emailRegex })) {
      return NextResponse.json({ error: "An account already exists for this email" }, { status: 409 });
    }

    const invitationWindowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentInviteAttempts = await ActivityLog.countDocuments({
      userId: adminUserId,
      action: { $regex: "^User invitation attempt:" },
      createdAt: { $gte: invitationWindowStart },
    });
    if (recentInviteAttempts >= 10) {
      return NextResponse.json({ error: "Invitation limit reached. Try again in an hour." }, { status: 429 });
    }

    const auditEntry = await ActivityLog.create({
      userId: adminUserId,
      action: `User invitation attempt: ${normalizedEmail}`,
      status: "Warning",
      type: "warning",
    });

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invitation = await AdminInvite.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { name: normalizedName, email: normalizedEmail, tokenHash, expires, invitedBy: adminUserId } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    try {
      await sendAdminInviteEmail(normalizedEmail, token);
    } catch (emailError) {
      await AdminInvite.deleteOne({ _id: invitation._id, tokenHash });
      await ActivityLog.updateOne({ _id: auditEntry._id }, { $set: { status: "Failed", type: "danger" } });
      console.error("Admin invitation email failed:", emailError);
      return NextResponse.json({ error: "Invitation email could not be sent; no account was created" }, { status: 503 });
    }

    try {
      await ActivityLog.updateOne({ _id: auditEntry._id }, { $set: { status: "Success", type: "success" } });
    } catch (logError) {
      console.error("Admin invite audit log failed:", logError);
    }

    return NextResponse.json({ success: true, message: `Setup invitation sent to ${normalizedEmail}` }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "An account or invitation already exists for this email" }, { status: 409 });
    }
    console.error("Admin user invitation error:", error);
    return NextResponse.json({ error: "Could not invite this user" }, { status: 500 });
  }
}
