"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

const SWAP_URL = "https://swap.thorchain.org/";

export default function BitcoinTradingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-card-border bg-card p-6 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Native Bitcoin swaps
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Trade Bitcoin from your wallet</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted md:text-base">
              Request a live THORChain quote and trade BTC ↔ ETH from FinTrack with your own wallet. You review each transaction in your wallet before it is signed or sent.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/dashboard/bitcoin-quote"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                Start a trade in FinTrack
                <ArrowLeftRight className="h-4 w-4" />
              </Link>
              <a
                href={SWAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-card-border px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-background"
              >
                Open THORChain&apos;s swap site
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-3 text-xs text-muted">FinTrack never asks for your recovery phrase or private key. Mainnet trading must be enabled by the operator.</p>
          </div>

          <div className="rounded-2xl border border-card-border bg-background/70 p-5 md:p-6">
            <h2 className="text-sm font-semibold text-foreground">How a swap works</h2>
            <ol className="mt-5 space-y-5">
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary"><Wallet className="h-4 w-4" /></span>
                <div><p className="text-sm font-medium text-foreground">Connect your wallet</p><p className="mt-1 text-xs leading-5 text-muted">Choose a supported wallet and check that it is on the intended network.</p></div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary"><ArrowLeftRight className="h-4 w-4" /></span>
                <div><p className="text-sm font-medium text-foreground">Review the quote</p><p className="mt-1 text-xs leading-5 text-muted">Check the pair, amount, fees, price limit, and destination wallet before proceeding.</p></div>
              </li>
              <li className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary"><ArrowDownLeft className="h-4 w-4" /></span>
                <div><p className="text-sm font-medium text-foreground">Approve in your wallet</p><p className="mt-1 text-xs leading-5 text-muted">Your wallet signs and broadcasts the transaction. The swap result returns to your wallet.</p></div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Wallet safety</div>
          <p className="mt-3 text-sm leading-6 text-muted">Only approve a trade after checking its details in your wallet. FinTrack does not custody funds, sign transactions, or request recovery phrases.</p>
        </div>
        <div className="rounded-2xl border border-card-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ArrowUpRight className="h-4 w-4 text-primary" /> Trade status</div>
          <p className="mt-3 text-sm leading-6 text-muted">Both directions have in-app wallet flows when the operator has enabled and configured them. Save submitted transaction references and refresh their source-chain, THORChain, and destination-chain status from the Bitcoin quote page.</p>
        </div>
      </section>
    </div>
  );
}
