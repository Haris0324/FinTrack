import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import mongoose from "mongoose";
import { isCurrentAdmin } from "@/lib/admin-auth";

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(await isCurrentAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    const { highImpactThresholdPct, emailAlertsEnabled, alertEmail } = body as {
      highImpactThresholdPct?: unknown; emailAlertsEnabled?: unknown; alertEmail?: unknown;
    };
    if (typeof highImpactThresholdPct !== "number" || !Number.isFinite(highImpactThresholdPct) || highImpactThresholdPct < 0.25 || highImpactThresholdPct > 15) {
      return NextResponse.json({ error: "Impact threshold must be between 0.25% and 15%" }, { status: 400 });
    }
    if (typeof emailAlertsEnabled !== "boolean" || typeof alertEmail !== "string" || (emailAlertsEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail))) {
      return NextResponse.json({ error: "Enter a valid alert email and notification setting" }, { status: 400 });
    }
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database unavailable");
    await db.collection<{ _id: string; highImpactThresholdPct?: number; emailAlertsEnabled?: boolean; alertEmail?: string; updatedAt?: Date; updatedBy?: string }>("adminconfig").updateOne(
      { _id: "configuration" },
      { $set: { highImpactThresholdPct, emailAlertsEnabled, alertEmail: alertEmail.trim().toLowerCase(), updatedAt: new Date(), updatedBy: session?.user?.email ?? "" } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, highImpactThresholdPct });
  } catch (error) {
    console.error("Admin model setting update error:", error);
    return NextResponse.json({ error: "Could not update impact threshold" }, { status: 500 });
  }
}
