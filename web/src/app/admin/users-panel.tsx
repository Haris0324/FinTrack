"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, MailPlus, Search, Shield, UserCheck, UserPlus, UserRoundX, Users } from "lucide-react";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  active: boolean;
  verified: boolean;
  createdAt: string;
};
type UserPage = { users: ManagedUser[]; page: number; pageSize: number; total: number; pages: number };
type StatusFilter = "all" | "active" | "disabled";

const card = "rounded-xl border border-card-border bg-card";

export default function AdminUsersPanel() {
  const [result, setResult] = useState<UserPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyUserId, setBusyUserId] = useState("");
  const [confirmingUserId, setConfirmingUserId] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), status });
      if (search) params.set("search", search);
      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load users");
      setResult(data as UserPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchDraft.trim().slice(0, 100));
  };

  const inviteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInviting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName, email: inviteEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send invitation");
      setNotice(data.message || "Invitation sent. The account will appear after it is accepted.");
      setInviteName("");
      setInviteEmail("");
      setShowInvite(false);
      setStatus("all");
      setSearch("");
      setSearchDraft("");
      setPage(1);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Could not send invitation");
    } finally {
      setInviting(false);
    }
  };

  const toggleUser = async (user: ManagedUser) => {
    setBusyUserId(user.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update account");
      setNotice(user.active ? `${user.email} was deactivated.` : `${user.email} was reactivated.`);
      setConfirmingUserId("");
      await loadUsers();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Could not update account");
    } finally {
      setBusyUserId("");
    }
  };

  const userAction = (user: ManagedUser) => {
    if (user.role === "admin" && user.active) {
      return <span title="Admin accounts are protected from deactivation here" className="inline-flex items-center gap-1.5 text-xs text-muted"><Shield className="h-4 w-4" />Protected admin</span>;
    }
    const isConfirming = confirmingUserId === user.id;
    return <div className="flex flex-wrap items-center justify-end gap-2">
      {isConfirming && <span className="text-xs text-muted">{user.active ? "Deactivate this account?" : "Reactivate this account?"}</span>}
      {isConfirming ? <>
        <button type="button" disabled={busyUserId === user.id} onClick={() => void toggleUser(user)} className="min-h-9 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">{busyUserId === user.id ? "Saving…" : "Confirm"}</button>
        <button type="button" onClick={() => setConfirmingUserId("")} className="min-h-9 rounded-lg border border-card-border px-3 py-2 text-xs text-foreground transition hover:bg-card-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Cancel</button>
      </> : <button type="button" onClick={() => setConfirmingUserId(user.id)} aria-label={`${user.active ? "Deactivate" : "Reactivate"} ${user.email}`} className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${user.active ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"}`}>
        {user.active ? <><UserRoundX className="h-4 w-4" />Deactivate</> : <><UserCheck className="h-4 w-4" />Reactivate</>}
      </button>}
    </div>;
  };

  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="admin-users-heading">
      <div className="flex flex-col gap-4 border-b border-card-border p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Users className="h-5 w-5" /></div>
          <div><h2 id="admin-users-heading" className="font-semibold text-foreground">User management</h2><p className="mt-1 text-xs text-muted">Invite users, search accounts, and disable access while preserving their data.</p></div>
        </div>
        <button type="button" onClick={() => { setShowInvite(value => !value); setNotice(""); setError(""); }} aria-expanded={showInvite} aria-controls="admin-user-invite-form" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto">
          <UserPlus className="h-4 w-4" />{showInvite ? "Close invite form" : "Invite user"}
        </button>
      </div>

      {showInvite && <form id="admin-user-invite-form" onSubmit={inviteUser} className="grid grid-cols-1 gap-3 border-b border-card-border bg-background/40 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="text-xs text-muted">Full name
          <input required minLength={2} maxLength={80} autoComplete="name" value={inviteName} onChange={event => setInviteName(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
        </label>
        <label className="text-xs text-muted">Email address
          <input required type="email" maxLength={254} autoComplete="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
        </label>
        <button type="submit" disabled={inviting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
          {inviting ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : <><MailPlus className="h-4 w-4" />Send setup link</>}
        </button>
        <p className="text-xs leading-5 text-muted sm:col-span-2 lg:col-span-3">The invitee chooses their own password from a one-time link. New invitations create standard user accounts, never admins.</p>
      </form>}

      {notice && <p role="status" className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300 sm:mx-5"><Check className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
      {error && <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 sm:mx-5">{error}</p>}

      <div className="flex flex-col gap-3 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <form onSubmit={submitSearch} className="flex w-full gap-2 xl:max-w-md">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search users by name or email</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} maxLength={100} placeholder="Search name or email" className="min-h-10 w-full rounded-lg border border-card-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <button type="submit" className="min-h-10 rounded-lg border border-card-border px-4 py-2 text-sm text-foreground transition hover:bg-card-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Search</button>
        </form>
        <div className="grid grid-cols-3 gap-2" aria-label="Filter users by status">
          {(["all", "active", "disabled"] as const).map(filter => <button key={filter} type="button" aria-pressed={status === filter} onClick={() => { setStatus(filter); setPage(1); }} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${status === filter ? "border-primary bg-primary/10 text-primary" : "border-card-border text-muted hover:bg-card-border hover:text-foreground"}`}>{filter}</button>)}
        </div>
      </div>

      {loading && !result ? <div className="flex min-h-40 items-center justify-center text-sm text-muted"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading users…</div> : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-background/50 text-xs text-muted"><tr className="border-y border-card-border"><th scope="col" className="px-5 py-3 font-medium">User</th><th scope="col" className="px-5 py-3 font-medium">Role</th><th scope="col" className="px-5 py-3 font-medium">Status</th><th scope="col" className="px-5 py-3 font-medium">Joined</th><th scope="col" className="px-5 py-3 text-right font-medium">Access</th></tr></thead>
              <tbody className="divide-y divide-card-border">
                {(result?.users || []).map(user => <tr key={user.id} className="align-middle">
                  <td className="max-w-[280px] px-5 py-4"><p className="truncate font-medium text-foreground">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs capitalize ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-card-border text-muted"}`}>{user.role}</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 text-xs ${user.active ? "text-emerald-400" : "text-muted"}`}><span className={`h-1.5 w-1.5 rounded-full ${user.active ? "bg-emerald-400" : "bg-slate-500"}`} />{user.active ? user.verified ? "Active · verified" : "Active · unverified" : "Disabled"}</span></td>
                  <td className="whitespace-nowrap px-5 py-4 text-xs text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4">{userAction(user)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 p-4 sm:hidden">
            {(result?.users || []).map(user => <article key={user.id} className="rounded-xl border border-card-border bg-background p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground">{user.name}</h3><p className="mt-1 break-all text-xs text-muted">{user.email}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] capitalize ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-card-border text-muted"}`}>{user.role}</span></div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{user.active ? user.verified ? "Active · verified" : "Active · unverified" : "Disabled"}</span><span>Joined {new Date(user.createdAt).toLocaleDateString()}</span></div>
              <div className="mt-3 flex justify-end">{userAction(user)}</div>
            </article>)}
          </div>
          {!loading && result?.users.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">No accounts match these filters.</p>}
          {loading && result && <p role="status" className="px-5 py-2 text-xs text-muted">Updating list…</p>}
          <div className="flex flex-col gap-3 border-t border-card-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted">{result?.total ?? 0} account{result?.total === 1 ? "" : "s"} · Page {result?.page ?? 1} of {result?.pages ?? 1}</p>
            <div className="flex gap-2">
              <button type="button" disabled={!result || result.page <= 1 || loading} onClick={() => setPage(current => Math.max(1, current - 1))} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-card-border px-3 py-2 text-sm text-foreground transition hover:bg-card-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"><ChevronLeft className="h-4 w-4" />Previous</button>
              <button type="button" disabled={!result || result.page >= result.pages || loading} onClick={() => setPage(current => current + 1)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-lg border border-card-border px-3 py-2 text-sm text-foreground transition hover:bg-card-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">Next<ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
