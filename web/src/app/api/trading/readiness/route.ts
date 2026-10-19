import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import TradeQuoteRateLimit from "@/models/TradeQuoteRateLimit";
import { keccak256, type Hex } from "viem";
import { readBoundedTradingJson } from "@/lib/trading-http";
import { checkEthereumDestination } from "@/lib/ethereum-destination-check";

export const dynamic = "force-dynamic";

type Pair = "BTC_TO_ETH" | "ETH_TO_BTC";
type JsonRecord = Record<string, unknown>;
const BASE_UNITS = BigInt(100_000_000);
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";
const THORNODE_INBOUND_ENDPOINT = "https://thornode.ninerealms.com/thorchain/inbound_addresses";

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

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1_024) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function parseAmount(value: unknown, symbol: "BTC" | "ETH"): string | null {
  if (typeof value !== "string" || value.length > 20) return null;
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,8}))?$/.exec(value);
  if (!match) return null;
  const amount = BigInt(match[1]) * BASE_UNITS + BigInt((match[2] || "").padEnd(8, "0") || "0");
  const absoluteMax = symbol === "BTC" ? BigInt(21_000_000) * BASE_UNITS : BigInt(1_000_000) * BASE_UNITS;
  return amount > BigInt(0) && amount <= absoluteMax ? amount.toString() : null;
}

async function incrementLimit(key: string, windowEnd: number, limit: number): Promise<boolean> {
  const counter = await TradeQuoteRateLimit.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd + 120_000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return Boolean(counter && counter.count <= limit);
}

