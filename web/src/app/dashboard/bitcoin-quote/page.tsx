"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import BitcoinWalletConnection from "@/components/trading/BitcoinWalletConnection";
import BitcoinSwapExecution from "@/components/trading/BitcoinSwapExecution";
import EthereumWalletConnection from "@/components/trading/EthereumWalletConnection";
import EthereumSwapExecution from "@/components/trading/EthereumSwapExecution";
import SwapStatusTracker from "@/components/trading/SwapStatusTracker";
import type { SwapTrackingRecord } from "@/types/trading";
import { ArrowDown, ArrowLeftRight, Clock3, ExternalLink, Loader2, ShieldCheck } from "lucide-react";

type Pair = "ETH_TO_BTC" | "BTC_TO_ETH";
type Quote = {
  fromAsset: string;
  toAsset: string;
  amountIn: string;
  amountOut: string;
  minimumAmountOut: string;
  slippageLimitBps: number;
  feeAsset: string;
  totalFee: string | null;
  slippageBps: number | null;
  estimatedSeconds: number | null;
  expiresAt: string | null;
  bitcoinDeposit?: { executionEnabled?: boolean };
  ethereumDeposit?: { executionEnabled?: boolean };
};

const PAIRS: Record<Pair, { label: string; from: string; to: string; destination: string }> = {
  ETH_TO_BTC: { label: "Buy BTC with ETH", from: "ETH.ETH", to: "BTC.BTC", destination: "Bitcoin mainnet address (bc1…, 1…, or 3…)" },
  BTC_TO_ETH: { label: "Swap BTC for ETH", from: "BTC.BTC", to: "ETH.ETH", destination: "Ethereum address (0x…)" },
};

function readTrackingItems(value: unknown): SwapTrackingRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    if ((record.sourceChain !== "BTC" && record.sourceChain !== "ETH")
      || (record.direction !== "BTC_TO_ETH" && record.direction !== "ETH_TO_BTC")
      || typeof record.txHash !== "string"
      || !/^(?:0x)?[0-9a-fA-F]{64}$/.test(record.txHash)
      || !Number.isSafeInteger(record.createdAt)
      || typeof record.createdAt !== "number") return [];
    const sourceChain = record.sourceChain as "BTC" | "ETH";
    const direction = record.direction as SwapTrackingRecord["direction"];
    if ((sourceChain === "BTC") !== (direction === "BTC_TO_ETH")) return [];
    const txHash = sourceChain === "ETH" ? `0x${record.txHash.replace(/^0x/i, "").toLowerCase()}` : record.txHash.toLowerCase();
    return [{ id: `${sourceChain}:${txHash}`, direction, sourceChain, txHash, createdAt: record.createdAt }];
  }).slice(0, 25);
}

