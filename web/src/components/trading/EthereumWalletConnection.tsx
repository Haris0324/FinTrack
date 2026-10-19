"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { Loader2, Wallet } from "lucide-react";

type Props = { onAddressChange: (address: string | null) => void };
type WalletState = "disconnected" | "connected" | "wrong-network" | "unavailable";

function readAddress(accounts: unknown): string | null {
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !isAddress(accounts[0])) return null;
  return getAddress(accounts[0]);
}

export default function EthereumWalletConnection({ onAddressChange }: Props) {
  const [address, setAddress] = useState("");
  const [walletState, setWalletState] = useState<WalletState>("disconnected");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const walletRevision = useRef(0);

  const update = useCallback((next: string | null, state: WalletState) => {
    setAddress(next || "");
    setWalletState(state);
    onAddressChange(next);
  }, [onAddressChange]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const onAccountsChanged = () => {
      const revision = ++walletRevision.current;
      void Promise.all([
        provider.request({ method: "eth_chainId" }),
        provider.request({ method: "eth_accounts" }),
      ]).then(([chainId, accounts]) => {
        if (revision !== walletRevision.current) return;
        const next = readAddress(accounts);
        if (chainId === "0x1") update(next, next ? "connected" : "disconnected");
        else update(null, "wrong-network");
      }).catch(() => {
        if (revision === walletRevision.current) update(null, "wrong-network");
      });
    };
    const onChainChanged = (chainId: unknown) => {
      const revision = ++walletRevision.current;
      if (chainId !== "0x1") {
        update(null, "wrong-network");
        setMessage("Switch your wallet to Ethereum mainnet before connecting.");
        return;
      }
      void Promise.all([
        provider.request({ method: "eth_chainId" }),
        provider.request({ method: "eth_accounts" }),
      ]).then(([currentChainId, accounts]) => {
        if (revision !== walletRevision.current) return;
        const next = readAddress(accounts);
        if (currentChainId === "0x1") update(next, next ? "connected" : "disconnected");
        else {
          update(null, "wrong-network");
          setMessage("Switch your wallet to Ethereum mainnet before connecting.");
        }
      }).catch(() => {
        if (revision === walletRevision.current) update(null, "wrong-network");
      });
    };
    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);
    return () => {
      walletRevision.current += 1;
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, [update]);

  async function connect() {
    const revision = walletRevision.current;
    setBusy(true);
    setMessage("");
    try {
      const provider = window.ethereum;
      if (!provider) {
        setWalletState("unavailable");
        setMessage("Install an EIP-1193 wallet such as MetaMask to connect Ethereum.");
        return;
      }
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const chainId = await provider.request({ method: "eth_chainId" });
      if (revision !== walletRevision.current) return;
      const next = readAddress(accounts);
      if (chainId !== "0x1") {
        update(null, "wrong-network");
        setMessage("Switch your wallet to Ethereum mainnet, then connect again.");
      } else if (!next) {
        update(null, "disconnected");
        setMessage("The wallet did not provide a valid Ethereum address.");
      } else {
        update(next, "connected");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet connection was not completed.");
    } finally {
      setBusy(false);
    }
  }

  async function switchToMainnet() {
    const provider = window.ethereum;
    if (!provider) {
      setWalletState("unavailable");
      setMessage("Install an EIP-1193 wallet such as MetaMask to connect Ethereum.");
      return;
    }
    const revision = walletRevision.current;
    setBusy(true);
    setMessage("");
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x1" }] });
      const [chainId, accounts] = await Promise.all([
        provider.request({ method: "eth_chainId" }),
        provider.request({ method: "eth_accounts" }),
      ]);
      if (revision !== walletRevision.current) return;
      const next = readAddress(accounts);
      if (chainId !== "0x1") {
        update(null, "wrong-network");
        setMessage("The wallet did not switch to Ethereum mainnet.");
      } else {
        update(next, next ? "connected" : "disconnected");
      }
    } catch (error) {
      if (revision === walletRevision.current) {
        setMessage(error instanceof Error ? error.message : "The wallet could not switch networks.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-card-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Ethereum wallet</p>
          <p className="mt-1 text-xs text-muted">
            {walletState === "connected" ? `Ethereum mainnet · ${address}` : walletState === "wrong-network" ? "Wrong network" : "Connect only when you are ready to review a transaction"}
          </p>
        </div>
        <button type="button" onClick={() => { if (walletState === "wrong-network") void switchToMainnet(); else void connect(); }} disabled={busy || walletState === "connected"} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-card-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {walletState === "connected" ? "Connected" : walletState === "wrong-network" ? "Switch to Ethereum mainnet" : "Connect Ethereum wallet"}
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-xs leading-5 text-amber-600">{message}</p>}
    </section>
  );
}
