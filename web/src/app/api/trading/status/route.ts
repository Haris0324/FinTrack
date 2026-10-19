import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import TradeQuoteRateLimit from "@/models/TradeQuoteRateLimit";
import { readBoundedTradingJson, readBoundedTradingResponse } from "@/lib/trading-http";

export const dynamic = "force-dynamic";

const THORNODE = "https://thornode.ninerealms.com/thorchain/tx/status/";
const MEMPOOL = "https://mempool.space/api/tx/";
const MEMPOOL_TIP = "https://mempool.space/api/blocks/tip/height";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";
const BITCOIN_CONFIRMATIONS_REQUIRED = 6;
type Chain = "BTC" | "ETH";
type StatusRecord = Record<string, unknown>;

function isRecord(value: unknown): value is StatusRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonRpcResponse(value: unknown, id: number): value is StatusRecord {
  return isRecord(value) && value.jsonrpc === "2.0" && value.id === id
    && !("error" in value) && "result" in value;
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

async function incrementLimit(key: string, windowEnd: number, limit: number): Promise<boolean> {
  const record = await TradeQuoteRateLimit.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd + 120_000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return Boolean(record && record.count <= limit);
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

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(6_000) });
  if (response.status === 404) return { status: 404, body: null };
  if (!response.ok) throw new Error("STATUS_PROVIDER_UNAVAILABLE");
  return { status: response.status, body: await readBoundedTradingJson(response) };
}

async function readBitcoinConfirmation(txid: string): Promise<"confirmed" | "pending" | "failed"> {
  const result = await fetchJson(`${MEMPOOL}${txid}`);
  if (result.status === 404) return "pending";
  if (!isRecord(result.body) || typeof result.body.txid !== "string"
    || result.body.txid.toLowerCase() !== txid.toLowerCase()
    || !isRecord(result.body.status)) throw new Error("STATUS_PROVIDER_INVALID");
  if (result.body.status.confirmed !== true) return "pending";
  const height = result.body.status.block_height;
  if (!Number.isSafeInteger(height) || typeof height !== "number" || height < 0) throw new Error("STATUS_PROVIDER_INVALID");
  const tipResponse = await fetch(MEMPOOL_TIP, { cache: "no-store", signal: AbortSignal.timeout(6_000) });
  if (!tipResponse.ok) throw new Error("STATUS_PROVIDER_UNAVAILABLE");
  const tipText = await (await readBoundedTradingResponse(tipResponse)).text();
  if (!/^\d{1,12}$/.test(tipText)) throw new Error("STATUS_PROVIDER_INVALID");
  const tip = Number(tipText);
  if (!Number.isSafeInteger(tip) || tip < height) throw new Error("STATUS_PROVIDER_INVALID");
  return tip - height + 1 >= BITCOIN_CONFIRMATIONS_REQUIRED ? "confirmed" : "pending";
}

async function readEthereumConfirmation(txid: string): Promise<"confirmed" | "pending" | "failed"> {
  const [chainResult, receiptResult, finalizedBlockResult] = await Promise.all([
    fetchJson(ETHEREUM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "eth_chainId", params: [] }),
    }),
    fetchJson(ETHEREUM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [`0x${txid.replace(/^0x/i, "")}`] }),
    }),
    fetchJson(ETHEREUM_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getBlockByNumber", params: ["finalized", false] }),
    }),
  ]);
  if (!isJsonRpcResponse(chainResult.body, 0) || chainResult.body.result !== "0x1"
    || !isJsonRpcResponse(receiptResult.body, 1)
    || !isJsonRpcResponse(finalizedBlockResult.body, 2)) throw new Error("STATUS_PROVIDER_INVALID");
  if (receiptResult.body.result === null) return "pending";
  if (finalizedBlockResult.body.result === null) return "pending";
  if (!isRecord(receiptResult.body.result) || !isRecord(finalizedBlockResult.body.result)) throw new Error("STATUS_PROVIDER_INVALID");
  const receipt = receiptResult.body.result;
  const finalized = finalizedBlockResult.body.result;
  if (typeof receipt.transactionHash !== "string"
    || receipt.transactionHash.toLowerCase() !== `0x${txid.replace(/^0x/i, "").toLowerCase()}`
    || typeof receipt.status !== "string" || !/^0x(?:0|1)$/i.test(receipt.status)
    || typeof receipt.blockNumber !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(receipt.blockNumber)
    || typeof finalized.number !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(finalized.number)) {
    throw new Error("STATUS_PROVIDER_INVALID");
  }
  if (BigInt(receipt.blockNumber) > BigInt(finalized.number)) return "pending";
  return receipt.status.toLowerCase() === "0x0" ? "failed" : "confirmed";
}

