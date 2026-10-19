"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import type { SwapTrackingRecord } from "@/types/trading";
import { readBoundedTradingJson } from "@/lib/trading-http";

type Outbound = { txHash: string; chain: "BTC" | "ETH"; refund: boolean; status: "confirmed" | "pending" | "failed" };
type SwapStatus = {
  stage: string;
  sourceStatus: "confirmed" | "pending" | "failed";
  observed: boolean;
  inboundConfirmed: boolean;
  swapFinalised: boolean;
  outboundTransactions: Outbound[];
};

const STAGE_LABELS: Record<string, string> = {
  source_pending: "Waiting for the source transaction to confirm",
  source_failed: "The source transaction failed",
  awaiting_observation: "Waiting for THORChain to observe the deposit",
  confirming_inbound: "THORChain is counting source-chain confirmations",
  processing_swap: "THORChain is processing the swap",
  awaiting_outbound: "Swap processed; waiting for the destination transaction",
  outbound_pending: "Destination transaction sent; waiting for confirmation",
  outbound_failed: "A destination transaction failed; check the chain status again later",
  complete: "Swap completed and destination transaction confirmed",
  refunded: "Swap was refunded and the refund transaction confirmed",
  status_unavailable: "THORChain status is temporarily unavailable",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function explorerUrl(chain: "BTC" | "ETH", txHash: string): string {
  return chain === "BTC" ? `https://mempool.space/tx/${txHash}` : `https://etherscan.io/tx/0x${txHash.replace(/^0x/i, "")}`;
}

export default function SwapStatusTracker({ items, onRemove, loading, syncMessage }: { items: SwapTrackingRecord[]; onRemove: (id: string) => void | Promise<void>; loading: boolean; syncMessage: string }) {
  const [statuses, setStatuses] = useState<Record<string, SwapStatus>>({});
  const [busyId, setBusyId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function refresh(item: SwapTrackingRecord) {
    setBusyId(item.id);
    setErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const response = await fetch("/api/trading/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: item.sourceChain, txHash: item.txHash }),
        cache: "no-store",
      });
      const data: unknown = await readBoundedTradingJson(response);
      if (!response.ok || !isRecord(data) || !isRecord(data.status)) {
        const message = isRecord(data) && typeof data.error === "string" ? data.error : "Could not read this transaction status.";
        throw new Error(message);
      }
      const status = data.status;
      if (typeof status.stage !== "string" || !Array.isArray(status.outboundTransactions)) throw new Error("The status service returned an incomplete result.");
      const stage = status.stage;
      const outboundTransactions = status.outboundTransactions.flatMap((outbound) => {
        if (!isRecord(outbound) || (outbound.chain !== "BTC" && outbound.chain !== "ETH")
          || typeof outbound.txHash !== "string" || (outbound.status !== "confirmed" && outbound.status !== "pending" && outbound.status !== "failed")) return [];
        return [{ txHash: outbound.txHash, chain: outbound.chain, refund: outbound.refund === true, status: outbound.status } as Outbound];
      });
      setStatuses((current) => ({
        ...current,
        [item.id]: {
          stage,
          sourceStatus: status.sourceStatus === "confirmed" || status.sourceStatus === "failed" ? status.sourceStatus : "pending",
          observed: status.observed === true,
          inboundConfirmed: status.inboundConfirmed === true,
          swapFinalised: status.swapFinalised === true,
          outboundTransactions,
        },
      }));
    } catch (error) {
      setErrors((current) => ({ ...current, [item.id]: error instanceof Error ? error.message : "Could not read this transaction status." }));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-card-border bg-card p-5 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Swap tracking</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Refresh a transaction to check source-chain confirmation, THORChain processing, and destination-chain confirmation. Only the public transaction hash is saved to your FinTrack account.</p>
      </div>
      {syncMessage && <p role="status" className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-foreground">{syncMessage}</p>}
      {loading ? (
        <p className="rounded-xl border border-dashed border-card-border p-5 text-sm text-muted">Loading your saved transaction references…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-card-border p-5 text-sm text-muted">Broadcast a trade to add it here. FinTrack stores no private keys, signed transactions, or receive addresses.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const status = statuses[item.id];
            const direction = item.direction === "BTC_TO_ETH" ? "Bitcoin → Ethereum" : "Ethereum → Bitcoin";
            return (
              <article key={item.id} className="space-y-3 rounded-xl border border-card-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{direction}</p>
                    <a href={explorerUrl(item.sourceChain, item.txHash)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all font-mono text-xs text-primary underline">
                      {item.txHash} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => void refresh(item)} disabled={busyId !== ""} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-card-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card disabled:opacity-60">
                      {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Refresh
                    </button>
                    <button type="button" aria-label="Remove tracking entry" title="Remove from your account history" onClick={() => void onRemove(item.id)} disabled={busyId === item.id} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-card-border px-3 text-muted hover:bg-card disabled:opacity-60">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {status && <p role="status" className="text-sm text-foreground">{STAGE_LABELS[status.stage] || "Status updated"}</p>}
                {!status && !errors[item.id] && <p className="text-xs text-muted">No status check yet. Select Refresh to look up the public chain data.</p>}
                {errors[item.id] && <p role="alert" className="text-xs leading-5 text-danger">{errors[item.id]}</p>}
                {status?.outboundTransactions.map((outbound) => (
                  <p key={`${outbound.chain}:${outbound.txHash}`} className="text-xs leading-5 text-muted">
                    {outbound.refund ? "Refund transaction" : "Destination transaction"}: {outbound.status === "confirmed" ? "confirmed" : outbound.status === "failed" ? "failed" : "pending"} · <a className="inline-flex items-center gap-1 text-primary underline" href={explorerUrl(outbound.chain, outbound.txHash)} target="_blank" rel="noopener noreferrer">View on {outbound.chain === "BTC" ? "mempool.space" : "Etherscan"} <ExternalLink className="h-3 w-3" /></a>
                  </p>
                ))}
              </article>
            );
          })}
        </div>
      )}
      <p className="text-xs leading-5 text-muted">THORChain stages can take minutes or hours. A source transaction confirmation alone does not mean the swap is complete. Refreshing queries public blockchain services; no keys or signed transactions are sent.</p>
    </section>
  );
}