function disabled(message: string, status = 200) {
  return NextResponse.json({ enabled: false, error: message }, { status, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

async function approvedRouterIsLive(address: string, expectedCodeHash: string): Promise<boolean> {
  try {
    const [chainResponse, codeResponse] = await Promise.all([
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getCode", params: [address, "latest"] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
    ]);
    if (!chainResponse.ok || !codeResponse.ok) return false;
    const [chainValue, codeValue]: unknown[] = await Promise.all([
      readBoundedTradingJson(chainResponse),
      readBoundedTradingJson(codeResponse),
    ]);
    if (!isRecord(chainValue) || chainValue.error || chainValue.result !== "0x1"
      || !isRecord(codeValue) || codeValue.error || typeof codeValue.result !== "string"
      || !/^0x(?:[a-fA-F0-9]{2})+$/.test(codeValue.result)) return false;
    return keccak256(codeValue.result as Hex).toLowerCase() === expectedCodeHash.toLowerCase();
  } catch {
    return false;
  }
}

async function currentInboundMatches(pair: Pair, deposit: JsonRecord): Promise<boolean> {
  try {
    const response = await fetch(THORNODE_INBOUND_ENDPOINT, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return false;
    const inbound: unknown = await readBoundedTradingJson(response);
    if (!Array.isArray(inbound)) return false;
    const chain = pair === "BTC_TO_ETH" ? "BTC" : "ETH";
    const row = inbound.find((item) => isRecord(item) && item.chain === chain);
    if (!isRecord(row) || row.halted !== false
      || row.global_trading_paused === true || row.chain_trading_paused === true
      || typeof row.address !== "string") return false;
    const preparedAddress = deposit.inboundAddress;
    if (chain === "BTC") {
      if (typeof preparedAddress !== "string" || row.address.length < 26 || row.address.length > 90) return false;
      const current = row.address.toLowerCase().startsWith("bc1") ? row.address.toLowerCase() : row.address;
      return current === preparedAddress;
    }
    if (typeof preparedAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(preparedAddress)
      || !/^0x[a-fA-F0-9]{40}$/.test(row.address)
      || typeof deposit.router !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(deposit.router)
      || typeof row.router !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(row.router)
      || typeof deposit.vault !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(deposit.vault)) return false;
    return row.address.toLowerCase() === preparedAddress.toLowerCase()
      && row.address.toLowerCase() === deposit.vault.toLowerCase()
      && row.router.toLowerCase() === deposit.router.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return disabled("Untrusted request origin.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return disabled("Expected a JSON request.", 415);
  }
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return disabled("Sign in before trading.", 401);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch {
    return disabled("Invalid or oversized request.", 400);
  }
  if (!isRecord(body) || (body.pair !== "BTC_TO_ETH" && body.pair !== "ETH_TO_BTC")) {
    return disabled("Invalid trade direction.", 400);
  }
  if (!isRecord(body.deposit)) return disabled("The prepared deposit details are missing. Prepare a fresh trade.", 400);
  const pair: Pair = body.pair;
  const symbol = pair === "BTC_TO_ETH" ? "BTC" : "ETH";
  const amount = parseAmount(body.amount, symbol);
  if (!amount) return disabled(`Enter a valid ${symbol} amount.`, 400);
  if (pair === "BTC_TO_ETH" && (typeof body.destination !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(body.destination))) {
    return disabled("A valid Ethereum receive address is required. Prepare a fresh trade.", 400);
  }

  const router = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER;
  const routerCodeHash = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER_CODE_HASH;
  const ethRouterIsConfigured = typeof router === "string"
    && /^0x[a-fA-F0-9]{40}$/.test(router)
    && typeof routerCodeHash === "string"
    && /^0x[a-fA-F0-9]{64}$/.test(routerCodeHash);
  const enabled = pair === "BTC_TO_ETH"
    ? process.env.FINTRACK_ENABLE_MAINNET_BTC_TRADES === "true"
    : process.env.FINTRACK_ENABLE_MAINNET_ETH_TRADES === "true" && ethRouterIsConfigured;
  if (!enabled) return disabled(`${symbol}-to-${pair === "BTC_TO_ETH" ? "ETH" : "BTC"} mainnet trading is disabled by the operator.`);

  if (pair === "ETH_TO_BTC") {
    if (typeof body.deposit.router !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(body.deposit.router)
      || body.deposit.router.toLowerCase() !== router!.toLowerCase()) {
      return disabled("The prepared Ethereum router no longer matches the operator-approved router. Prepare a fresh trade.");
    }
  }

  const capName = symbol === "BTC" ? "FINTRACK_MAX_BTC_SWAP" : "FINTRACK_MAX_ETH_SWAP";
  const capText = process.env[capName];
  if (capText === undefined) return disabled(`Trading is temporarily unavailable because ${symbol} mainnet trading requires a configured maximum trade amount.`, 503);
  const cap = parseAmount(capText, symbol);
  if (!cap) return disabled("Trading is temporarily unavailable because the configured maximum trade limit is invalid.", 503);
  if (BigInt(amount) > BigInt(cap)) return disabled(`The maximum ${symbol} trade amount is ${capText}.`, 400);

  try {
    await connectToDatabase();
    const minute = Math.floor(Date.now() / 60_000);
    const [userAllowed, appAllowed] = await Promise.all([
      incrementLimit(`readiness:${userId}:minute:${minute}`, (minute + 1) * 60_000, 12),
      incrementLimit(`readiness:app:minute:${minute}`, (minute + 1) * 60_000, 240),
    ]);
    if (!userAllowed || !appAllowed) return disabled("Trade recheck limit reached. Try again shortly.", 429);
    if (!await currentInboundMatches(pair, body.deposit)) {
      return disabled("The prepared deposit address or router is no longer active on THORChain. Refresh the quote before continuing.", 503);
    }
    if (pair === "BTC_TO_ETH") {
      const destinationCheck = await checkEthereumDestination(body.destination as string);
      if (destinationCheck === "has-code") {
        return disabled("The Ethereum receive address has contract code. THORChain ETH payouts require an externally owned address. Change the destination and prepare a fresh trade.", 400);
      }
      if (destinationCheck === "unavailable") {
        return disabled("Could not verify that the Ethereum receive address is a regular externally owned account. No wallet action was requested.", 503);
      }
    }
    if (pair === "ETH_TO_BTC" && !await approvedRouterIsLive(router!, routerCodeHash!)) {
      return disabled("Could not verify the approved Ethereum router code on mainnet. No wallet transaction was requested.", 503);
    }
    return NextResponse.json({ enabled: true }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trade readiness check failed:", error instanceof Error ? error.message : "unknown error");
    return disabled("Could not verify current trading settings. No transaction was requested.", 503);
  }
}