function formatBaseUnits(value: string | null | undefined, symbol: string): string {
  if (!value || !/^\d+$/.test(value)) return "Unavailable";
  const amount = BigInt(value);
  const baseUnits = BigInt(100_000_000);
  const whole = amount / baseUnits;
  const fractional = (amount % baseUnits).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toString()}${fractional ? `.${fractional}` : ""} ${symbol}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return "Not provided";
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `About ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `About ${hours} hr ${remainingMinutes} min` : `About ${hours} hr`;
}

export default function BitcoinQuotePage() {
  const [pair, setPair] = useState<Pair>("ETH_TO_BTC");
  const [amount, setAmount] = useState("0.1");
  const [slippageBps, setSlippageBps] = useState(500);
  const [destination, setDestination] = useState("");
  const [connectedBitcoinAddress, setConnectedBitcoinAddress] = useState<string | null>(null);
  const [connectedEthereumAddress, setConnectedEthereumAddress] = useState<string | null>(null);
  const [trackingItems, setTrackingItems] = useState<SwapTrackingRecord[]>([]);
  const [trackingLoading, setTrackingLoading] = useState(true);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const details = PAIRS[pair];
  const previousBitcoinAddress = useRef<string | null>(null);
  const quoteRequestId = useRef(0);
  const quoteAbortController = useRef<AbortController | null>(null);

  const invalidateQuote = useCallback(() => {
    quoteRequestId.current += 1;
    quoteAbortController.current?.abort();
    quoteAbortController.current = null;
    setQuote(null);
    setIsLoading(false);
    setError("");
  }, []);

  useEffect(() => {
    let active = true;
    async function loadHistory() {
      try {
        const response = await fetch("/api/trading/history", { cache: "no-store" });
        const data: unknown = await response.json();
        if (!response.ok || typeof data !== "object" || data === null || !("items" in data)) {
          throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Could not load account trade history.");
        }
        const items = readTrackingItems(data.items);
        if (active) setTrackingItems(items);
      } catch (historyError) {
        if (active) setTrackingMessage(historyError instanceof Error ? historyError.message : "Could not load account trade history.");
      } finally {
        if (active) setTrackingLoading(false);
      }
    }
    void loadHistory();
    return () => { active = false; };
  }, []);

  const handleTradeSubmitted = useCallback((trade: SwapTrackingRecord) => {
    setTrackingItems((current) => [trade, ...current.filter((item) => item.id !== trade.id)].slice(0, 25));
    setTrackingMessage("Saving the submitted transaction reference to your account…");
    void fetch("/api/trading/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction: trade.direction, sourceChain: trade.sourceChain, txHash: trade.txHash }),
      cache: "no-store",
    }).then(async (response) => {
      const data: unknown = await response.json();
      if (!response.ok || typeof data !== "object" || data === null || !("item" in data)) {
        throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Could not save this trade reference.");
      }
      const saved = readTrackingItems([data.item])[0];
      if (!saved) throw new Error("The history service returned an invalid transaction reference.");
      setTrackingItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)].slice(0, 25));
      setTrackingMessage("Transaction reference saved to your account.");
    }).catch((historyError: unknown) => {
      setTrackingMessage(historyError instanceof Error ? `${historyError.message} The transaction remains visible for this page session.` : "Could not sync this transaction reference; it remains visible for this page session.");
    });
  }, []);

  const removeTrackingItem = useCallback(async (id: string) => {
    const item = trackingItems.find((trade) => trade.id === id);
    if (!item) return;
    setTrackingMessage("");
    try {
      const response = await fetch("/api/trading/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: item.direction, sourceChain: item.sourceChain, txHash: item.txHash }),
        cache: "no-store",
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "Could not remove this history item.");
      setTrackingItems((current) => current.filter((trade) => trade.id !== id));
      setTrackingMessage("Transaction reference removed from your account history.");
    } catch (historyError) {
      setTrackingMessage(historyError instanceof Error ? historyError.message : "Could not remove this history item.");
    }
  }, [trackingItems]);

  const handleWalletAddressChange = useCallback((address: string | null) => {
    const previous = previousBitcoinAddress.current;
    previousBitcoinAddress.current = address;
    setConnectedBitcoinAddress(address);
    if (pair === "ETH_TO_BTC") {
      setDestination((current) => address || (previous && current === previous ? "" : current));
      invalidateQuote();
    }
  }, [invalidateQuote, pair]);

  const handleEthereumAddressChange = useCallback((address: string | null) => {
    setConnectedEthereumAddress(address);
    invalidateQuote();
  }, [invalidateQuote]);

  async function requestQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuote(null);
    quoteAbortController.current?.abort();
    const controller = new AbortController();
    quoteAbortController.current = controller;
    const requestId = ++quoteRequestId.current;
    setIsLoading(true);
    try {
      const response = await fetch("/api/trading/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pair, amount, destination: destination.trim(), slippageBps }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data: unknown = await response.json();
      if (requestId !== quoteRequestId.current) return;
      if (!response.ok) {
        const message = typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
          ? data.error
          : "Could not load a quote.";
        throw new Error(message);
      }
      if (typeof data !== "object" || data === null || !("quote" in data) || typeof data.quote !== "object" || data.quote === null) {
        throw new Error("The provider returned an incomplete quote.");
      }
      setQuote(data.quote as Quote);
    } catch (requestError) {
      if (requestId === quoteRequestId.current && !(requestError instanceof Error && requestError.name === "AbortError")) {
        setError(requestError instanceof Error ? requestError.message : "Could not load a quote.");
      }
    } finally {
      if (requestId === quoteRequestId.current) {
        quoteAbortController.current = null;
        setIsLoading(false);
      }
    }
  }

  useEffect(() => () => quoteAbortController.current?.abort(), []);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
            <ArrowLeftRight className="h-3.5 w-3.5" /> Live indicative quote
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">Bitcoin swap quote</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Preview an ETH ↔ native Bitcoin swap using a live THORChain quote. Bitcoin → Ethereum prepares a transaction in UniSat; ETH → Bitcoin can prepare an Ethereum router transaction for review in your EVM wallet.</p>
        </div>

        <BitcoinWalletConnection onAddressChange={handleWalletAddressChange} />
        {pair === "ETH_TO_BTC" && <EthereumWalletConnection onAddressChange={handleEthereumAddressChange} />}

        {quote && pair === "ETH_TO_BTC" && connectedEthereumAddress && quote.ethereumDeposit?.executionEnabled === true && (
          <EthereumSwapExecution
            key={`${amount}|${destination}|${connectedEthereumAddress}`}
            amount={amount}
            slippageBps={slippageBps}
            destination={destination}
            sourceAddress={connectedEthereumAddress}
            onSubmitted={handleTradeSubmitted}
          />
        )}
        {quote && pair === "ETH_TO_BTC" && connectedEthereumAddress && quote.ethereumDeposit?.executionEnabled !== true && (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-foreground">Ethereum mainnet transaction preparation is disabled unless the operator enables trading and configures the independently verified router address and deployed-code hash on the server.</p>
        )}

        {quote && pair === "BTC_TO_ETH" && connectedBitcoinAddress && quote.bitcoinDeposit?.executionEnabled === true && (
          <BitcoinSwapExecution
            key={`${amount}|${destination}|${connectedBitcoinAddress}`}
            amount={amount}
            slippageBps={slippageBps}
            destination={destination}
            sourceAddress={connectedBitcoinAddress}
            onSubmitted={handleTradeSubmitted}
          />
        )}

        <SwapStatusTracker items={trackingItems} onRemove={removeTrackingItem} loading={trackingLoading} syncMessage={trackingMessage} />
        {quote && pair === "BTC_TO_ETH" && connectedBitcoinAddress && quote.bitcoinDeposit?.executionEnabled !== true && (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-foreground">Bitcoin mainnet transaction preparation is disabled by default. An operator must set the server-only <code>FINTRACK_ENABLE_MAINNET_BTC_TRADES=true</code> after completing wallet and transaction review.</p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <form onSubmit={requestQuote} className="space-y-5 rounded-2xl border border-card-border bg-card p-5 md:p-6">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Maximum slippage</span>
              <select
                value={slippageBps}
                onChange={(event) => { invalidateQuote(); setSlippageBps(Number(event.target.value)); }}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value={100}>1% maximum</option>
                <option value={300}>3% maximum</option>
                <option value={500}>5% maximum (default)</option>
                <option value={1000}>10% maximum</option>
              </select>
              <span className="block text-xs text-muted">The quote sets a minimum receive amount. The trade should refund if the swap falls below that limit.</span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Trade direction</span>
              <select
                value={pair}
                onChange={(event) => {
                  const nextPair = event.target.value as Pair;
                  invalidateQuote();
                  setPair(nextPair);
                  if (nextPair !== "ETH_TO_BTC") setConnectedEthereumAddress(null);
                  if (nextPair === "ETH_TO_BTC" && connectedBitcoinAddress) setDestination(connectedBitcoinAddress);
                }}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              >
                {Object.entries(PAIRS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Amount ({details.from.split(".")[0]})</span>
              <input
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => { invalidateQuote(); setAmount(event.target.value); }}
                placeholder="0.1"
                maxLength={20}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                required
              />
              <span className="block text-xs text-muted">Enter a positive amount with up to 8 decimal places.</span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Receive address</span>
              <input
                autoComplete="off"
                spellCheck={false}
                value={destination}
                onChange={(event) => { invalidateQuote(); setDestination(event.target.value); }}
                placeholder={details.destination}
                maxLength={100}
                className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                required
              />
              <span className="block text-xs text-muted">{pair === "BTC_TO_ETH" && connectedBitcoinAddress ? "Bitcoin source wallet is connected above. Enter a regular Ethereum account address where you want to receive ETH. Smart-contract and delegated EIP-7702 destinations are not supported." : "Double-check the address and network. The final swap interface will ask for the address again."}</span>
            </label>

            {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Getting quote…</> : <>Get live quote <ArrowDown className="h-4 w-4" /></>}
            </button>
          </form>

          <section className="rounded-2xl border border-card-border bg-card p-5 md:p-6" aria-live="polite">
            <h2 className="text-base font-semibold text-foreground">Quote preview</h2>
            {quote ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl bg-background p-4">
                  <p className="text-xs text-muted">You send</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatBaseUnits(quote.amountIn, quote.fromAsset.split(".")[0])}</p>
                  <div className="my-3 border-t border-card-border" />
                  <p className="text-xs text-muted">Estimated receive</p>
                  <p className="mt-1 text-2xl font-bold text-primary">{formatBaseUnits(quote.amountOut, quote.toAsset.split(".")[0])}</p>
                  <p className="mt-3 text-xs text-muted">Minimum after slippage limit ({(quote.slippageLimitBps / 100).toFixed(2)}%)</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatBaseUnits(quote.minimumAmountOut, quote.toAsset.split(".")[0])}</p>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-muted">Protocol fee estimate</dt><dd className="text-right font-medium text-foreground">{quote.totalFee ? formatBaseUnits(quote.totalFee, quote.feeAsset.split(".")[0]) : "Check final quote"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Estimated slippage</dt><dd className="font-medium text-foreground">{quote.slippageBps === null ? "Not provided" : `${(quote.slippageBps / 100).toFixed(2)}%`}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Estimated completion</dt><dd className="text-right font-medium text-foreground">{formatDuration(quote.estimatedSeconds)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-muted">Quote expires</dt><dd className="text-right font-medium text-foreground">{quote.expiresAt ? new Date(quote.expiresAt).toLocaleTimeString() : "Soon; refresh before trading"}</dd></div>
                </dl>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs leading-5 text-foreground">
                  This is an indicative preview, not an order. When you prepare a FinTrack trade below, it fetches fresh instructions for the current amount, destination, and slippage. No price is reserved.
                </div>
                <a href="https://swap.thorchain.org/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-background">
                  Continue to swap interface <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-card-border px-5 text-center">
                <Clock3 className="h-7 w-7 text-muted" />
                <p className="mt-3 text-sm font-medium text-foreground">Your quote will appear here</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-muted">Quotes expire quickly. FinTrack does not save or reuse quote instructions.</p>
              </div>
            )}
            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> FinTrack never requests your seed phrase or private key. The actual trade must be reviewed and approved in your wallet.</p>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
