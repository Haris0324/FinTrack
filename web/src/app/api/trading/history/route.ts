import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import SwapTradeHistory from "@/models/SwapTradeHistory";
import TradeQuoteRateLimit from "@/models/TradeQuoteRateLimit";

export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const trusted = new Set<string>();
    if (process.env.NEXTAUTH_URL) trusted.add(new URL(process.env.NEXTAUTH_URL).origin);
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host) trusted.add(`https://${host.replace(/^https?:\/\//, "")}`);
    }
    if (process.env.NODE_ENV === "development") {
      trusted.add("http://localhost:3000");
      trusted.add("http://127.0.0.1:3000");
    }
    return trusted.has(new URL(origin).origin);
  } catch {
    return false;
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1_024) {
        await reader.cancel();
        throw new Error("body too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function writeAllowed(userId: string): Promise<boolean> {
  const now = Date.now();
  const window = Math.floor(now / 60_000);
  const [user, app] = await Promise.all([
    TradeQuoteRateLimit.findOneAndUpdate(
      { _id: `history:${userId}:minute:${window}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 60_000 + 120_000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    TradeQuoteRateLimit.findOneAndUpdate(
      { _id: `history:app:minute:${window}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 60_000 + 120_000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
  ]);
  return Boolean(user && user.count <= 12 && app && app.count <= 240);
}

async function readAllowed(userId: string): Promise<boolean> {
  const now = Date.now();
  const window = Math.floor(now / 60_000);
  const [user, app] = await Promise.all([
    TradeQuoteRateLimit.findOneAndUpdate(
      { _id: `history-read:${userId}:minute:${window}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 60_000 + 120_000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    TradeQuoteRateLimit.findOneAndUpdate(
      { _id: `history-read:app:minute:${window}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * 60_000 + 120_000) } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
  ]);
  return Boolean(user && user.count <= 30 && app && app.count <= 600);
}

function normalizeTradeInput(body: unknown): { direction: "BTC_TO_ETH" | "ETH_TO_BTC"; sourceChain: "BTC" | "ETH"; txHash: string } | null {
  if (!isRecord(body) || (body.direction !== "BTC_TO_ETH" && body.direction !== "ETH_TO_BTC")
    || (body.sourceChain !== "BTC" && body.sourceChain !== "ETH") || typeof body.txHash !== "string") return null;
  const direction = body.direction;
  const sourceChain = body.sourceChain;
  if ((direction === "BTC_TO_ETH") !== (sourceChain === "BTC")) return null;
  const txHash = body.txHash.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(txHash)) return null;
  return { direction, sourceChain, txHash: `${sourceChain === "ETH" ? "0x" : ""}${txHash.toLowerCase()}` };
}

function serialize(doc: { direction: string; sourceChain: string; txHash: string; createdAt: Date }) {
  return {
    id: `${doc.sourceChain}:${doc.txHash}`,
    direction: doc.direction,
    sourceChain: doc.sourceChain,
    txHash: doc.txHash,
    createdAt: doc.createdAt.getTime(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    if (!await readAllowed(userId)) return NextResponse.json({ error: "Trade history read limit reached. Try again in a minute." }, { status: 429 });
    const docs = await SwapTradeHistory.find({ userId }).sort({ createdAt: -1 }).limit(25).lean();
    return NextResponse.json({ items: docs.map((doc) => serialize(doc)) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trade history read failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Trade history is temporarily unavailable." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request" }, { status: 415 });
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid or oversized request" }, { status: 400 });
  }
  const trade = normalizeTradeInput(body);
  if (!trade) return NextResponse.json({ error: "Invalid submitted trade reference" }, { status: 400 });

  try {
    await connectToDatabase();
    const existing = await SwapTradeHistory.findOne({ userId, txHash: trade.txHash }).lean();
    if (existing) {
      if (existing.direction !== trade.direction || existing.sourceChain !== trade.sourceChain) {
        return NextResponse.json({ error: "This transaction hash is already recorded with different trade details." }, { status: 409 });
      }
      return NextResponse.json({ item: serialize(existing) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }
    if (!await writeAllowed(userId)) return NextResponse.json({ error: "Trade history update limit reached." }, { status: 429 });
    let doc;
    try {
      doc = await SwapTradeHistory.findOneAndUpdate(
        { userId, txHash: trade.txHash },
        { $setOnInsert: { ...trade, userId, createdAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean();
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      doc = await SwapTradeHistory.findOne({ userId, txHash: trade.txHash }).lean();
      if (doc && (doc.direction !== trade.direction || doc.sourceChain !== trade.sourceChain)) {
        return NextResponse.json({ error: "This transaction hash is already recorded with different trade details." }, { status: 409 });
      }
      if (!doc) throw error;
    }
    if (!doc) throw new Error("TRADE_HISTORY_WRITE_FAILED");
    const overflow = await SwapTradeHistory.find({ userId }).sort({ createdAt: -1 }).skip(25).select({ txHash: 1 }).lean();
    if (overflow.length > 0) await SwapTradeHistory.deleteMany({ userId, txHash: { $in: overflow.map((item) => item.txHash) } });
    return NextResponse.json({ item: serialize(doc) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trade history write failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Trade history could not be saved." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request" }, { status: 415 });
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid or oversized request" }, { status: 400 });
  }
  const trade = normalizeTradeInput(body);
  if (!trade) return NextResponse.json({ error: "Invalid trade reference" }, { status: 400 });
  try {
    await connectToDatabase();
    if (!await writeAllowed(userId)) return NextResponse.json({ error: "Trade history update limit reached." }, { status: 429 });
    await SwapTradeHistory.deleteOne({ userId, txHash: trade.txHash });
    return NextResponse.json({ removed: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trade history delete failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Trade history item could not be removed." }, { status: 502 });
  }
}
