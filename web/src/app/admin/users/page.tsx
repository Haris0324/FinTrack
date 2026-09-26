"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Users, Search, ChevronLeft, ChevronRight, Shield, AlertTriangle, X, Check } from "lucide-react";
import AdminTabNav from "@/components/admin/AdminTabNav";

function timeAgo(date: string | Date | null) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ConfirmAction = { userId: string; userName: string; action: "setRole" | "ban" | "unban"; value?: string } | null;

export default function UsersPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id || "";

  const [users, setUsers]     = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState("");
  const [role,   setRole]   = useState("");
  const [verified, setVerified] = useState("");

  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [acting, setActing]   = useState(false);
  const [toast, setToast]     = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10", search, role, verified });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, verified]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: confirm.userId, action: confirm.action, value: confirm.value }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast(`Error: ${d.error}`);
      } else {
        showToast(`✓ ${confirm.userName} updated successfully`);
        fetchUsers();
      }
    } catch {
      showToast("Action failed. Please try again.");
    } finally {
      setActing(false);
      setConfirm(null);
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">User Management</h2>
            <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
              {total} users
            </span>
          </div>
          <p className="text-sm text-muted">Manage user roles, access, and account status</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-card-border rounded-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-card border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select
          value={verified}
          onChange={e => { setVerified(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-card border border-card-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
        >
          <option value="">All Verified</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-card border border-card-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-6 py-4 text-xs font-medium text-muted">User</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Role</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Provider</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Verified</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Joined</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Last Login</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-card-border rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-danger text-sm">{error}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-muted text-sm">No users found</td></tr>
              ) : (
                users.map((user: any) => {
                  const isMe = user._id === myId;
                  return (
                    <tr key={user._id} className="hover:bg-card-border/20 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "U")}&background=random&size=32`}
                            alt={user.name}
                            className="w-8 h-8 rounded-full object-cover border border-card-border"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-foreground">{user.name}</p>
                              {isMe && <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded">You</span>}
                              {user.isBanned && <span className="text-[9px] font-bold bg-danger/10 text-danger px-1.5 py-0.5 rounded">Banned</span>}
                            </div>
                            <p className="text-[10px] text-muted">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                          user.role === "admin" ? "bg-primary/10 text-primary" : "bg-card-border text-muted"
                        }`}>
                          {user.role?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {(user.providers || ["credentials"]).map((p: string) => (
                            <span key={p} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              p === "google" ? "bg-blue-500/10 text-blue-400" :
                              p === "github" ? "bg-gray-500/10 text-gray-300" :
                              "bg-card-border text-muted"
                            }`}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {user.isVerified
                          ? <Check className="w-4 h-4 text-success mx-auto" />
                          : <X className="w-4 h-4 text-muted mx-auto" />}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-3 text-xs text-muted">{timeAgo(user.lastLoginAt)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isMe && (
                            <>
                              <button
                                onClick={() => setConfirm({ userId: user._id, userName: user.name, action: "setRole", value: user.role === "admin" ? "user" : "admin" })}
                                className="px-2.5 py-1 text-[10px] font-semibold rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors whitespace-nowrap"
                              >
                                {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                              </button>
                              <button
                                onClick={() => setConfirm({ userId: user._id, userName: user.name, action: user.isBanned ? "unban" : "ban" })}
                                className={`px-2.5 py-1 text-[10px] font-semibold rounded border transition-colors whitespace-nowrap ${
                                  user.isBanned
                                    ? "bg-success/10 text-success border-success/20 hover:bg-success hover:text-white"
                                    : "bg-danger/10 text-danger border-danger/20 hover:bg-danger hover:text-white"
                                }`}
                              >
                                {user.isBanned ? "Unban" : "Ban"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-card-border">
            <p className="text-xs text-muted">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-card border border-card-border text-muted hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-card-border rounded-xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-foreground">Confirm Action</h3>
            </div>
            <p className="text-sm text-muted mb-6">
              {confirm.action === "setRole"
                ? `Change <strong>${confirm.userName}</strong>'s role to <strong>${confirm.value?.toUpperCase()}</strong>?`
                : confirm.action === "ban"
                ? `Ban user <strong>${confirm.userName}</strong>? They will lose access immediately.`
                : `Unban user <strong>${confirm.userName}</strong>? They will regain access.`}
            </p>
            <p className="text-xs text-muted mb-6 p-3 bg-background rounded-lg border border-card-border">
              {confirm.action === "setRole" && "Role changes take effect on the user's next login."}
              {confirm.action === "ban" && "Banned users are redirected away from the app on login."}
              {confirm.action === "unban" && "The user's access will be restored immediately."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2 text-sm font-medium text-muted border border-card-border rounded-lg hover:bg-card-border/50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={acting}
                className={`flex-1 py-2 text-sm font-bold rounded-lg text-white transition-colors ${
                  confirm.action === "ban" ? "bg-danger hover:bg-danger/80" : "bg-primary hover:bg-primary/80"
                } disabled:opacity-50`}
              >
                {acting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-card border border-card-border rounded-xl shadow-2xl text-sm text-foreground animate-pulse">
          {toast}
        </div>
      )}
    </div>
  );
}
