import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongoose";
import TradeQuoteRateLimit from "@/models/TradeQuoteRateLimit";
import { keccak256, type Hex } from "viem";
import { readBoundedTradingJson } from "@/lib/trading-http";
import { checkEthereumDestination } from "@/lib/ethereum-destination-check";
import { isValidBitcoinMainnetAddress } from "@/lib/bitcoin-address";
import { normalizeBitcoinMainnetAddress } from "@/lib/bitcoin-address-normalize";

export const dynamic = "force-dynamic";

const THORNODE_INBOUND_ENDPOINT = "https://thornode.ninerealms.com/thorchain/inbound_addresses";
const THORNODE_QUOTE_ENDPOINT = "https://thornode.ninerealms.com/thorchain/quote/swap";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";
const BASE_UNITS = BigInt(100_000_000);
const ASSET_PAIRS = {
  ETH_TO_BTC: { from: "ETH.ETH", to: "BTC.BTC", fromSymbol: "ETH", toSymbol: "BTC" },
  BTC_TO_ETH: { from: "BTC.BTC", to: "ETH.ETH", fromSymbol: "BTC", toSymbol: "ETH" },
} as const;

type AssetPair = keyof typeof ASSET_PAIRS;
type JsonRecord = Record<string, unknown>;

type EthereumInbound = { vault: string; router: string; routerAllowlisted: boolean; expectedRouterCodeHash: string | null };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function routerCodeHashMatches(address: string, expectedHash: string): Promise<boolean> {
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
    if (!isRecord(chainValue) || chainValue.jsonrpc !== "2.0" || chainValue.id !== 1
      || "error" in chainValue || chainValue.result !== "0x1"
      || !isRecord(codeValue) || codeValue.jsonrpc !== "2.0" || codeValue.id !== 2
      || "error" in codeValue || typeof codeValue.result !== "string"
      || !/^0x(?:[a-fA-F0-9]{2})+$/.test(codeValue.result)) return false;
    return keccak256(codeValue.result as Hex).toLowerCase() === expectedHash.toLowerCase();
  } catch {
    return false;
  }
}

function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const trustedOrigins = new Set<string>();
    if (process.env.NEXTAUTH_URL) trustedOrigins.add(new URL(process.env.NEXTAUTH_URL).origin);
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
      if (host) trustedOrigins.add(`https://${host.replace(/^https?:\/\//, "")}`);
    }
    if (process.env.NODE_ENV === "development") {
      trustedOrigins.add("http://localhost:3000");
      trustedOrigins.add("http://127.0.0.1:3000");
    }
    return trustedOrigins.has(originUrl.origin);
  } catch {
    return false;
  }
}

function parseAmountToBaseUnits(value: unknown, symbol: string): string | null {
  if (typeof value !== "string" || value.length > 20) return null;
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,8}))?$/.exec(value);
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] || "").padEnd(8, "0") || "0");
  const amount = whole * BASE_UNITS + fraction;
  const max = symbol === "BTC" ? BigInt(21_000_000) * BASE_UNITS : BigInt(1_000_000) * BASE_UNITS;
  if (amount <= BigInt(0) || amount > max) return null;
  return amount.toString();
}

function configuredTradeMaximum(symbol: "BTC" | "ETH"): { display: string; baseUnits: string } | null {
  const key = symbol === "BTC" ? "FINTRACK_MAX_BTC_SWAP" : "FINTRACK_MAX_ETH_SWAP";
  const configured = process.env[key];
  if (configured === undefined) return null;
  const baseUnits = parseAmountToBaseUnits(configured, symbol);
  if (!baseUnits) throw new Error("TRADE_LIMIT_CONFIG_INVALID");
  return { display: configured, baseUnits };
}

