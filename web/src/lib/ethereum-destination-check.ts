import "server-only";
import { readBoundedTradingJson } from "@/lib/trading-http";

const ETHEREUM_RPC = "https://ethereum-rpc.publicnode.com";

type JsonRecord = Record<string, unknown>;
export type EthereumDestinationCheck = "externally-owned" | "has-code" | "unavailable";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function checkEthereumDestination(address: string): Promise<EthereumDestinationCheck> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return "has-code";
  try {
    const [chainResponse, codeResponse] = await Promise.all([
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 11, method: "eth_chainId", params: [] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(ETHEREUM_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 12, method: "eth_getCode", params: [address, "latest"] }),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
    ]);
    if (!chainResponse.ok || !codeResponse.ok) return "unavailable";
    const [chainValue, codeValue] = await Promise.all([
      readBoundedTradingJson(chainResponse),
      readBoundedTradingJson(codeResponse),
    ]);
    if (!isRecord(chainValue) || chainValue.jsonrpc !== "2.0" || chainValue.id !== 11
      || "error" in chainValue || chainValue.result !== "0x1"
      || !isRecord(codeValue) || codeValue.jsonrpc !== "2.0" || codeValue.id !== 12
      || "error" in codeValue || typeof codeValue.result !== "string"
      || !/^0x(?:[a-fA-F0-9]{2})*$/.test(codeValue.result)) return "unavailable";
    return codeValue.result.toLowerCase() === "0x" ? "externally-owned" : "has-code";
  } catch {
    return "unavailable";
  }
}
