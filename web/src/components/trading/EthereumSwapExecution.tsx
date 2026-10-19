"use client";

import { useRef, useState } from "react";
import { encodeFunctionData, getAddress, isAddress, keccak256, parseAbi, type Hex } from "viem";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { assertTradeReadiness } from "@/lib/trading-readiness";
import { readBoundedTradingJson } from "@/lib/trading-http";
import type { SwapTrackingRecord } from "@/types/trading";

type Props = { amount: string; slippageBps: number; destination: string; sourceAddress: string; onSubmitted: (trade: SwapTrackingRecord) => void };
type PreparedTrade = {
  inputAmount: string;
  sourceAddress: string;
  destination: string;
  amountWei: string;
  amountOut: string;
  minimumAmountOut: string;
  slippageLimitBps: number;
  expectedRouterCodeHash: string;
  estimatedGasUnits: string;
  estimatedGasFeeWei: string;
  expiresAt: string;
  memo: string;
  router: string;
  vault: string;
  data: `0x${string}`;
};

const ROUTER_ABI = parseAbi([
  "function depositWithExpiry(address payable vault, address asset, uint256 amount, string memo, uint256 expiry) payable",
]);
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const ETH_TO_WEI_FACTOR = BigInt("10000000000");
const TRANSACTION_EXPIRY_SECONDS = 60 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstEthereumAccount(value: unknown): string | null {
  if (!Array.isArray(value) || typeof value[0] !== "string" || !isAddress(value[0])) return null;
  return getAddress(value[0]);
}

function isWalletRequestRejected(error: unknown): boolean {
  return isRecord(error) && (error.code === 4001 || error.code === "4001");
}

function formatEth(wei: string): string {
  const value = BigInt(wei);
  const whole = value / BigInt("1000000000000000000");
  const fraction = (value % BigInt("1000000000000000000")).toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""} ETH`;
}

function formatBaseUnits(value: string, symbol: string): string {
  const amount = BigInt(value);
  const base = BigInt("100000000");
  const whole = amount / base;
  const fraction = (amount % base).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""} ${symbol}`;
}

function parseRpcQuantity(value: unknown, label: string): bigint {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(value)) throw new Error(`The wallet returned an invalid ${label}.`);
  return BigInt(value);
}

async function estimateEthereumFee(provider: Eip1193Provider, transaction: { from: string; to: string; value: string; data: `0x${string}` }) {
  const [gasEstimateValue, gasPriceValue] = await Promise.all([
    provider.request({ method: "eth_estimateGas", params: [transaction] }),
    provider.request({ method: "eth_gasPrice" }),
  ]);
  const gasUnits = parseRpcQuantity(gasEstimateValue, "gas estimate");
  const gasPriceWei = parseRpcQuantity(gasPriceValue, "gas price");
  if (gasUnits <= BigInt(0) || gasUnits > BigInt(30_000_000) || gasPriceWei <= BigInt(0)) {
    throw new Error("The current Ethereum gas estimate is outside the supported range.");
  }
  return { gasUnits, feeWei: gasUnits * gasPriceWei };
}

