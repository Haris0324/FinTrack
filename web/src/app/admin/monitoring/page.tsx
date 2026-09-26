"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Server,
  Brain,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  Info,
} from "lucide-react";
import AdminTabNav from "@/components/admin/AdminTabNav";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ServiceStatus {
  online: boolean;
  latencyMs: number;
  domain?: string;
  url?: string;
  loaded?: boolean;
}

interface MonitoringData {
  services: {
    pipeline: ServiceStatus;
    nlp: ServiceStatus;
    mongodb: { online: boolean };
    xgboost: { loaded: boolean };
  };
  metrics: {
    unprocessedArticles: number;
    articlesOlderThan48h: number;
    totalNewsToday: number;
    newUsersToday: number;
  };
  errorLogs: LogEntry[];
  warningLogs: LogEntry[];
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  pipelineStats: {
    totalScraped: number;
    totalNlpAnalyzed: number;
    totalEntitiesExtracted: number;
    lastUpdated: string | null;
  };
  security: {
    nextAuthSecretConfigured: boolean;
    adminCount: number;
    failedLogins24h: number;
    activeSessions: number;
    totalUsers: number;
  };
  timestamp: string;
}

interface LogEntry {
  _id: string;
  level: "ERROR" | "WARNING";
  user: string;
  action: string;
  ip: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmt(n: number): string {
  return n >= 1_000_000
    ? (n / 1_000_000).toFixed(1) + "M"
    : n >= 1_000
    ? (n / 1_000).toFixed(1) + "K"
    : String(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function OnlineBadge({ online }: { online: boolean }) {
  return online ? (
    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">
      Online
    </span>
  ) : (
    <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-sm">
      Offline
    </span>
  );
}

function LoadedBadge({ loaded }: { loaded: boolean }) {
  return loaded ? (
    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">
      Loaded
    </span>
  ) : (
    <span className="text-[10px] font-bold text-muted bg-card-border px-2 py-0.5 rounded-sm">
      Not Found
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-card-border ${className}`} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  useSession(); // ensure session is available in middleware

  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logTab, setLogTab] = useState<"errors" | "warnings">("errors");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MonitoringData = await res.json();
      setData(json);
      setLastRefreshed(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to fetch monitoring data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Sentiment calc ─────────────────────────────────────────────────────────
  const sentTotal = data
    ? data.sentimentBreakdown.positive +
      data.sentimentBreakdown.negative +
      data.sentimentBreakdown.neutral
    : 0;
  const sentPct = (n: number) =>
    sentTotal > 0 ? Math.round((n / sentTotal) * 100) : 0;

  const activeLogs =
    logTab === "errors" ? data?.errorLogs ?? [] : data?.warningLogs ?? [];

  // ── Security items ─────────────────────────────────────────────────────────
  const securityItems = data
    ? [
        {
          label: "Session Security",
          detail: data.security.nextAuthSecretConfigured
            ? "NEXTAUTH_SECRET — Configured"
            : "NEXTAUTH_SECRET — Missing",
          ok: data.security.nextAuthSecretConfigured,
        },
        {
          label: "Admin Access",
          detail: `${data.security.adminCount} admin user${data.security.adminCount !== 1 ? "s" : ""} of ${data.security.totalUsers} total`,
          ok: data.security.adminCount > 0,
        },
        {
          label: "Failed Logins (24h)",
          detail:
            data.security.failedLogins24h === 0
              ? "No failed login attempts"
              : `${data.security.failedLogins24h} failed attempt${data.security.failedLogins24h !== 1 ? "s" : ""}`,
          ok: data.security.failedLogins24h < 5,
        },
        {
          label: "Active Sessions",
          detail: `${data.security.activeSessions} session${data.security.activeSessions !== 1 ? "s" : ""} in last 24h`,
          ok: true,
        },
      ]
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* ── Tab Nav ── */}
      <AdminTabNav />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-foreground">
              System Monitoring
            </h2>
            {/* Live badge */}
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20 text-[10px] font-bold text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <p className="text-sm text-muted">
            {lastRefreshed ? (
              <>
                Last refreshed:{" "}
                <span className="text-foreground font-medium">
                  {lastRefreshed.toLocaleTimeString()}
                </span>
              </>
            ) : (
              "Fetching data…"
            )}
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/50 rounded-lg hover:bg-primary hover:text-white transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SERVICE HEALTH ROW
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Data Pipeline */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted">Data Pipeline</p>
            </div>
            {loading ? (
              <Skeleton className="w-12 h-4" />
            ) : (
              <OnlineBadge online={data?.services.pipeline.online ?? false} />
            )}
          </div>
          {loading ? (
            <Skeleton className="w-3/4 h-3 mt-2" />
          ) : (
            <>
              <p className="text-xs text-muted truncate">
                {data?.services.pipeline.domain}
              </p>
              {data?.services.pipeline.latencyMs !== undefined && (
                <p className="text-xs text-muted mt-1">
                  Latency:{" "}
                  <span className="text-foreground font-medium">
                    {data.services.pipeline.latencyMs}ms
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        {/* NLP Inference API */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-fuchsia-500" />
              <p className="text-xs font-medium text-muted">NLP Inference API</p>
            </div>
            {loading ? (
              <Skeleton className="w-12 h-4" />
            ) : (
              <OnlineBadge online={data?.services.nlp.online ?? false} />
            )}
          </div>
          {loading ? (
            <Skeleton className="w-3/4 h-3 mt-2" />
          ) : (
            <>
              <p className="text-xs text-muted">localhost:8000</p>
              {data?.services.nlp.latencyMs !== undefined && (
                <p className="text-xs text-muted mt-1">
                  Latency:{" "}
                  <span className="text-foreground font-medium">
                    {data.services.nlp.latencyMs}ms
                  </span>
                </p>
              )}
            </>
          )}
        </div>

        {/* MongoDB Atlas */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-success" />
              <p className="text-xs font-medium text-muted">MongoDB Atlas</p>
            </div>
            {loading ? (
              <Skeleton className="w-12 h-4" />
            ) : (
              <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">
                Online
              </span>
            )}
          </div>
          {loading ? (
            <Skeleton className="w-3/4 h-3 mt-2" />
          ) : (
            <p className="text-xs text-muted">Connection established</p>
          )}
        </div>

        {/* XGBoost Engine */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-medium text-muted">XGBoost Engine</p>
            </div>
            {loading ? (
              <Skeleton className="w-12 h-4" />
            ) : (
              <LoadedBadge loaded={data?.services.xgboost.loaded ?? false} />
            )}
          </div>
          {loading ? (
            <Skeleton className="w-3/4 h-3 mt-2" />
          ) : (
            <p className="text-xs text-muted">
              {data?.services.xgboost.loaded
                ? "Model ready for inference"
                : "XGBOOST_MODEL_PATH not set"}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          KEY METRICS ROW
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Unprocessed Articles */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted">Unprocessed Articles</p>
            {loading ? (
              <Skeleton className="w-10 h-4" />
            ) : (data?.metrics.unprocessedArticles ?? 0) > 0 ? (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-sm">
                Pending
              </span>
            ) : null}
          </div>
          {loading ? (
            <Skeleton className="w-16 h-7 mt-1" />
          ) : (
            <p
              className={`text-2xl font-bold ${
                (data?.metrics.unprocessedArticles ?? 0) > 0
                  ? "text-yellow-400"
                  : "text-foreground"
              }`}
            >
              {fmt(data?.metrics.unprocessedArticles ?? 0)}
            </p>
          )}
        </div>

        {/* Articles > 48h */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted">Articles &gt; 48h Old</p>
            {loading ? (
              <Skeleton className="w-10 h-4" />
            ) : (data?.metrics.articlesOlderThan48h ?? 0) > 0 ? (
              <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-sm">
                Stale
              </span>
            ) : null}
          </div>
          {loading ? (
            <Skeleton className="w-16 h-7 mt-1" />
          ) : (
            <p
              className={`text-2xl font-bold ${
                (data?.metrics.articlesOlderThan48h ?? 0) > 0
                  ? "text-orange-500"
                  : "text-foreground"
              }`}
            >
              {fmt(data?.metrics.articlesOlderThan48h ?? 0)}
            </p>
          )}
        </div>

        {/* Total News Today */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <p className="text-xs font-medium text-muted mb-2">Total News Today</p>
          {loading ? (
            <Skeleton className="w-16 h-7 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-primary">
              {fmt(data?.metrics.totalNewsToday ?? 0)}
            </p>
          )}
        </div>

        {/* New Users Today */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <p className="text-xs font-medium text-muted mb-2">New Users Today</p>
          {loading ? (
            <Skeleton className="w-16 h-7 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground">
              {fmt(data?.metrics.newUsersToday ?? 0)}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ERROR & WARNING LOGS TABLE
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl bg-card border border-card-border overflow-hidden">
        {/* Header + tabs */}
        <div className="flex items-center justify-between p-4 border-b border-card-border">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-medium text-foreground">
              Error &amp; Warning Logs
            </h3>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0B0F19] border border-card-border">
            <button
              onClick={() => setLogTab("errors")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                logTab === "errors"
                  ? "bg-danger/20 text-danger"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Errors
              {(data?.errorLogs.length ?? 0) > 0 && (
                <span className="ml-1.5 text-[10px] font-bold text-danger bg-danger/20 px-1.5 py-0.5 rounded">
                  {data!.errorLogs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setLogTab("warnings")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                logTab === "warnings"
                  ? "bg-orange-500/20 text-orange-500"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Warnings
              {(data?.warningLogs.length ?? 0) > 0 && (
                <span className="ml-1.5 text-[10px] font-bold text-orange-500 bg-orange-500/20 px-1.5 py-0.5 rounded">
                  {data!.warningLogs.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-full h-8" />
            ))}
          </div>
        ) : activeLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <p className="text-sm text-muted">
              {logTab === "errors"
                ? "No errors in recent logs"
                : "No warnings in recent logs"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="px-6 py-4 text-xs font-medium text-muted">Level</th>
                  <th className="px-6 py-4 text-xs font-medium text-muted">User</th>
                  <th className="px-6 py-4 text-xs font-medium text-muted">Action / Message</th>
                  <th className="px-6 py-4 text-xs font-medium text-muted">IP</th>
                  <th className="px-6 py-4 text-xs font-medium text-muted text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {activeLogs.slice(0, 50).map((log) => (
                  <tr
                    key={log._id}
                    className="hover:bg-card-border/20 transition-colors"
                  >
                    <td className="px-6 py-3">
                      {log.level === "ERROR" ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/20 text-danger">
                          ERROR
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">
                          WARNING
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                      {log.user}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted max-w-[320px] truncate">
                      {log.action}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted font-mono whitespace-nowrap">
                      {log.ip}
                    </td>
                    <td className="px-6 py-3 text-xs text-muted text-right whitespace-nowrap">
                      {timeAgo(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SENTIMENT + PIPELINE STATS
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Breakdown — 1/3 width */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Sentiment Breakdown
            </h3>
            <span className="text-[10px] text-muted ml-auto">Last 24h</span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="w-full h-6" />
              ))}
            </div>
          ) : sentTotal === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted">No sentiment data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Positive */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted font-medium">POSITIVE</span>
                  <span className="text-success font-bold">
                    {sentPct(data!.sentimentBreakdown.positive)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-card-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success transition-all duration-700"
                    style={{
                      width: `${sentPct(data!.sentimentBreakdown.positive)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {fmt(data!.sentimentBreakdown.positive)} articles
                </p>
              </div>

              {/* Negative */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted font-medium">NEGATIVE</span>
                  <span className="text-danger font-bold">
                    {sentPct(data!.sentimentBreakdown.negative)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-card-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-danger transition-all duration-700"
                    style={{
                      width: `${sentPct(data!.sentimentBreakdown.negative)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {fmt(data!.sentimentBreakdown.negative)} articles
                </p>
              </div>

              {/* Neutral */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted font-medium">NEUTRAL</span>
                  <span className="text-muted font-bold">
                    {sentPct(data!.sentimentBreakdown.neutral)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-card-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-muted transition-all duration-700"
                    style={{
                      width: `${sentPct(data!.sentimentBreakdown.neutral)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted mt-1">
                  {fmt(data!.sentimentBreakdown.neutral)} articles
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Stats — 2/3 width */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                Pipeline Statistics
              </h3>
            </div>
            {data?.pipelineStats.lastUpdated && (
              <p className="text-[10px] text-muted">
                Updated {timeAgo(data.pipelineStats.lastUpdated)}
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Scraped */}
              <div className="p-4 rounded-lg bg-[#0B0F19] border border-card-border text-center">
                <p className="text-2xl font-bold text-foreground mb-1">
                  {fmt(data?.pipelineStats.totalScraped ?? 0)}
                </p>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Total Articles Scraped
                </p>
              </div>

              {/* NLP Analyzed */}
              <div className="p-4 rounded-lg bg-[#0B0F19] border border-card-border text-center">
                <p className="text-2xl font-bold text-fuchsia-400 mb-1">
                  {fmt(data?.pipelineStats.totalNlpAnalyzed ?? 0)}
                </p>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Total NLP Analyzed
                </p>
              </div>

              {/* Entities */}
              <div className="p-4 rounded-lg bg-[#0B0F19] border border-card-border text-center">
                <p className="text-2xl font-bold text-success mb-1">
                  {fmt(data?.pipelineStats.totalEntitiesExtracted ?? 0)}
                </p>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                  Total Entities Extracted
                </p>
              </div>
            </div>
          )}

          {/* Mini coverage bar */}
          {!loading && (data?.pipelineStats.totalScraped ?? 0) > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted">NLP Coverage</span>
                <span className="text-foreground font-medium">
                  {Math.round(
                    ((data?.pipelineStats.totalNlpAnalyzed ?? 0) /
                      (data?.pipelineStats.totalScraped || 1)) *
                      100
                  )}
                  %
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-card-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500 transition-all duration-700"
                  style={{
                    width: `${Math.round(
                      ((data?.pipelineStats.totalNlpAnalyzed ?? 0) /
                        (data?.pipelineStats.totalScraped || 1)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECURITY AUDIT SECTION
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="p-6 rounded-xl bg-card border border-card-border">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Security Audit
          </h3>
          <span className="ml-auto text-[10px] text-muted flex items-center gap-1">
            <Info className="w-3 h-3" />
            Client-side check
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {securityItems.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 p-4 rounded-lg bg-[#0B0F19] border border-card-border"
              >
                {item.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted">{item.detail}</p>
                </div>
                <span
                  className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-sm shrink-0 ${
                    item.ok
                      ? "text-success bg-success/10"
                      : "text-orange-500 bg-orange-500/10"
                  }`}
                >
                  {item.ok ? "OK" : "WARN"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
