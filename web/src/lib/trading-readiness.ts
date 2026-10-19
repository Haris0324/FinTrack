type Pair = "BTC_TO_ETH" | "ETH_TO_BTC";
type PreparedDeposit = { inboundAddress: string; router?: string; vault?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function assertTradeReadiness(pair: Pair, amount: string, deposit: PreparedDeposit, destination?: string): Promise<void> {
  const response = await fetch("/api/trading/readiness", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair, amount, deposit, ...(destination ? { destination } : {}) }),
    cache: "no-store",
  });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || result.enabled !== true) {
    const message = isRecord(result) && typeof result.error === "string" ? result.error : "Current trading settings could not be verified.";
    throw new Error(message);
  }
}
