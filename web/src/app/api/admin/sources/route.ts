import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import mongoose from "mongoose";
import { isIP } from "node:net";
import { isCurrentAdmin } from "@/lib/admin-auth";

type SourceConfig = { name: string; url: string; enabled: boolean };
const DEFAULT_SOURCES: SourceConfig[] = [
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss", enabled: true },
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", enabled: true },
  { name: "CryptoPanic", url: "https://cryptopanic.com/news/rss/", enabled: true },
  { name: "Google News: Reuters", url: "https://news.google.com/rss/search?q=bitcoin+reuters", enabled: true },
  { name: "Google News: Bloomberg", url: "https://news.google.com/rss/search?q=bitcoin+bloomberg", enabled: true },
];

function isPrivateOrLocalHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host === "metadata.google.internal") return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (isIP(host) === 6) {
    return host === "::" || host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
  }
  return false;
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(await isCurrentAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    const { url, enabled } = body as { url?: unknown; enabled?: unknown };
    if (typeof url !== "string" || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "A source URL and enabled state are required" }, { status: 400 });
    }
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database unavailable");
    const collection = db.collection<{ _id: string; sources?: SourceConfig[]; updatedAt?: Date; updatedBy?: string }>("adminconfig");
    const existing = await collection.findOne({ _id: "configuration" });
    const sources = Array.isArray(existing?.sources) ? existing.sources : DEFAULT_SOURCES;
    const source = sources.find(item => item.url === url);
    if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
    source.enabled = enabled;
    await collection.updateOne(
      { _id: "configuration" },
      { $set: { sources, updatedAt: new Date(), updatedBy: session?.user?.email ?? "" } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, sources });
  } catch (error) {
    console.error("Admin source update error:", error);
    return NextResponse.json({ error: "Could not update source" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(await isCurrentAdmin(session))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body: unknown = await request.json();
    const { name, url } = body as { name?: unknown; url?: unknown };
    if (typeof name !== "string" || !name.trim() || typeof url !== "string") {
      return NextResponse.json({ error: "Source name and URL are required" }, { status: 400 });
    }
    const parsed = new URL(url);
    if (parsed.username || parsed.password || isPrivateOrLocalHost(parsed.hostname)) {
      return NextResponse.json({ error: "Feed URLs must use a public host and cannot include embedded credentials" }, { status: 400 });
    }
    if (!(["http:", "https:"].includes(parsed.protocol))) {
      return NextResponse.json({ error: "Only HTTP(S) RSS URLs are supported" }, { status: 400 });
    }
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Database unavailable");
    const collection = db.collection<{ _id: string; sources?: SourceConfig[]; updatedAt?: Date; updatedBy?: string }>("adminconfig");
    const existing = await collection.findOne({ _id: "configuration" });
    const sources = Array.isArray(existing?.sources) ? existing.sources : DEFAULT_SOURCES;
    if (sources.length >= 30) return NextResponse.json({ error: "A maximum of 30 RSS sources is supported" }, { status: 400 });
    if (sources.some(item => item.url === parsed.toString())) {
      return NextResponse.json({ error: "That source URL is already configured" }, { status: 409 });
    }
    sources.push({ name: name.trim().slice(0, 80), url: parsed.toString(), enabled: true });
    await collection.updateOne(
      { _id: "configuration" },
      { $set: { sources, updatedAt: new Date(), updatedBy: session?.user?.email ?? "" } },
      { upsert: true },
    );
    return NextResponse.json({ success: true, sources });
  } catch (error: unknown) {
    if (error instanceof TypeError) return NextResponse.json({ error: "Enter a valid source URL" }, { status: 400 });
    console.error("Admin source create error:", error);
    return NextResponse.json({ error: "Could not add source" }, { status: 500 });
  }
}