function isValidDestination(address: unknown, symbol: string): address is string {
  if (typeof address !== "string" || address.length > 100) return false;
  const value = address.trim();
  if (symbol === "BTC") {
    return isValidBitcoinMainnetAddress(value);
  }
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeDestination(address: string, symbol: string): string {
  return symbol === "BTC" ? normalizeBitcoinMainnetAddress(address) : address.trim();
}

function quoteMemoMatchesDestination(memo: unknown, asset: string, destination: string, symbol: string, maxLength: number): memo is string {
  if (typeof memo !== "string" || memo.length > maxLength || !/^[\x20-\x7e]+$/.test(memo)) return false;
  const parts = memo.split(":");
  if (parts.length < 3 || !["=", "=<", "SWAP", "s", "S"].includes(parts[0]) || parts[1] !== asset) return false;
  const memoDestination = parts[2].split("/")[0];
  if (!memoDestination || !isValidDestination(memoDestination, symbol)) return false;
  const normalizedMemoDestination = normalizeDestination(memoDestination, symbol);
  const normalizedRequestedDestination = normalizeDestination(destination, symbol);
  return symbol === "ETH"
    ? normalizedMemoDestination.toLowerCase() === normalizedRequestedDestination.toLowerCase()
    : normalizedMemoDestination === normalizedRequestedDestination;
}

function parseMemoMinimum(memo: string): string | null {
  const limit = memo.split(":")[3]?.split("/")[0] || "";
  if (/^\d{1,32}$/.test(limit)) return BigInt(limit) > BigInt(0) ? limit : null;
  const scientific = /^(\d+)(?:\.(\d+))?[eE]([+-]?\d{1,2})$/.exec(limit);
  if (!scientific) return null;
  const digits = `${scientific[1]}${scientific[2] || ""}`;
  const shift = Number(scientific[3]) - (scientific[2]?.length || 0);
  if (shift >= 0) {
    if (digits.length + shift > 32) return null;
    const parsed = `${digits}${"0".repeat(shift)}`;
    return BigInt(parsed) > BigInt(0) ? parsed : null;
  }
  const remove = -shift;
  if (remove >= digits.length || !digits.endsWith("0".repeat(remove))) return null;
  const parsed = digits.slice(0, -remove);
  return BigInt(parsed) > BigInt(0) ? parsed : null;
}

async function readBoundedJson(request: Request, maxBytes: number): Promise<unknown> {
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
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
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function incrementLimit(key: string, windowEnd: number, limit: number): Promise<boolean> {
  const counter = await TradeQuoteRateLimit.findOneAndUpdate(
    { _id: key },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(windowEnd + 120_000) },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return Boolean(counter && counter.count <= limit);
}

async function callThorchainQuote(fromAsset: string, toAsset: string, amount: string, destination: string, slippageBps: number): Promise<unknown> {
  const url = new URL(THORNODE_QUOTE_ENDPOINT);
  url.searchParams.set("from_asset", fromAsset);
  url.searchParams.set("to_asset", toAsset);
  url.searchParams.set("amount", amount);
  url.searchParams.set("destination", destination);
  url.searchParams.set("streaming_interval", "1");
  url.searchParams.set("streaming_quantity", "0");
  url.searchParams.set("liquidity_tolerance_bps", String(slippageBps));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(response.status === 429 || response.status >= 500 ? "QUOTE_PROVIDER_UNAVAILABLE" : "QUOTE_PROVIDER_REJECTED");
  const quote: unknown = await readBoundedTradingJson(response);
  if (!isRecord(quote) || quote.error || quote.code) throw new Error("QUOTE_PROVIDER_REJECTED");
  return quote;
}

async function getEthereumInbound(): Promise<EthereumInbound> {
  const response = await fetch(THORNODE_INBOUND_ENDPOINT, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("INBOUND_PROVIDER_UNAVAILABLE");
  const inbound: unknown = await readBoundedTradingJson(response);
  if (!Array.isArray(inbound)) throw new Error("INBOUND_PROVIDER_REJECTED");
  const row = inbound.find((item) => isRecord(item) && item.chain === "ETH");
  if (!isRecord(row)
    || row.halted !== false
    || row.global_trading_paused === true
    || row.chain_trading_paused === true
    || typeof row.address !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(row.address)
    || typeof row.router !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(row.router)) {
    throw new Error("INBOUND_PROVIDER_REJECTED");
  }
  const expectedRouter = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER?.trim();
  const expectedCodeHash = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER_CODE_HASH?.trim();
  const routerAddressMatches = Boolean(expectedRouter
    && /^0x[a-fA-F0-9]{40}$/.test(expectedRouter)
    && expectedRouter.toLowerCase() === row.router.toLowerCase());
  const normalizedExpectedCodeHash = expectedCodeHash && /^0x[a-fA-F0-9]{64}$/.test(expectedCodeHash)
    ? expectedCodeHash.toLowerCase()
    : null;
  const routerAllowlisted = Boolean(routerAddressMatches
    && normalizedExpectedCodeHash
    && await routerCodeHashMatches(row.router, normalizedExpectedCodeHash));
  return { vault: row.address, router: row.router, routerAllowlisted, expectedRouterCodeHash: normalizedExpectedCodeHash };
}

async function getBitcoinInbound(): Promise<string> {
  const response = await fetch(THORNODE_INBOUND_ENDPOINT, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("INBOUND_PROVIDER_UNAVAILABLE");
  const inbound: unknown = await readBoundedTradingJson(response);
  if (!Array.isArray(inbound)) throw new Error("INBOUND_PROVIDER_REJECTED");
  const row = inbound.find((item) => isRecord(item) && item.chain === "BTC");
  if (!isRecord(row)
    || row.halted !== false
    || row.global_trading_paused === true
    || row.chain_trading_paused === true
    || typeof row.address !== "string"
    || !isValidDestination(row.address, "BTC")) {
    throw new Error("INBOUND_PROVIDER_REJECTED");
  }
  return normalizeDestination(row.address, "BTC");
}

function digits(value: unknown): string | null {
  const text = typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
  return /^\d{1,32}$/.test(text) ? text : null;
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Untrusted request origin" }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 2_048) return NextResponse.json({ error: "Request is too large" }, { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, 2_048);
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON request" }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.pair !== "string" || !Object.prototype.hasOwnProperty.call(ASSET_PAIRS, body.pair)) {
    return NextResponse.json({ error: "Unsupported trading pair" }, { status: 400 });
  }
  const pairName = body.pair as AssetPair;
  const pair = ASSET_PAIRS[pairName];
  const amount = parseAmountToBaseUnits(body.amount, pair.fromSymbol);
  if (!amount) return NextResponse.json({ error: "Enter a valid amount with up to 8 decimal places" }, { status: 400 });
  let tradeMaximum: { display: string; baseUnits: string } | null;
  try {
    tradeMaximum = configuredTradeMaximum(pair.fromSymbol);
  } catch {
    return NextResponse.json({ error: "Trading is temporarily unavailable because the server's maximum trade limit is invalid." }, { status: 503 });
  }
  const mainnetTradingEnabled = pairName === "BTC_TO_ETH"
    ? process.env.FINTRACK_ENABLE_MAINNET_BTC_TRADES === "true"
    : process.env.FINTRACK_ENABLE_MAINNET_ETH_TRADES === "true";
  if (mainnetTradingEnabled && !tradeMaximum) {
    return NextResponse.json({ error: `Trading is temporarily unavailable because ${pair.fromSymbol} mainnet trading requires a configured maximum trade amount.` }, { status: 503 });
  }
  if (tradeMaximum && BigInt(amount) > BigInt(tradeMaximum.baseUnits)) {
    return NextResponse.json({ error: `The maximum ${pair.fromSymbol} trade amount is ${tradeMaximum.display}.` }, { status: 400 });
  }
  if (!Number.isInteger(body.slippageBps) || (body.slippageBps as number) < 50 || (body.slippageBps as number) > 1_000) {
    return NextResponse.json({ error: "Choose a slippage limit between 0.50% and 10.00%" }, { status: 400 });
  }

  if (!isValidDestination(body.destination, pair.toSymbol)) {
    return NextResponse.json({ error: `Enter a valid ${pair.toSymbol} mainnet destination address` }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60_000);
    const tenMinuteWindow = Math.floor(now / 600_000);
    const minuteEnd = (minuteWindow + 1) * 60_000;
    const tenMinuteEnd = (tenMinuteWindow + 1) * 600_000;

    const [userAllowed, appAllowed] = await Promise.all([
      incrementLimit(`user:${userId}:minute:${minuteWindow}`, minuteEnd, 4),
      incrementLimit(`app:ten-minute:${tenMinuteWindow}`, tenMinuteEnd, 45),
    ]);
    if (!userAllowed || !appAllowed) {
      return NextResponse.json({ error: "Quote limit reached. Wait a little before requesting another quote." }, { status: 429 });
    }

    const requestedDestination = normalizeDestination(body.destination, pair.toSymbol);
    if (pairName === "BTC_TO_ETH") {
      const destinationCheck = await checkEthereumDestination(requestedDestination);
      if (destinationCheck === "has-code") throw new Error("ETH_DESTINATION_NOT_EXTERNALLY_OWNED");
      if (destinationCheck === "unavailable") throw new Error("ETH_DESTINATION_CHECK_UNAVAILABLE");
    }
    const quoteValue: unknown = await callThorchainQuote(pair.from, pair.to, amount, requestedDestination, body.slippageBps as number);
    const quote = isRecord(quoteValue) ? quoteValue : null;
    const expectedAmountOut = quote ? digits(quote.expected_amount_out) : null;
    const recommendedMinimumAmountIn = quote ? digits(quote.recommended_min_amount_in) : null;
    const minimumAmountOut = quote && typeof quote.memo === "string" ? parseMemoMinimum(quote.memo) : null;
    if (!quote || !expectedAmountOut || !recommendedMinimumAmountIn || !minimumAmountOut
      || BigInt(expectedAmountOut) <= BigInt(0)
      || BigInt(recommendedMinimumAmountIn) <= BigInt(0)
      || BigInt(minimumAmountOut) <= BigInt(0)
      || BigInt(minimumAmountOut) > BigInt(expectedAmountOut)) throw new Error("QUOTE_PROVIDER_REJECTED");
    if (BigInt(amount) < BigInt(recommendedMinimumAmountIn)) throw new Error("QUOTE_AMOUNT_BELOW_RECOMMENDED_MINIMUM");

    const fees = isRecord(quote.fees) ? quote.fees : {};
    const quoteExpiry = typeof quote.expiry === "number" && Number.isFinite(quote.expiry) && quote.expiry > 0 && quote.expiry < 4_102_444_800
      ? new Date(quote.expiry * 1000)
      : null;
    const expiresAt = quoteExpiry ? quoteExpiry.toISOString() : null;

    let bitcoinDeposit: { inboundAddress: string; memo: string; executionEnabled: boolean } | undefined;
    let ethereumDeposit: { vault: string; router: string; memo: string; executionEnabled: boolean; expectedRouterCodeHash: string | null } | undefined;
    if (pairName === "BTC_TO_ETH") {
      const inboundAddress = quote.inbound_address;
      const memo = quote.memo;
      const currentBitcoinVault = await getBitcoinInbound();
      if (!isValidDestination(inboundAddress, "BTC")
        || normalizeDestination(inboundAddress, "BTC") !== currentBitcoinVault
        || !quoteMemoMatchesDestination(memo, pair.to, requestedDestination, pair.toSymbol, 80)
        || !quoteExpiry || quoteExpiry.getTime() <= Date.now()) {
        throw new Error("QUOTE_PROVIDER_REJECTED");
      }
      bitcoinDeposit = {
        inboundAddress: normalizeDestination(inboundAddress, "BTC"),
        memo,
        executionEnabled: process.env.FINTRACK_ENABLE_MAINNET_BTC_TRADES === "true",
      };
    }
    if (pairName === "ETH_TO_BTC") {
      const inbound = await getEthereumInbound();
      const inboundAddress = quote.inbound_address;
      const memo = quote.memo;
      const providerAddressMatches = typeof inboundAddress === "string"
        && (inboundAddress.toLowerCase() === inbound.vault.toLowerCase() || inboundAddress.toLowerCase() === inbound.router.toLowerCase());
      if (!providerAddressMatches || !quoteMemoMatchesDestination(memo, pair.to, requestedDestination, pair.toSymbol, 250) || !quoteExpiry || quoteExpiry.getTime() <= Date.now()) {
        throw new Error("QUOTE_PROVIDER_REJECTED");
      }
      ethereumDeposit = {
        vault: inbound.vault,
        router: inbound.router,
        memo,
        executionEnabled: process.env.FINTRACK_ENABLE_MAINNET_ETH_TRADES === "true" && inbound.routerAllowlisted,
        expectedRouterCodeHash: inbound.expectedRouterCodeHash,
      };
    }

    return NextResponse.json({
      quote: {
        fromAsset: pair.from,
        toAsset: pair.to,
        amountIn: amount,
        amountOut: expectedAmountOut,
        minimumAmountOut,
        slippageLimitBps: body.slippageBps,
        feeAsset: typeof fees.asset === "string" ? fees.asset : pair.to,
        totalFee: digits(fees.total),
        slippageBps: typeof quote.streaming_slippage_bps === "number" && Number.isFinite(quote.streaming_slippage_bps) && quote.streaming_slippage_bps >= 0 && quote.streaming_slippage_bps <= 10_000
          ? quote.streaming_slippage_bps
          : typeof quote.slippage_bps === "number" && Number.isFinite(quote.slippage_bps) && quote.slippage_bps >= 0 && quote.slippage_bps <= 10_000
            ? quote.slippage_bps : null,
        estimatedSeconds: typeof quote.total_swap_seconds === "number" && Number.isFinite(quote.total_swap_seconds) && quote.total_swap_seconds >= 0 && quote.total_swap_seconds <= 31_536_000
          ? quote.total_swap_seconds : null,
        expiresAt,
        ...(bitcoinDeposit ? { bitcoinDeposit } : {}),
        ...(ethereumDeposit ? { ethereumDeposit } : {}),
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ETH_DESTINATION_NOT_EXTERNALLY_OWNED") {
      return NextResponse.json({ error: "THORChain requires an externally owned Ethereum address for ETH payouts. Smart-contract and delegated EIP-7702 addresses are not supported as swap destinations." }, { status: 422 });
    }
    if (message === "ETH_DESTINATION_CHECK_UNAVAILABLE") {
      return NextResponse.json({ error: "Could not verify that the Ethereum receive address is a regular externally owned account. Try again later." }, { status: 503 });
    }
    if (message === "QUOTE_AMOUNT_BELOW_RECOMMENDED_MINIMUM") {
      return NextResponse.json({ error: "This amount is below THORChain's current recommended minimum to cover swap and potential refund fees. Increase the amount and request a fresh quote." }, { status: 422 });
    }
    if (message === "QUOTE_PROVIDER_REJECTED") {
      return NextResponse.json({ error: "The provider could not quote this trade. Check the amount and try again." }, { status: 422 });
    }
    console.error("Bitcoin swap quote failed:", message || "unknown error");
    return NextResponse.json({ error: "Live quotes are temporarily unavailable. Please try again." }, { status: 502 });
  }
}