async function readChainConfirmation(chain: Chain, txid: string) {
  return chain === "BTC" ? readBitcoinConfirmation(txid) : readEthereumConfirmation(txid);
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
  if (!isRecord(body) || (body.chain !== "BTC" && body.chain !== "ETH") || typeof body.txHash !== "string") {
    return NextResponse.json({ error: "Invalid transaction reference" }, { status: 400 });
  }
  const chain: Chain = body.chain;
  const rawHash = body.txHash.trim();
  const txHash = rawHash.replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(txHash)) return NextResponse.json({ error: "Enter a valid transaction hash" }, { status: 400 });

  try {
    await connectToDatabase();
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60_000);
    const [userAllowed, appAllowed] = await Promise.all([
      incrementLimit(`status:${userId}:minute:${minuteWindow}`, (minuteWindow + 1) * 60_000, 6),
      incrementLimit(`status:app:minute:${minuteWindow}`, (minuteWindow + 1) * 60_000, 60),
    ]);
    if (!userAllowed || !appAllowed) return NextResponse.json({ error: "Status refresh limit reached. Try again in a minute." }, { status: 429 });

    const [sourceStatus, thorResult] = await Promise.all([
      readChainConfirmation(chain, txHash),
      fetchJson(`${THORNODE}${txHash.toUpperCase()}`),
    ]);
    if (sourceStatus === "failed") {
      return NextResponse.json({ status: { stage: "source_failed", sourceStatus, observed: false, outboundTransactions: [] } }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }

    const thor = isRecord(thorResult.body) ? thorResult.body : null;
    const stages = thor && isRecord(thor.stages) ? thor.stages : null;
    const observed = Boolean(stages && isRecord(stages.inbound_observed) && stages.inbound_observed.completed === true);
    const inboundConfirmed = Boolean(stages && isRecord(stages.inbound_confirmation_counted) && stages.inbound_confirmation_counted.completed === true);
    const swapFinalised = Boolean(stages && isRecord(stages.swap_finalised) && stages.swap_finalised.completed === true);
    const swapPending = Boolean(stages && isRecord(stages.swap_status) && stages.swap_status.pending === true);
    const targetChain: Chain = chain === "BTC" ? "ETH" : "BTC";
    const hasOutboundsArray = Boolean(thor && Array.isArray(thor.out_txs));
    const rawOutbounds = hasOutboundsArray && thor && Array.isArray(thor.out_txs) ? thor.out_txs : [];
    let outboundDataValid = !thor || hasOutboundsArray || !swapFinalised;
    if (thor) {
      const inbound = isRecord(thor.tx) && typeof thor.tx.id === "string"
        ? thor.tx.id.replace(/^0x/i, "")
        : "";
      if (!/^[0-9a-fA-F]{64}$/.test(inbound) || inbound.toLowerCase() !== txHash.toLowerCase()) {
        outboundDataValid = false;
      }
    }
    if (rawOutbounds.length > 6) outboundDataValid = false;
    const allOutbounds = rawOutbounds.flatMap((item) => {
      if (!isRecord(item) || item.chain !== targetChain || typeof item.id !== "string") {
        outboundDataValid = false;
        return [];
      }
      const id = item.id.replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]{64}$/.test(id) || /^0+$/.test(id)) {
        outboundDataValid = false;
        return [];
      }
      return [{ txHash: id, chain: targetChain, refund: typeof item.memo === "string" && item.memo.startsWith("REFUND:") }];
    });
    const outboundTransactions = outboundDataValid ? await Promise.all(allOutbounds.slice(0, 6).map(async (outbound) => ({
      ...outbound,
      status: await readChainConfirmation(targetChain, outbound.txHash),
    }))) : [];
    const complete = sourceStatus === "confirmed" && observed && inboundConfirmed
      && outboundDataValid && swapFinalised && allOutbounds.length > 0 && allOutbounds.length <= 6
      && outboundTransactions.length === allOutbounds.length
      && outboundTransactions.every((outbound) => outbound.status === "confirmed");
    const refunded = outboundTransactions.length > 0 && outboundTransactions.every((outbound) => outbound.refund && outbound.status === "confirmed");
    const outboundFailed = outboundTransactions.some((outbound) => outbound.status === "failed");

    let stage: string;
    if (!outboundDataValid) stage = "status_unavailable";
    else if (complete && refunded) stage = "refunded";
    else if (complete) stage = "complete";
    else if (outboundFailed) stage = "outbound_failed";
    else if (sourceStatus !== "confirmed") stage = "source_pending";
    else if (!thor) stage = thorResult.status === 404 ? "awaiting_observation" : "status_unavailable";
    else if (!observed) stage = "awaiting_observation";
    else if (!inboundConfirmed) stage = "confirming_inbound";
    else if (swapPending || !swapFinalised) stage = "processing_swap";
    else if (outboundTransactions.length === 0) stage = "awaiting_outbound";
    else stage = "outbound_pending";

    return NextResponse.json({
      status: { stage, sourceStatus, observed, inboundConfirmed, swapFinalised, outboundTransactions },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trade status lookup failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Transaction status is temporarily unavailable. Try again later." }, { status: 502 });
  }
}
