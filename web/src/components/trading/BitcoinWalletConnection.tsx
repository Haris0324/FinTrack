"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Wallet } from "lucide-react";
import { isBitcoinMainnetChain } from "@/lib/bitcoin-wallet-network";

type Props = {
  onAddressChange: (address: string | null) => void;
};

type WalletState = "disconnected" | "connected" | "wrong-network" | "unavailable";

async function isBitcoinMainnet(provider: UniSatProvider): Promise<boolean> {
  if (provider.getChain) {
    const chain = await provider.getChain();
    return isBitcoinMainnetChain(chain);
  }
  if (provider.getNetwork) return (await provider.getNetwork()) === "livenet";
  return false;
}

export default function BitcoinWalletConnection({ onAddressChange }: Props) {
  const [walletState, setWalletState] = useState<WalletState>("disconnected");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const walletRevision = useRef(0);

  const setConnectedAddress = useCallback((nextAddress: string | null) => {
    setAddress(nextAddress || "");
    onAddressChange(nextAddress);
  }, [onAddressChange]);

  useEffect(() => {
    if (!window.unisat) {
      return;
    }

    const provider = window.unisat;
    const onAccountsChanged = () => {
      const revision = ++walletRevision.current;
      void Promise.all([provider.getAccounts(), isBitcoinMainnet(provider)]).then(([accounts, isMainnet]) => {
        if (revision !== walletRevision.current) return;
        const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
        if (isMainnet && next) {
          setConnectedAddress(next);
          setWalletState("connected");
        } else if (isMainnet) {
          setConnectedAddress(null);
          setWalletState("disconnected");
        } else {
          setConnectedAddress(null);
          setWalletState("wrong-network");
          setMessage("Switch UniSat to Bitcoin mainnet, then reconnect.");
        }
      }).catch(() => {
        if (revision === walletRevision.current) {
          setConnectedAddress(null);
          setWalletState("wrong-network");
        }
      });
    };
    const onNetworkChanged = () => {
      const revision = ++walletRevision.current;
      void Promise.all([provider.getAccounts(), isBitcoinMainnet(provider)]).then(([accounts, isMainnet]) => {
        if (revision !== walletRevision.current) return;
        const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
        if (isMainnet && next) {
          setConnectedAddress(next);
          setWalletState("connected");
        } else if (isMainnet) {
          setConnectedAddress(null);
          setWalletState("disconnected");
        } else {
          setConnectedAddress(null);
          setWalletState("wrong-network");
          setMessage("Switch UniSat to Bitcoin mainnet, then reconnect.");
        }
      }).catch(() => {
        if (revision === walletRevision.current) {
          setConnectedAddress(null);
          setWalletState("wrong-network");
        }
      });
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("networkChanged", onNetworkChanged);
    return () => {
      walletRevision.current += 1;
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("networkChanged", onNetworkChanged);
    };
  }, [setConnectedAddress]);

  async function connectWallet() {
    const revision = walletRevision.current;
    setMessage("");
    const provider = window.unisat;
    if (!provider) {
      setWalletState("unavailable");
      setMessage("Install UniSat Wallet, then reload this page to connect.");
      return;
    }

    setBusy(true);
    try {
      const accounts = await provider.requestAccounts();
      if (revision !== walletRevision.current) return;
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || accounts[0].length === 0) {
        throw new Error("The wallet did not return a Bitcoin address.");
      }
      const onMainnet = await isBitcoinMainnet(provider);
      if (revision !== walletRevision.current) return;
      if (!onMainnet) {
        setConnectedAddress(null);
        setWalletState("wrong-network");
        setMessage("Switch UniSat to Bitcoin mainnet, then connect again.");
        return;
      }
      setConnectedAddress(accounts[0]);
      setWalletState("connected");
    } catch (error) {
      if (revision === walletRevision.current) {
        setConnectedAddress(null);
        setWalletState("disconnected");
        setMessage(error instanceof Error ? error.message : "Wallet connection was not completed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function switchToMainnet() {
    const provider = window.unisat;
    if (!provider) {
      setWalletState("unavailable");
      setMessage("Install UniSat Wallet, then reload this page to connect.");
      return;
    }
    const revision = walletRevision.current;
    setBusy(true);
    setMessage("");
    try {
      if (provider.switchChain) await provider.switchChain("BITCOIN_MAINNET");
      else if (provider.switchNetwork) await provider.switchNetwork("livenet");
      else throw new Error("This UniSat version cannot switch networks from FinTrack. Switch to Bitcoin mainnet in UniSat, then reconnect.");
      const [accounts, isMainnet] = await Promise.all([provider.getAccounts(), isBitcoinMainnet(provider)]);
      if (revision !== walletRevision.current) return;
      const next = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null;
      if (!isMainnet) {
        setConnectedAddress(null);
        setWalletState("wrong-network");
        setMessage("UniSat did not switch to Bitcoin mainnet.");
      } else if (next) {
        setConnectedAddress(next);
        setWalletState("connected");
      } else {
        setConnectedAddress(null);
        setWalletState("disconnected");
      }
    } catch (error) {
      if (revision === walletRevision.current) {
        setMessage(error instanceof Error ? error.message : "UniSat could not switch networks.");
      }
    } finally {
      setBusy(false);
    }
  }

  const shortAddress = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "";

  return (
    <section className="rounded-2xl border border-card-border bg-card p-5" aria-live="polite">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Wallet className="h-5 w-5" /></span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Bitcoin wallet</h2>
            {walletState === "connected" ? (
              <p className="mt-1 text-xs text-muted">Connected to UniSat · Bitcoin mainnet · <span title={address}>{shortAddress}</span></p>
            ) : walletState === "wrong-network" ? (
              <p className="mt-1 text-xs text-amber-600">Wrong network. Bitcoin mainnet is required.</p>
            ) : walletState === "unavailable" ? (
              <p className="mt-1 text-xs text-muted">UniSat Wallet was not detected in this browser.</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Connect to use your public Bitcoin address in the quote form.</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => { if (walletState === "wrong-network") void switchToMainnet(); else void connectWallet(); }}
          disabled={busy || walletState === "connected"}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-card-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</> : walletState === "connected" ? "Wallet connected" : walletState === "wrong-network" ? "Switch to Bitcoin mainnet" : "Connect UniSat"}
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-xs text-amber-600">{message}</p>}
      {walletState === "unavailable" && (
        <a href="https://unisat.io/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Get UniSat Wallet <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <p className="mt-3 text-xs leading-5 text-muted">Connecting reads your public address only. FinTrack does not receive keys or request a signature here. The address is sent to THORChain only when you submit a quote.</p>
    </section>
  );
}