async function fetchFreshTrade(amount: string, destination: string, sourceAddress: string, slippageBps: number): Promise<PreparedTrade> {
  const provider = window.ethereum;
  if (!provider || !isAddress(sourceAddress)) throw new Error("Connect a valid Ethereum mainnet wallet before preparing this trade.");
  const [chainId, accounts] = await Promise.all([
    provider.request({ method: "eth_chainId" }),
    provider.request({ method: "eth_accounts" }),
  ]);
  const activeAddress = firstEthereumAccount(accounts);
  if (chainId !== "0x1" || !activeAddress || activeAddress !== getAddress(sourceAddress)) {
    throw new Error("Connect the intended wallet on Ethereum mainnet before preparing this trade.");
  }
  const response = await fetch("/api/trading/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair: "ETH_TO_BTC", amount, destination, slippageBps }),
    cache: "no-store",
  });
  const data: unknown = await readBoundedTradingJson(response);
  if (!response.ok) {
    const message = isRecord(data) && typeof data.error === "string" ? data.error : "Could not get fresh swap instructions.";
    throw new Error(message);
  }
  if (!isRecord(data) || !isRecord(data.quote)) throw new Error("The provider returned incomplete swap instructions.");
  const quote = data.quote;
  const deposit = quote.ethereumDeposit;
  if (!isRecord(deposit) || deposit.executionEnabled !== true) throw new Error("Ethereum mainnet transaction preparation is disabled on this server.");
  if (typeof deposit.expectedRouterCodeHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(deposit.expectedRouterCodeHash)) {
    throw new Error("The expected THORChain router code hash is missing. Transaction preparation is disabled.");
  }
  if (typeof quote.amountIn !== "string" || !/^\d{1,32}$/.test(quote.amountIn)) throw new Error("The quote amount is invalid.");
  if (typeof quote.amountOut !== "string" || !/^\d{1,32}$/.test(quote.amountOut)
    || typeof quote.minimumAmountOut !== "string" || !/^\d{1,32}$/.test(quote.minimumAmountOut)
    || BigInt(quote.amountOut) <= BigInt(0)
    || BigInt(quote.minimumAmountOut) <= BigInt(0)
    || BigInt(quote.minimumAmountOut) > BigInt(quote.amountOut)
    || quote.slippageLimitBps !== slippageBps) throw new Error("The quote does not include a safe minimum receive amount for the selected slippage limit.");
  if (typeof quote.expiresAt !== "string") throw new Error("The provider did not return a quote expiry.");
  const quoteExpiry = Date.parse(quote.expiresAt);
  if (!Number.isFinite(quoteExpiry) || quoteExpiry <= Date.now()) throw new Error("This quote has expired. Request a new quote.");
  if (typeof deposit.memo !== "string" || !/^[\x20-\x7e]{1,250}$/.test(deposit.memo)) throw new Error("The provider returned an invalid transaction memo.");
  if (typeof deposit.router !== "string" || !isAddress(deposit.router) || typeof deposit.vault !== "string" || !isAddress(deposit.vault)) {
    throw new Error("The provider returned invalid router details.");
  }

  const amountWei = (BigInt(quote.amountIn) * ETH_TO_WEI_FACTOR).toString();
  const router = getAddress(deposit.router);
  const vault = getAddress(deposit.vault);
  const expiry = BigInt(Math.floor(Date.now() / 1000) + TRANSACTION_EXPIRY_SECONDS);
  const calldata = encodeFunctionData({
    abi: ROUTER_ABI,
    functionName: "depositWithExpiry",
    args: [vault, NATIVE_ETH, BigInt(amountWei), deposit.memo, expiry],
  });
  const transaction = { from: getAddress(sourceAddress), to: router, value: `0x${BigInt(amountWei).toString(16)}`, data: calldata };
  const [feeEstimate, balanceValue] = await Promise.all([
    estimateEthereumFee(provider, transaction),
    provider.request({ method: "eth_getBalance", params: [getAddress(sourceAddress), "latest"] }),
  ]);
  const balanceWei = parseRpcQuantity(balanceValue, "ETH balance");
  if (balanceWei < BigInt(amountWei) + feeEstimate.feeWei) {
    throw new Error("The connected wallet balance may not cover the swap amount plus the current estimated network fee.");
  }
  return {
    inputAmount: amount,
    sourceAddress: getAddress(sourceAddress),
    destination: destination.trim(),
    amountWei,
    amountOut: quote.amountOut,
    minimumAmountOut: quote.minimumAmountOut,
    slippageLimitBps: quote.slippageLimitBps as number,
    expectedRouterCodeHash: deposit.expectedRouterCodeHash.toLowerCase(),
    estimatedGasUnits: feeEstimate.gasUnits.toString(),
    estimatedGasFeeWei: feeEstimate.feeWei.toString(),
    expiresAt: quote.expiresAt,
    memo: deposit.memo,
    router,
    vault,
    data: calldata,
  };
}

