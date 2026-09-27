import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import { hasTrustedAdminOrigin, isCurrentAdmin } from "@/lib/admin-auth";
import ActivityLog from "@/models/ActivityLog";
import SessionLog from "@/models/SessionLog";
import User from "@/models/User";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const adminUserId = session?.user?.id;
  if (!adminUserId || !(await isCurrentAdmin(session))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasTrustedAdminOrigin(request)) return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });

  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid user id" }, { status: 400 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || typeof (body as { active?: unknown }).active !== "boolean") {
      return NextResponse.json({ error: "A valid account state is required" }, { status: 400 });
    }
    const active = (body as { active: boolean }).active;
    if (!active && adminUserId === id) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }

    await connectToDatabase();
    const target = await User.findById(id).select("name email role isActive");
    if (!target) return NextResponse.json({ error: "User account not found" }, { status: 404 });
    if (!active && target.role === "admin") {
      return NextResponse.json({ error: "Admin accounts cannot be deactivated here" }, { status: 403 });
    }

    target.isActive = active;
    await target.save();
    if (!active) {
      // Removing session records makes existing NextAuth sessions fail their session validity check.
      await SessionLog.deleteMany({ userId: target._id });
    }

    try {
      await ActivityLog.create({
        userId: adminUserId,
        action: `${active ? "Reactivated" : "Deactivated"} account ${target.email}`,
        status: "Success",
        type: "success",
      });
    } catch (logError) {
      console.error("Admin user audit log failed:", logError);
    }

    return NextResponse.json({ success: true, active });
  } catch (error) {
    console.error("Admin user status update error:", error);
    return NextResponse.json({ error: "Could not update user account" }, { status: 500 });
  }
}
