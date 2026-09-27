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
    const keywordsInput = (body as { keywords?: unknown }).keywords;
    if (!Array.isArray(keywordsInput) || keywordsInput.length > 30 || keywordsInput.some((item: unknown) => typeof item !== "string" || item.trim().length < 2 || item.trim().length > 40)) {
      return NextResponse.json({ error: "Enter up to 30 keywords, each 2–40 characters" }, { status: 400 });
    }
    const keywords = [...new Set((keywordsInput as string[]).map(item => item.trim().toLowerCase()))];
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database unavailable");
    await db.collection<{ _id: string; watchKeywords?: string[]; updatedAt?: Date; updatedBy?: string }>("adminconfig").updateOne(
      { _id: "configuration" },
      { $set: { watchKeywords: keywords, updatedAt: new Date(), updatedBy: session?.user?.email ?? "" } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, keywords });
  } catch (error) {
    console.error("Admin keyword update error:", error);
    return NextResponse.json({ error: "Could not update watched keywords" }, { status: 500 });
  }
}
