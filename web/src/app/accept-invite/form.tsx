"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { validatePassword } from "@/lib/validation";

export default function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const validation = validatePassword(password);
    if (!validation.isValid) return setError(validation.message || "Choose a stronger password.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!token) return setError("This invitation link is invalid or expired.");

    setLoading(true);
    try {
      const response = await fetch("/api/admin/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not accept this invitation");
      router.replace("/signin?invited=1");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not accept this invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div>
      <h1 className="text-2xl font-bold text-foreground">Set up your account</h1>
      <p className="mt-2 text-sm leading-6 text-muted">Choose a password to finish accepting your FinTrack invitation.</p>
      {!token ? <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">This invitation link is invalid or expired.</p> : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm text-foreground">Password
            <input type="password" autoComplete="new-password" required maxLength={256} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-card-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm text-foreground">Confirm password
            <input type="password" autoComplete="new-password" required maxLength={256} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-card-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <p className="text-xs leading-5 text-muted">Use at least 8 characters with uppercase and lowercase letters, a number, and a symbol.</p>
          {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</> : <><CheckCircle2 className="h-4 w-4" />Accept invitation</>}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted"><Link href="/signin" className="font-medium text-primary hover:underline">Back to sign in</Link></p>
    </section>
  );
}
