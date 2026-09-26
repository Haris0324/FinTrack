"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Settings, Lock, Shield, Eye, EyeOff, CheckCircle2, AlertTriangle, User, Mail, Key } from "lucide-react";
import AdminTabNav from "@/components/admin/AdminTabNav";

export default function AdminSettings() {
  const { data: session } = useSession();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd]         = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Password strength checks
  const hasLength = newPwd.length >= 8;
  const hasUpper  = /[A-Z]/.test(newPwd);
  const hasLower  = /[a-z]/.test(newPwd);
  const hasNumber = /[0-9]/.test(newPwd);
  const hasSpecial = /[!@#$%^&*]/.test(newPwd);
  const passwordsMatch = newPwd === confirmPwd && confirmPwd.length > 0;
  const isStrong = hasLength && hasUpper && hasLower && hasNumber;

  const handleChangePassword = async () => {
    if (!currentPwd) return showToast("Enter your current password", "error");
    if (!isStrong)   return showToast("Password doesn't meet strength requirements", "error");
    if (!passwordsMatch) return showToast("Passwords don't match", "error");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("✓ Password changed successfully!", "success");
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        showToast(data.error || "Failed to change password", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav />

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Admin Settings</h2>
        <p className="text-sm text-muted">Manage your admin account security and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info Card */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Account Information</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-card-border">
              <User className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Name</p>
                <p className="text-sm font-medium text-foreground">{session?.user?.name || "Admin"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-card-border">
              <Mail className="w-4 h-4 text-muted" />
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Email</p>
                <p className="text-sm font-medium text-foreground">{session?.user?.email || "admin@fintrack.com"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border border-card-border">
              <Shield className="w-4 h-4 text-primary" />
              <div>
                <p className="text-[10px] text-muted uppercase tracking-wider">Role</p>
                <p className="text-sm font-bold text-primary">ADMINISTRATOR</p>
              </div>
            </div>
          </div>

          {/* Default Credentials Info */}
          <div className="mt-6 p-4 rounded-lg bg-orange-500/5 border border-orange-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-orange-400 mb-1">Default Credentials</p>
                <p className="text-[11px] text-muted leading-relaxed">
                  Default admin login: <code className="text-foreground bg-card-border px-1 rounded">admin@fintrack.com</code> / <code className="text-foreground bg-card-border px-1 rounded">Admin@123</code>
                </p>
                <p className="text-[10px] text-muted mt-1">
                  Please change this password immediately using the form on the right →
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-danger" />
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
          </div>

          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Current Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full pl-10 pr-10 py-2.5 bg-background border border-card-border rounded-lg text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-10 py-2.5 bg-background border border-card-border rounded-lg text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-card-border rounded-lg text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary transition-colors"
                />
                {confirmPwd && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <AlertTriangle className="w-4 h-4 text-danger" />}
                  </div>
                )}
              </div>
            </div>

            {/* Strength Indicator */}
            {newPwd && (
              <div className="p-3 rounded-lg bg-background border border-card-border space-y-2">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Password Strength</p>
                {[
                  { check: hasLength,  label: "At least 8 characters" },
                  { check: hasUpper,   label: "Contains uppercase letter" },
                  { check: hasLower,   label: "Contains lowercase letter" },
                  { check: hasNumber,  label: "Contains a number" },
                  { check: hasSpecial, label: "Contains special character (!@#$%)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.check
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      : <div className="w-3.5 h-3.5 rounded-full border border-card-border" />}
                    <span className={`text-[11px] ${item.check ? "text-success" : "text-muted"}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleChangePassword}
              disabled={saving || !isStrong || !passwordsMatch || !currentPwd}
              className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              <Lock className="w-4 h-4" />
              {saving ? "Changing Password..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="p-5 rounded-xl bg-card border border-card-border">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-success" />
          <h3 className="text-sm font-semibold text-foreground">Security Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Change Default Password", desc: "If using admin@fintrack.com, change the default password immediately", done: false },
            { title: "Use Strong Passwords", desc: "Mix uppercase, lowercase, numbers, and special characters", done: true },
            { title: "Regular Password Rotation", desc: "Change your admin password every 30-90 days", done: false },
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-card-border">
              {tip.done
                ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                <p className="text-[10px] text-muted mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm border ${
          toast.type === "success"
            ? "bg-card border-success/30 text-success"
            : "bg-card border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
