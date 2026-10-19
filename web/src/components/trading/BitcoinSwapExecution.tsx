"use client";

import { useRef, useState } from "react";
import * as btc from "@scure/btc-signer";
import { EsploraProvider } from "@scure/btc-signer/net.js";
import { getPrevOut } from "@scure/btc-signer/transaction.js";
import { normalizeBitcoinMainnetAddress } from "@/lib/bitcoin-address-normalize";
import { ArrowRight, ExternalLink, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { assertTradeReadiness } from "@/lib/trading-readiness";
import { isBitcoinMainnetChain } from "@/lib/bitcoin-wallet-network";
import { readBoundedTradingJson, readBoundedTradingResponse } from "@/lib/trading-http";
import type { SwapTrackingRecord } from "@/types/trading";

const EXPLORER_API = "https://mempool.space/api";
const BASE_UNITS = BigInt(100_000_000);

type Props = {
  amount: string;
  slippageBps: number;
  destination: string;
  sourceAddress: string;
  onSubmitted: (trade: SwapTrackingRecord) => void;
};

type PreparedTrade = {
  inputAmount: string;
  sourceAddress: string;
  destination: string;
  amountIn: string;
  amountOut: string;
  minimumAmountOut: string;
  slippageLimitBps: number;
  inboundAddress: string;
  memo: string;
  fee: string;
  expiresAt: string;
  psbtHex: string;
  unsignedTxHex: string;
  signInputIndexes: number[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) throw new Error("Wallet returned malformed transaction data.");
  const output = new Uint8Array(value.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return output;
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function formatBaseUnits(valueText: string, symbol: string): string {
  const value = BigInt(valueText);
  const whole = value / BASE_UNITS;
  const fraction = (value % BASE_UNITS).toString().padStart(8, "0").replace(/0+$/, "");
  return `${whole.toString()}${fraction ? `.${fraction}` : ""} ${symbol}`;
}

function verifySignedPsbt(psbtHex: string, prepared: PreparedTrade): string {
  const signedTx = btc.Transaction.fromPSBT(hexToBytes(psbtHex));
  if (!signedTx.isFinal) throw new Error("The wallet returned an incomplete Bitcoin transaction. Nothing was broadcast.");
  if (bytesToHex(signedTx.unsignedTx) !== prepared.unsignedTxHex) {
    throw new Error("The wallet returned a transaction with inputs or outputs different from the reviewed transaction. Nothing was broadcast.");
  }
  if (signedTx.fee !== BigInt(prepared.fee)) throw new Error("The signed transaction fee differs from the reviewed fee. Nothing was broadcast.");
  const finalized = btc.Transaction.fromRaw(signedTx.extract());
  if (!finalized.isFinal || finalized.id !== signedTx.id || bytesToHex(finalized.unsignedTx) !== prepared.unsignedTxHex) {
    throw new Error("The wallet's finalized transaction does not match the reviewed Bitcoin transaction. Nothing was broadcast.");
  }
  return finalized.id.toLowerCase();
}

async function getFreshTradeQuote(amount: string, destination: string, slippageBps: number) {
  const response = await fetch("/api/trading/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pair: "BTC_TO_ETH", amount, destination, slippageBps }),
    cache: "no-store",
  });
  const result: unknown = await readBoundedTradingJson(response);
  if (!response.ok) {
    const error = isRecord(result) && typeof result.error === "string" ? result.error : "Could not get a fresh trade quote.";
    throw new Error(error);
  }
  if (!isRecord(result) || !isRecord(result.quote)) {
    throw new Error("The quote is missing Bitcoin transaction instructions.");
  }
  const quote = result.quote;
  if (!isRecord(quote.bitcoinDeposit)) throw new Error("The quote is missing Bitcoin transaction instructions.");
  const deposit = quote.bitcoinDeposit;
  if (deposit.executionEnabled !== true) throw new Error("Bitcoin mainnet transaction preparation is disabled on this server.");
  if (typeof quote.amountIn !== "string" || !/^\d+$/.test(quote.amountIn)
    || typeof quote.amountOut !== "string" || !/^\d+$/.test(quote.amountOut)
    || typeof quote.minimumAmountOut !== "string" || !/^\d+$/.test(quote.minimumAmountOut)
    || BigInt(quote.amountOut) <= BigInt(0)
    || BigInt(quote.minimumAmountOut) <= BigInt(0)
    || BigInt(quote.minimumAmountOut) > BigInt(quote.amountOut)
    || quote.slippageLimitBps !== slippageBps
    || typeof quote.expiresAt !== "string" || !Number.isFinite(Date.parse(quote.expiresAt))
    || Date.parse(quote.expiresAt) <= Date.now()
    || typeof deposit.inboundAddress !== "string"
    || typeof deposit.memo !== "string") {
    throw new Error("The quote is incomplete or has expired. Request a new one.");
  }
  return {
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    minimumAmountOut: quote.minimumAmountOut,
    slippageLimitBps: quote.slippageLimitBps as number,
    inboundAddress: deposit.inboundAddress,
    memo: deposit.memo,
    expiresAt: quote.expiresAt,
  };
}

async function getExplorer() {
  const transport = (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) =>
    fetch(url, { ...options, cache: "no-store" }).then(readBoundedTradingResponse);
  return new EsploraProvider(transport, EXPLORER_API, btc.NETWORK);
}

async function getConfirmedOutpoints(address: string, signal: AbortSignal): Promise<Set<string>> {
  const response = await fetch(`${EXPLORER_API}/address/${encodeURIComponent(address)}/utxo`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Could not check confirmed Bitcoin outputs. Try again later.");
  const value: unknown = await readBoundedTradingJson(response);
  if (!Array.isArray(value) || value.length > 500) throw new Error("The wallet UTXO response is invalid or too large to process safely.");
  const confirmed = new Set<string>();
  for (const item of value) {
    if (!isRecord(item) || typeof item.txid !== "string" || !/^[0-9a-fA-F]{64}$/.test(item.txid)
      || !Number.isSafeInteger(item.vout) || typeof item.vout !== "number" || item.vout < 0
      || !isRecord(item.status)) continue;
    if (item.status.confirmed === true) confirmed.add(`${item.txid.toLowerCase()}:${item.vout}`);
  }
  return confirmed;
}

export default function BitcoinSwapExecution({ amount, slippageBps, destination, sourceAddress, onSubmitted }: Props) {
  const [prepared, setPrepared] = useState<PreparedTrade | null>(null);
  const [signedPsbt, setSignedPsbt] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [broadcastUncertain, setBroadcastUncertain] = useState(false);
  const [uncertainTxid, setUncertainTxid] = useState("");
  const [busy, setBusy] = useState<"" | "prepare" | "sign" | "broadcast">("");
  const [error, setError] = useState("");
  const walletActionInProgress = useRef(false);

  async function prepareTrade() {
    if (walletActionInProgress.current) return;
    walletActionInProgress.current = true;
    setError("");
    setPrepared(null);
    setSignedPsbt("");
    setTransactionId("");
    setBusy("prepare");
    try {
      const wallet = window.unisat;
      if (!wallet) throw new Error("UniSat Wallet is not available in this browser.");
      const accounts = await wallet.getAccounts();
      if (!Array.isArray(accounts) || accounts[0] !== sourceAddress) throw new Error("Your connected UniSat account changed. Reconnect the intended Bitcoin account.");
      if (wallet.getChain) {
        const chain = await wallet.getChain();
        if (!isBitcoinMainnetChain(chain)) throw new Error("Switch UniSat to Bitcoin mainnet before preparing this trade.");
      } else if (!wallet.getNetwork || await wallet.getNetwork() !== "livenet") {
        throw new Error("Could not confirm that UniSat is on Bitcoin mainnet.");
      }

      const quote = await getFreshTradeQuote(amount, destination, slippageBps);
      const amountSat = BigInt(quote.amountIn);
      if (amountSat <= BigInt(0)) throw new Error("The Bitcoin amount must be greater than zero.");

      const explorer = await getExplorer();
      const signal = AbortSignal.timeout(25_000);
      const confirmedOutpoints = await getConfirmedOutpoints(sourceAddress, signal);
      const [unspent, feeRate] = await Promise.all([
        explorer.unspent(sourceAddress, { signal, concurrency: 4 }),
        explorer.fee(3),
      ]);
      if (unspent.utxo.length > 500) throw new Error("This wallet has too many unspent outputs for a safe in-browser preparation. Consolidate funds or use THORChain's swap interface.");
      const confirmedInputs = unspent.utxo.filter((input) => typeof input.txid === "string"
        && typeof input.index === "number" && confirmedOutpoints.has(`${input.txid.toLowerCase()}:${input.index}`));
      if (confirmedInputs.length === 0) throw new Error("No confirmed spendable Bitcoin outputs were found for this wallet.");
      if (feeRate < BigInt(1) || feeRate > BigInt(500)) throw new Error("The Bitcoin fee estimate is outside the supported safe range. Try again later.");

      const memoBytes = new TextEncoder().encode(quote.memo);
      if (memoBytes.length > 80) throw new Error("The provider's Bitcoin memo is too long for a Bitcoin OP_RETURN output.");
      const memoScript = btc.Script.encode(["RETURN", memoBytes]);
      const selection = btc.selectUTXO(
        confirmedInputs,
        [
          { address: quote.inboundAddress, amount: amountSat },
          { script: memoScript, amount: BigInt(0) },
        ],
        "default",
        { feePerByte: feeRate, changeAddress: sourceAddress, network: btc.NETWORK, createTx: true },
      );
      if (!selection?.tx || selection.fee === undefined) throw new Error("Your wallet does not have enough spendable Bitcoin for this amount and the network fee.");
      if (selection.fee > amountSat / BigInt(20)) throw new Error("The Bitcoin network fee estimate is over 5% of your swap amount. Reduce the amount or try again later.");
      if (Date.parse(quote.expiresAt) <= Date.now()) throw new Error("The quote expired while preparing the Bitcoin transaction. Request a fresh quote.");

      const unsigned = selection.tx;
      const expectedSourceScript = btc.OutScript.encode(btc.Address(btc.NETWORK).decode(sourceAddress));
      for (let index = 0; index < unsigned.inputsLength; index += 1) {
        const input = unsigned.getInput(index);
        if (!input.nonWitnessUtxo || typeof input.index !== "number") throw new Error("A selected Bitcoin input is missing its verified previous transaction.");
        const previousOutput = getPrevOut(input);
        if (!bytesEqual(previousOutput.script, expectedSourceScript)) throw new Error("A selected Bitcoin input does not belong to the connected UniSat address.");
      }

      let inboundOutputCount = 0;
      let memoOutputCount = 0;
      for (let index = 0; index < unsigned.outputsLength; index += 1) {
        const output = unsigned.getOutput(index);
        const outputAddress = unsigned.getOutputAddress(index, btc.NETWORK);
        if (outputAddress && normalizeBitcoinMainnetAddress(outputAddress) === normalizeBitcoinMainnetAddress(quote.inboundAddress) && output.amount === amountSat) {
          inboundOutputCount += 1;
        } else if (output.amount === BigInt(0) && output.script && bytesEqual(output.script, memoScript)) {
          memoOutputCount += 1;
        } else if (!outputAddress || normalizeBitcoinMainnetAddress(outputAddress) !== normalizeBitcoinMainnetAddress(sourceAddress)) {
          throw new Error("The prepared transaction contains an unexpected Bitcoin output. Nothing was signed.");
        }
      }
      if (inboundOutputCount !== 1 || memoOutputCount !== 1 || unsigned.outputsLength > 3) {
        throw new Error("The prepared transaction does not match the quoted deposit address, amount, and memo.");
      }

      const psbtHex = bytesToHex(unsigned.toPSBT());
      setPrepared({
        ...quote,
        inputAmount: amount,
        sourceAddress,
        destination: destination.trim(),
        fee: selection.fee.toString(),
        psbtHex,
        unsignedTxHex: bytesToHex(unsigned.unsignedTx),
        signInputIndexes: Array.from({ length: unsigned.inputsLength }, (_, index) => index),
      });
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : "Could not prepare this Bitcoin transaction.");
    } finally {
      walletActionInProgress.current = false;
      setBusy("");
    }
  }

  async function signTrade() {
    if (!prepared || walletActionInProgress.current) return;
    walletActionInProgress.current = true;
    setError("");
    setBusy("sign");
    try {
      if (prepared.inputAmount !== amount || prepared.destination !== destination.trim()
        || prepared.sourceAddress !== sourceAddress || prepared.slippageLimitBps !== slippageBps) {
        throw new Error("Trade details changed after preparation. Discard this transaction and prepare a fresh one.");
      }
      await assertTradeReadiness("BTC_TO_ETH", prepared.inputAmount, { inboundAddress: prepared.inboundAddress }, prepared.destination);
      if (Date.parse(prepared.expiresAt) <= Date.now()) throw new Error("The quote expired. Prepare a fresh transaction before signing.");
      const wallet = window.unisat;
      if (!wallet) throw new Error("UniSat Wallet is no longer available.");
      const accounts = await wallet.getAccounts();
      if (!Array.isArray(accounts) || accounts[0] !== prepared.sourceAddress) throw new Error("Your connected UniSat account changed. Reconnect the intended Bitcoin account.");
      if (wallet.getChain) {
        const chain = await wallet.getChain();
        if (!isBitcoinMainnetChain(chain)) throw new Error("Switch UniSat to Bitcoin mainnet before signing this transaction.");
      } else if (!wallet.getNetwork || await wallet.getNetwork() !== "livenet") {
        throw new Error("Could not confirm that UniSat is on Bitcoin mainnet.");
      }
      const signed = await wallet.signPsbt(prepared.psbtHex, {
        autoFinalized: true,
        toSignInputs: prepared.signInputIndexes.map((index) => ({ index, address: prepared.sourceAddress })),
      });
      if (typeof signed !== "string" || signed.length > 1_000_000) throw new Error("The wallet returned an invalid signed transaction.");
      verifySignedPsbt(signed, prepared);
      setSignedPsbt(signed);
    } catch (signError) {
      setError(signError instanceof Error ? signError.message : "The wallet did not sign this transaction.");
    } finally {
      walletActionInProgress.current = false;
      setBusy("");
    }
  }

  async function broadcastTrade() {
    if (!prepared || !signedPsbt || broadcastUncertain || walletActionInProgress.current) return;
    walletActionInProgress.current = true;
    let expectedTransactionId = "";
    let broadcastAttempted = false;
    setError("");
    setBusy("broadcast");
    try {
      if (prepared.inputAmount !== amount || prepared.destination !== destination.trim()
        || prepared.sourceAddress !== sourceAddress || prepared.slippageLimitBps !== slippageBps) {
        throw new Error("Trade details changed after preparation. Do not broadcast this transaction; prepare a fresh one.");
      }
      await assertTradeReadiness("BTC_TO_ETH", prepared.inputAmount, { inboundAddress: prepared.inboundAddress }, prepared.destination);
      const expectedTxid = verifySignedPsbt(signedPsbt, prepared);
      expectedTransactionId = expectedTxid;
      if (Date.parse(prepared.expiresAt) <= Date.now()) throw new Error("The quote has expired. Do not broadcast this transaction; prepare a new quote.");
      const wallet = window.unisat;
      if (!wallet) throw new Error("UniSat Wallet is no longer available.");
      const accounts = await wallet.getAccounts();
      if (!Array.isArray(accounts) || accounts[0] !== prepared.sourceAddress) throw new Error("Your connected UniSat account changed. Reconnect the intended Bitcoin account.");
      if (wallet.getChain) {
        const chain = await wallet.getChain();
        if (!isBitcoinMainnetChain(chain)) throw new Error("Switch UniSat to Bitcoin mainnet before broadcasting this transaction.");
      } else if (!wallet.getNetwork || await wallet.getNetwork() !== "livenet") {
        throw new Error("Could not confirm that UniSat is on Bitcoin mainnet.");
      }
      broadcastAttempted = true;
      const txid = await wallet.pushPsbt(signedPsbt);
      if (typeof txid !== "string" || !/^[0-9a-fA-F]{64}$/.test(txid)) throw new Error("The wallet did not return a valid transaction ID. Check your wallet before retrying.");
      const normalizedId = txid.toLowerCase();
      if (normalizedId !== expectedTxid) throw new Error(`UniSat returned a transaction ID that does not match the signed transaction (expected ${expectedTxid}). Check the wallet and Bitcoin explorer before retrying.`);
      setBroadcastUncertain(false);
      setUncertainTxid("");
      setTransactionId(normalizedId);
      onSubmitted({ id: `BTC:${normalizedId}`, direction: "BTC_TO_ETH", sourceChain: "BTC", txHash: normalizedId, createdAt: Date.now() });
    } catch (broadcastError) {
      if (broadcastAttempted) {
        setBroadcastUncertain(true);
        setUncertainTxid(expectedTransactionId);
        setError("");
      } else {
        setError(broadcastError instanceof Error ? broadcastError.message : "The wallet could not broadcast this transaction.");
      }
    } finally {
      walletActionInProgress.current = false;
      setBusy("");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Wallet className="h-5 w-5" /></span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Bitcoin → Ethereum trade</h2>
          <p className="mt-1 text-xs leading-5 text-muted">FinTrack fetches a fresh THORChain quote, builds a Bitcoin transaction with its deposit memo, and asks UniSat to sign it. You choose separately whether to broadcast the signed transaction.</p>
        </div>
      </div>

      {!prepared ? (
        <button type="button" onClick={prepareTrade} disabled={Boolean(busy) || Boolean(transactionId)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
          {busy === "prepare" ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparing fresh transaction…</> : <>Prepare fresh Bitcoin transaction <ArrowRight className="h-4 w-4" /></>}
        </button>
      ) : (
        <>
          <dl className="grid gap-3 rounded-xl border border-card-border bg-background p-4 text-xs sm:grid-cols-2">
            <div><dt className="text-muted">Bitcoin deposit</dt><dd className="mt-1 break-all font-mono text-foreground">{formatBaseUnits(prepared.amountIn, "BTC")} → {prepared.inboundAddress}</dd></div>
            <div><dt className="text-muted">Receive ETH at</dt><dd className="mt-1 break-all font-mono text-foreground">{prepared.destination}</dd></div>
            <div><dt className="text-muted">Pay from Bitcoin wallet</dt><dd className="mt-1 break-all font-mono text-foreground">{prepared.sourceAddress}</dd></div>
            <div><dt className="text-muted">Estimated ETH received</dt><dd className="mt-1 font-semibold text-foreground">{formatBaseUnits(prepared.amountOut, "ETH")}</dd></div>
            <div><dt className="text-muted">Minimum ETH ({(prepared.slippageLimitBps / 100).toFixed(2)}% slippage limit)</dt><dd className="mt-1 font-semibold text-foreground">{formatBaseUnits(prepared.minimumAmountOut, "ETH")}</dd></div>
            <div><dt className="text-muted">Estimated Bitcoin network fee</dt><dd className="mt-1 font-semibold text-foreground">{prepared.fee} sats</dd></div>
            <div><dt className="text-muted">THORChain memo</dt><dd className="mt-1 break-all font-mono text-foreground">{prepared.memo}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted">Quote expires</dt><dd className="mt-1 text-foreground">{new Date(prepared.expiresAt).toLocaleTimeString()}</dd></div>
          </dl>

          {broadcastUncertain && <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p role="alert" className="text-xs leading-5 text-foreground">UniSat may have broadcast this transaction, but FinTrack did not receive a matching transaction ID. Check this exact transaction before retrying: <a className="break-all font-mono underline" href={`https://mempool.space/tx/${uncertainTxid}`} target="_blank" rel="noopener noreferrer">{uncertainTxid}</a>. Retrying the same signed transaction uses the same transaction ID.</p>
            <button type="button" onClick={() => setBroadcastUncertain(false)} disabled={Boolean(busy)} className="min-h-10 w-full rounded-lg border border-card-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background disabled:opacity-60">I checked and want to retry this same signed transaction</button>
          </div>}

          {!signedPsbt ? (
            <button type="button" onClick={signTrade} disabled={Boolean(busy) || Boolean(transactionId)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "sign" ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for UniSat…</> : <>Review and sign in UniSat <ArrowRight className="h-4 w-4" /></>}
            </button>
          ) : !transactionId ? (
            <button type="button" onClick={broadcastTrade} disabled={Boolean(busy) || broadcastUncertain} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "broadcast" ? <><Loader2 className="h-4 w-4 animate-spin" /> Broadcasting…</> : <>Broadcast signed Bitcoin transaction <ArrowRight className="h-4 w-4" /></>}
            </button>
          ) : (
            <a href={`https://mempool.space/tx/${transactionId}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background">
              View Bitcoin transaction · {transactionId.slice(0, 12)}… <ExternalLink className="h-4 w-4" />
            </a>
          )}

          {signedPsbt && !transactionId && !broadcastUncertain && <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-foreground">The wallet signed this transaction, but it has not been broadcast. Check the destination, memo, amount, and fee above before selecting broadcast.</p>}
          {!transactionId && !broadcastUncertain && <button type="button" onClick={() => { setPrepared(null); setSignedPsbt(""); setError(""); setUncertainTxid(""); }} disabled={Boolean(busy)} className="w-full text-center text-xs font-medium text-muted underline underline-offset-2 hover:text-foreground disabled:opacity-50">Discard this transaction and get a fresh quote</button>}
        </>
      )}

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">{error}</p>}
      {transactionId && <p className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs leading-5 text-foreground">UniSat accepted the broadcast request and returned this transaction ID. FinTrack saved it to your trade tracker, where you can refresh Bitcoin confirmations, THORChain processing, and the final ETH payout. A returned ID does not mean the swap is complete.</p>}
      <p className="flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /> UTXO and fee data come from mempool.space. Review the transaction in UniSat. Never approve a transaction if the wallet shows a different address, amount, memo, or fee.</p>
    </section>
  );
}
