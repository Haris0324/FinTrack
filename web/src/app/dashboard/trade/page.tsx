"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ExternalLink, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

const SWAP_URL = "https://swap.thorchain.org/";

export default function BitcoinTradingPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-5 md:flex md:items-center md:justify-between md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg shadow-primary/20">
            <ArrowLeftRight className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">FinTrack</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground md:text-2xl">Bitcoin Trading</h1>
            <p className="mt-1 text-sm text-muted">Self-custody swaps between Bitcoin and Ethereum</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-2 md:mt-0 md:justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Wallet-controlled
          </span>
          <Link
            href="/dashboard/bitcoin-quote"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            Open trading workspace
            <ArrowLeftRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl border border-card-border bg-card p-6 md:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-500">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Native Bitcoin swaps
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Trade Bitcoin from your wallet</h2>
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

      <footer className="overflow-hidden rounded-2xl border border-card-border bg-card">
        <div className="grid gap-6 p-5 md:grid-cols-[1.2fr_0.8fr_1fr] md:p-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">F</span>
              FinTrack Bitcoin Trading
            </div>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">A wallet-controlled interface for reviewing Bitcoin and Ethereum swaps. FinTrack never holds your keys or funds.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Quick links</h2>
            <div className="mt-3 flex flex-col items-start gap-2 text-sm">
              <Link href="/dashboard/trade" className="text-muted transition hover:text-primary">Trading overview</Link>
              <Link href="/dashboard/bitcoin-quote" className="text-muted transition hover:text-primary">Quote workspace</Link>
              <a href={SWAP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-muted transition hover:text-primary">
                THORChain <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Before you trade</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Confirm the network, amount, destination, minimum receive, and fees in your wallet. Trading availability depends on operator configuration.</p>
          </div>
        </div>
        <div className="border-t border-card-border px-5 py-3 text-xs text-muted md:px-6">
          FinTrack · Wallet-controlled trading · Review every transaction before approval
        </div>
      </footer>
    </div>
  );
}