export default function EthereumSwapExecution({ amount, slippageBps, destination, sourceAddress, onSubmitted }: Props) {
  const [prepared, setPrepared] = useState<PreparedTrade | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [submissionUncertain, setSubmissionUncertain] = useState(false);
  const walletActionInProgress = useRef(false);

  async function prepare() {
    if (submissionUncertain) return;
    if (walletActionInProgress.current) return;
    walletActionInProgress.current = true;
    setBusy(true);
    setError("");
    setPrepared(null);
    setTransactionHash("");
    try {
      setPrepared(await fetchFreshTrade(amount, destination, sourceAddress, slippageBps));
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "Could not prepare this trade.");
    } finally {
      walletActionInProgress.current = false;
      setBusy(false);
    }
  }

  async function sendToWallet() {
    if (!prepared || walletActionInProgress.current) return;
    walletActionInProgress.current = true;
    let submissionAttempted = false;
    setBusy(true);
    setError("");
    try {
      if (prepared.inputAmount !== amount || prepared.destination !== destination.trim()
        || !isAddress(sourceAddress) || getAddress(prepared.sourceAddress) !== getAddress(sourceAddress)
        || prepared.slippageLimitBps !== slippageBps) {
        throw new Error("Trade details changed after preparation. Discard it and prepare a fresh transaction.");
      }
      await assertTradeReadiness("ETH_TO_BTC", prepared.inputAmount, {
        inboundAddress: prepared.vault,
        router: prepared.router,
        vault: prepared.vault,
      });
      if (Date.parse(prepared.expiresAt) <= Date.now()) throw new Error("This quote expired while you were reviewing it. Prepare a fresh trade.");
      if (!isAddress(sourceAddress) || !isAddress(destination)) throw new Error("A wallet or Bitcoin destination address changed. Reconnect and request a fresh quote.");
      const provider = window.ethereum;
      if (!provider) throw new Error("Ethereum wallet provider is not available.");
      const tx = {
        from: getAddress(prepared.sourceAddress),
        to: prepared.router,
        value: `0x${BigInt(prepared.amountWei).toString(16)}`,
        data: prepared.data,
      };
      const readWalletContext = async () => {
        const [chainId, accounts] = await Promise.all([
          provider.request({ method: "eth_chainId" }),
          provider.request({ method: "eth_accounts" }),
        ]);
        const activeAddress = firstEthereumAccount(accounts);
        if (chainId !== "0x1" || !activeAddress || activeAddress !== getAddress(prepared.sourceAddress)) {
          throw new Error("Your wallet account or network changed. Reconnect to Ethereum mainnet and prepare this trade again.");
        }
      };
      await readWalletContext();
      const latestFeeEstimate = await estimateEthereumFee(provider, tx);
      const latestBalance = parseRpcQuantity(
        await provider.request({ method: "eth_getBalance", params: [prepared.sourceAddress, "latest"] }),
        "ETH balance",
      );
      const requiredBalance = BigInt(prepared.amountWei) + latestFeeEstimate.feeWei;
      if (latestBalance < requiredBalance) {
        throw new Error("Your current ETH balance may not cover the swap amount and network fee. Add ETH or reduce the swap amount.");
      }
      if (latestFeeEstimate.feeWei > BigInt(prepared.estimatedGasFeeWei) * BigInt(120) / BigInt(100)) {
        throw new Error("The estimated Ethereum network fee rose by more than 20% since preparation. Prepare again to review the updated fee.");
      }
      const routerCode = await provider.request({ method: "eth_getCode", params: [prepared.router, "latest"] });
      if (typeof routerCode !== "string" || !/^0x(?:[a-fA-F0-9]{2})*$/.test(routerCode)
        || routerCode === "0x" || /^0x0+$/i.test(routerCode)) {
        throw new Error("The quoted THORChain router has no deployed contract code on Ethereum mainnet. No wallet approval was opened.");
      }
      if (keccak256(routerCode as Hex).toLowerCase() !== prepared.expectedRouterCodeHash) {
        throw new Error("The THORChain router code changed after this quote. No wallet approval was opened. Request a fresh quote and contact the operator if this continues.");
      }
      try {
        const simulation = await provider.request({ method: "eth_call", params: [tx, "latest"] });
        if (typeof simulation !== "string" || !/^0x(?:[a-fA-F0-9]{2})*$/.test(simulation)) {
          throw new Error("The wallet returned an invalid simulation result.");
        }
      } catch {
        throw new Error("This swap could not be simulated on the current Ethereum mainnet state. No wallet approval was opened. Refresh the quote and try again.");
      }
      await readWalletContext();
      submissionAttempted = true;
      const txHash = await provider.request({ method: "eth_sendTransaction", params: [tx] });
      if (typeof txHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) throw new Error("The wallet did not return a valid transaction hash.");
      setSubmissionUncertain(false);
      setTransactionHash(txHash);
      const normalizedHash = txHash.toLowerCase();
      onSubmitted({ id: `ETH:${normalizedHash}`, direction: "ETH_TO_BTC", sourceChain: "ETH", txHash: normalizedHash, createdAt: Date.now() });
      setPrepared(null);
    } catch (sendError) {
      if (submissionAttempted && !isWalletRequestRejected(sendError)) {
        setPrepared(null);
        setSubmissionUncertain(true);
        setError("");
      } else if (submissionAttempted) {
        setError("The wallet rejected the request; it was not submitted.");
      } else {
        setError(sendError instanceof Error ? sendError.message : "Wallet transaction was not submitted.");
      }
    } finally {
      walletActionInProgress.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-card-border bg-card p-5 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Buy Bitcoin with ETH</h2>
        <p className="mt-1 text-sm leading-6 text-muted">FinTrack fetches new instructions when you prepare. You review the exact ETH amount, router and memo before MetaMask asks you to approve the transaction.</p>
      </div>

      {!prepared && !transactionHash && (
        !submissionUncertain && <button type="button" onClick={prepare} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Getting fresh instructions…" : "Prepare fresh ETH transaction"}
        </button>
      )}

      {submissionUncertain && !transactionHash && (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p role="alert" className="text-sm leading-6 text-foreground">The wallet may have submitted this trade, but FinTrack did not receive a transaction ID. Check the wallet&apos;s activity and Ethereum account history before trying again. A second transaction could make a second swap.</p>
          <button type="button" onClick={() => { setSubmissionUncertain(false); setError(""); }} className="min-h-10 rounded-lg border border-card-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background">I checked and want to prepare another trade</button>
        </div>
      )}

      {prepared && (
        <>
          <dl className="grid gap-3 rounded-xl bg-background p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Pay from Ethereum wallet</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{prepared.sourceAddress}</dd></div>
            <div><dt className="text-xs text-muted">You send</dt><dd className="mt-1 font-semibold text-foreground">{formatEth(prepared.amountWei)}</dd></div>
            <div><dt className="text-xs text-muted">Estimated network fee</dt><dd className="mt-1 font-semibold text-foreground">{formatEth(prepared.estimatedGasFeeWei)}</dd></div>
            <div><dt className="text-xs text-muted">Estimated gas</dt><dd className="mt-1 font-semibold text-foreground">{BigInt(prepared.estimatedGasUnits).toLocaleString()} units</dd></div>
            <div><dt className="text-xs text-muted">Estimated BTC received</dt><dd className="mt-1 font-semibold text-foreground">{formatBaseUnits(prepared.amountOut, "BTC")}</dd></div>
            <div><dt className="text-xs text-muted">Minimum BTC ({(prepared.slippageLimitBps / 100).toFixed(2)}% slippage limit)</dt><dd className="mt-1 font-semibold text-foreground">{formatBaseUnits(prepared.minimumAmountOut, "BTC")}</dd></div>
            <div><dt className="text-xs text-muted">Receive Bitcoin at</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{prepared.destination}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">THORChain router</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{prepared.router}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">Current THORChain vault</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{prepared.vault}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">Swap memo</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{prepared.memo}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">Indicative quote expires</dt><dd className="mt-1 text-foreground">{new Date(prepared.expiresAt).toLocaleString()}</dd></div>
          </dl>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> The network fee is an estimate based on current gas data and may change. Your wallet shows the final fee. FinTrack simulates the exact router call before opening the wallet; simulation cannot reserve the quote or guarantee later execution. Verify the receiving Bitcoin address and every transaction field in your wallet before approving.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={sendToWallet} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? "Waiting for wallet…" : "Open wallet to review and approve"}
            </button>
            <button type="button" onClick={() => { setPrepared(null); setError(""); }} disabled={busy} className="min-h-11 rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-60">Cancel</button>
          </div>
        </>
      )}

      {transactionHash && <p role="status" className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-foreground">Wallet submitted the transaction. Track confirmation on <a className="inline-flex items-center gap-1 font-semibold underline" href={`https://etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">Etherscan <ExternalLink className="h-3.5 w-3.5" /></a>. This does not confirm that the cross-chain swap has completed.</p>}
      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
