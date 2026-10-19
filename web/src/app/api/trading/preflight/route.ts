import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { keccak256, type Hex } from "viem";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isCurrentAdmin } from "@/lib/admin-auth";
import { isValidBitcoinMainnetAddress } from "@/lib/bitcoin-address";
import connectToDatabase from "@/lib/mongoose";
import { readBoundedTradingJson } from "@/lib/trading-http";
import TradeQuoteRateLimit from "@/models/TradeQuoteRateLimit";

export const dynamic = "force-dynamic";

const BASE_UNITS = BigInt(100_000_000);
const THORNODE_INBOUND_ENDPOINT = "https://thornode.ninerealms.com/thorchain/inbound_addresses";
const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validCap(value: string | undefined, symbol: "BTC" | "ETH"): boolean {
  if (!value || value.length > 20) return false;
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,8}))?$/.exec(value);
  if (!match) return false;
  const units = BigInt(match[1]) * BASE_UNITS + BigInt((match[2] || "").padEnd(8, "0") || "0");
  const max = symbol === "BTC" ? BigInt(21_000_000) * BASE_UNITS : BigInt(1_000_000) * BASE_UNITS;
  return units > BigInt(0) && units <= max;
}

async function incrementLimit(key: string, windowEnd: number, limit: number): Promise<boolean> {
  const record = await TradeQuoteRateLimit.findOneAndUpdate(
    { _id: key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowEnd + 120_000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return Boolean(record && record.count <= limit);
}

async function fetchInboundRows(): Promise<unknown[] | null> {
  try {
    const response = await fetch(THORNODE_INBOUND_ENDPOINT, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) return null;
    const value = await readBoundedTradingJson(response);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function activeBitcoinInbound(rows: unknown[] | null): boolean {
  const row = rows?.find((item) => isRecord(item) && item.chain === "BTC");
  return Boolean(isRecord(row) && row.halted === false
    && row.global_trading_paused !== true && row.chain_trading_paused !== true
    && typeof row.address === "string" && isValidBitcoinMainnetAddress(row.address));
}

async function liveEthereumRouterMatches(address: string, expectedCodeHash: string, inboundRows: unknown[] | null): Promise<{
  inboundMatches: boolean;
  mainnetRpc: boolean;
  codeHashMatches: boolean;
}> {
  try {
    const [chainResponse, codeResponse] = await Promise.all([
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      }),
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_getCode", params: [address, "latest"] }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      }),
    ]);
    if (!chainResponse.ok || !codeResponse.ok) {
      return { inboundMatches: false, mainnetRpc: false, codeHashMatches: false };
    }
    const [chainValue, codeValue] = await Promise.all([
      readBoundedTradingJson(chainResponse),
      readBoundedTradingJson(codeResponse),
    ]);
    const inboundRow = inboundRows?.find((item) => isRecord(item) && item.chain === "ETH");
    const inboundMatches = Boolean(isRecord(inboundRow) && inboundRow.halted === false
      && inboundRow.global_trading_paused !== true && inboundRow.chain_trading_paused !== true
      && typeof inboundRow.router === "string" && /^0x[a-fA-F0-9]{40}$/.test(inboundRow.router)
      && inboundRow.router.toLowerCase() === address.toLowerCase());
    const mainnetRpc = isRecord(chainValue) && chainValue.jsonrpc === "2.0" && chainValue.id === 1
      && !("error" in chainValue) && chainValue.result === "0x1";
    const code = isRecord(codeValue) && codeValue.jsonrpc === "2.0" && codeValue.id === 2
      && !("error" in codeValue) && typeof codeValue.result === "string"
      && /^0x(?:[a-fA-F0-9]{2})+$/.test(codeValue.result)
      ? codeValue.result
      : null;
    const codeHashMatches = Boolean(code && keccak256(code as Hex).toLowerCase() === expectedCodeHash.toLowerCase());
    return { inboundMatches, mainnetRpc, codeHashMatches };
  } catch {
    return { inboundMatches: false, mainnetRpc: false, codeHashMatches: false };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!await isCurrentAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await connectToDatabase();
    const now = Date.now();
    const minute = Math.floor(now / 60_000);
    const [userAllowed, appAllowed] = await Promise.all([
      incrementLimit(`preflight:${session.user.id}:minute:${minute}`, (minute + 1) * 60_000, 6),
      incrementLimit(`preflight:app:minute:${minute}`, (minute + 1) * 60_000, 60),
    ]);
    if (!userAllowed || !appAllowed) {
      return NextResponse.json({ error: "Trading preflight limit reached. Try again in a minute." }, { status: 429 });
    }

    const inboundRows = await fetchInboundRows();
    const btcEnabled = process.env.FINTRACK_ENABLE_MAINNET_BTC_TRADES === "true";
    const ethEnabled = process.env.FINTRACK_ENABLE_MAINNET_ETH_TRADES === "true";
    const btcCapValid = validCap(process.env.FINTRACK_MAX_BTC_SWAP, "BTC");
    const ethCapValid = validCap(process.env.FINTRACK_MAX_ETH_SWAP, "ETH");
    const btcInboundAvailable = activeBitcoinInbound(inboundRows);
    const configuredRouter = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER?.trim() || "";
    const configuredCodeHash = process.env.FINTRACK_EXPECTED_THORCHAIN_ETH_ROUTER_CODE_HASH?.trim() || "";
    const routerConfigurationValid = /^0x[a-fA-F0-9]{40}$/.test(configuredRouter)
      && /^0x[a-fA-F0-9]{64}$/.test(configuredCodeHash);
    const ethLive = routerConfigurationValid
      ? await liveEthereumRouterMatches(configuredRouter, configuredCodeHash, inboundRows)
      : { inboundMatches: false, mainnetRpc: false, codeHashMatches: false };

    const btcReadyToEnable = btcCapValid && btcInboundAvailable;
    const ethReadyToEnable = ethCapValid && routerConfigurationValid
      && ethLive.inboundMatches && ethLive.mainnetRpc && ethLive.codeHashMatches;
    return NextResponse.json({
      checkedAt: now,
      btcToEth: {
        tradingEnabled: btcEnabled,
        capValid: btcCapValid,
        activeBitcoinInbound: btcInboundAvailable,
        readyToEnable: btcReadyToEnable,
        readyToTrade: btcEnabled && btcReadyToEnable,
      },
      ethToBtc: {
        tradingEnabled: ethEnabled,
        capValid: ethCapValid,
        routerConfigurationValid,
        liveRouterMatchesConfiguration: ethLive.inboundMatches,
        ethereumRpcOnMainnet: ethLive.mainnetRpc,
        deployedRouterCodeHashMatches: ethLive.codeHashMatches,
        readyToEnable: ethReadyToEnable,
        readyToTrade: ethEnabled && ethReadyToEnable,
      },
    }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Trading preflight failed:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Trading preflight is temporarily unavailable." }, { status: 503 });
  }
}
