"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, BellRing, Brain, Check, Clock3, FileText, Loader2, Plus, RefreshCw, Rss, ShieldCheck, Users } from "lucide-react";

type Source = { name: string; url: string; enabled: boolean; articles24h: number };
type Overview = {
  metrics: { totalArticles: number; articles24h: number; highImpact: number; users: number; lastScrapedAt: string | null; isIngestionRecent: boolean; sourceCount: number; activeSourceCount: number };
  sources: Source[];
  keywords: string[];
  settings: { highImpactThresholdPct: number; emailAlertsEnabled: boolean; alertEmail: string };
  pipeline: null | { status: string; completedAt: string | null; durationMs: number | null; articlesInserted: number | null; errorCount: number; lastErrorType: string | null; notificationErrorType: string | null };
  logs: { _id: string; action: string; status: string; type: string; createdAt: string; ip?: string }[];
  model: null | { version: string; directionAccuracy: number | null; impactAccuracy: number | null; trainingSamples: number | null; featureCount: number | null; directionThreshold: number | null; highImpactThreshold: number | null; status: string };
};

const card = "rounded-xl border border-card-border bg-card";
const pct = (value: number | null | undefined) => value == null ? "Unavailable" : `${(value * 100).toFixed(1)}%`;
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function AdminPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUrl, setSavingUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [impactThreshold, setImpactThreshold] = useState("2");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load admin dashboard");
      setError("");
      setData(result);
      setKeywordsInput((result.keywords || []).join(", "));
      setImpactThreshold(String(result.settings?.highImpactThresholdPct ?? 2));
      setEmailAlertsEnabled(Boolean(result.settings?.emailAlertsEnabled));
      setAlertEmail(result.settings?.alertEmail || "");
    } catch (err: unknown) {
      setError(errorText(err, "Could not load admin dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const toggleSource = async (source: Source) => {
    setSavingUrl(source.url);
    try {
      const response = await fetch("/api/admin/sources", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: source.url, enabled: !source.enabled }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update source");
      await refresh();
    } catch (err: unknown) {
      setError(errorText(err, "Could not update source"));
    } finally { setSavingUrl(""); }
  };

  const addSource = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdding(true);
    try {
      const response = await fetch("/api/admin/sources", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sourceName, url: sourceUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add source");
      setSourceName(""); setSourceUrl("");
      await refresh();
    } catch (err: unknown) {
      setError(errorText(err, "Could not add source"));
    } finally { setAdding(false); }
  };

  const saveKeywords = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingKeywords(true);
    try {
      const response = await fetch("/api/admin/keywords", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: keywordsInput.split(",").map(word => word.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save keywords");
      await refresh();
    } catch (err: unknown) {
      setError(errorText(err, "Could not save keywords"));
    } finally { setSavingKeywords(false); }
  };

  const saveThreshold = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingThreshold(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          highImpactThresholdPct: Number(impactThreshold),
          emailAlertsEnabled,
          alertEmail,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save admin settings");
      await refresh();
    } catch (err: unknown) {
      setError(errorText(err, "Could not save admin settings"));
    } finally { setSavingThreshold(false); }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading admin dashboard…</div>;

  const metricCards = data ? [
    { label: "Articles ingested · 24h", value: data.metrics.articles24h.toLocaleString(), icon: Rss, color: "text-primary" },
    { label: "High impact articles", value: data.metrics.highImpact.toLocaleString(), icon: BellRing, color: "text-red-400" },
    { label: "XGBoost direction accuracy", value: pct(data.model?.directionAccuracy), icon: Brain, color: "text-fuchsia-400" },
    { label: "Registered users", value: data.metrics.users.toLocaleString(), icon: Users, color: "text-emerald-400" },
  ] : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administrative Panel</h1>
          <p className="mt-1 text-sm text-muted">Live ingestion, model health, and system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full border border-card-border bg-card px-3 py-2 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${data?.metrics.isIngestionRecent ? "bg-emerald-400" : "bg-amber-400"}`} />
            {data?.metrics.lastScrapedAt ? `Last article ${new Date(data.metrics.lastScrapedAt).toLocaleString()}` : "No ingestion timestamp"}
          </span>
          <button onClick={() => { setLoading(true); void refresh(); }} className="flex items-center gap-2 rounded-lg border border-card-border bg-card px-3 py-2 text-sm text-foreground hover:bg-card-border"><RefreshCw className="h-4 w-4" />Refresh</button>
          <Link href="/dashboard/settings" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90">Account settings</Link>
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(({ label, value, icon: Icon, color }) => <div key={label} className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted">{label}</span><Icon className={`h-5 w-5 ${color}`} /></div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {label.startsWith("XGBoost") && data?.model && <p className="mt-1 text-xs text-muted">Impact model: {pct(data.model.impactAccuracy)}</p>}
        </div>)}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-card-border p-5">
            <div><h2 className="font-semibold text-foreground">News sources</h2><p className="mt-1 text-xs text-muted">Changes apply to the scraper’s next run</p></div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">{data?.metrics.activeSourceCount}/{data?.metrics.sourceCount} active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead className="text-xs text-muted"><tr className="border-b border-card-border"><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Source</th><th className="px-5 py-3 font-medium">Articles · 24h</th><th className="px-5 py-3 text-right font-medium">Controls</th></tr></thead>
              <tbody className="divide-y divide-card-border">
                {(data?.sources || []).map(source => <tr key={source.url}>
                  <td className="px-5 py-3"><span className={`inline-flex items-center gap-2 text-xs ${source.enabled ? "text-emerald-400" : "text-muted"}`}><span className={`h-1.5 w-1.5 rounded-full ${source.enabled ? "bg-emerald-400" : "bg-slate-500"}`} />{source.enabled ? "Active" : "Paused"}</span></td>
                  <td className="max-w-[300px] px-5 py-3"><p className="font-medium text-foreground">{source.name}</p><p className="truncate text-xs text-muted">{source.url}</p></td>
                  <td className="px-5 py-3 text-foreground">{source.articles24h}</td>
                  <td className="px-5 py-3 text-right"><button disabled={savingUrl === source.url} onClick={() => void toggleSource(source)} className="rounded-md border border-card-border px-3 py-1.5 text-xs text-foreground hover:bg-card-border disabled:opacity-50">{savingUrl === source.url ? "Saving…" : source.enabled ? "Pause" : "Enable"}</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <form onSubmit={addSource} className="grid grid-cols-1 gap-2 border-t border-card-border p-4 sm:grid-cols-[1fr_2fr_auto]">
            <input required value={sourceName} onChange={event => setSourceName(event.target.value)} placeholder="Source name" className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            <input required type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} placeholder="https://example.com/feed.xml" className="rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            <button disabled={adding} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />Add source</button>
          </form>
          <form onSubmit={saveKeywords} className="grid grid-cols-1 gap-3 border-t border-card-border p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-xs text-muted">Monitored keywords <span className="ml-1">(comma separated; empty means no keyword filter)</span>
              <input value={keywordsInput} onChange={event => setKeywordsInput(event.target.value)} placeholder="bitcoin, BTC, Ethereum" className="mt-2 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <button disabled={savingKeywords} className="rounded-lg border border-card-border px-4 py-2 text-sm text-foreground hover:bg-card-border disabled:opacity-50">{savingKeywords ? "Saving…" : "Save keywords"}</button>
          </form>
        </section>

        <section className={`${card} p-5`}>
          <div className="mb-5 flex items-center gap-2"><Brain className="h-5 w-5 text-fuchsia-400" /><h2 className="font-semibold text-foreground">Prediction model</h2></div>
          {data?.model ? <div className="space-y-4">
            <div className="flex justify-between gap-4 text-sm"><span className="text-muted">Model version</span><span className="font-medium text-foreground">{data.model.version}</span></div>
            <div className="flex justify-between gap-4 text-sm"><span className="text-muted">Direction accuracy</span><span className="font-semibold text-emerald-400">{pct(data.model.directionAccuracy)}</span></div>
            <div className="flex justify-between gap-4 text-sm"><span className="text-muted">Impact accuracy</span><span className="font-semibold text-emerald-400">{pct(data.model.impactAccuracy)}</span></div>
            <div className="flex justify-between gap-4 text-sm"><span className="text-muted">Training samples</span><span className="text-foreground">{data.model.trainingSamples?.toLocaleString() ?? "Unavailable"}</span></div>
            <div className="flex justify-between gap-4 text-sm"><span className="text-muted">Features</span><span className="text-foreground">{data.model.featureCount ?? "Unavailable"}</span></div>
            <form onSubmit={saveThreshold} className="space-y-3 border-t border-card-border pt-4">
              <div className="flex items-end gap-3">
                <label className="flex-1 text-xs text-muted">High impact threshold (% predicted move)
                  <input type="number" min="0.25" max="15" step="0.25" required value={impactThreshold} onChange={event => setImpactThreshold(event.target.value)} className="mt-2 w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                </label>
                <button disabled={savingThreshold} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{savingThreshold ? "Saving…" : "Save settings"}</button>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={emailAlertsEnabled} onChange={event => setEmailAlertsEnabled(event.target.checked)} className="accent-orange-500" />Email me a digest when high impact articles are processed</label>
              <input type="email" value={alertEmail} onChange={event => setAlertEmail(event.target.value)} placeholder="Alert recipient email" className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
              <p className="text-xs leading-5 text-muted">Email delivery also needs SMTP credentials configured privately for the Render pipeline service.</p>
            </form>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-muted"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />The threshold updates impact labels for newly processed news. Model retraining is run separately and is not started by this dashboard.</div>
          </div> : <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted">Model metadata is not available in this deployment. Add the model metadata file to the Vercel build output to show measured accuracy here.</div>}
          <div className="mt-5 flex items-center gap-2 border-t border-card-border pt-4 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-emerald-400" />Status: {data?.model?.status || "Metadata unavailable"}</div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><h2 className="font-semibold text-foreground">Ingestion status</h2></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-background p-4"><p className="text-xs text-muted">Articles stored</p><p className="mt-2 text-xl font-bold text-foreground">{data?.metrics.totalArticles.toLocaleString()}</p></div>
            <div className="rounded-lg bg-background p-4"><p className="text-xs text-muted">Articles · last 24h</p><p className="mt-2 text-xl font-bold text-foreground">{data?.metrics.articles24h.toLocaleString()}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-card-border p-4 text-sm">
            <div><p className="text-xs text-muted">Last pipeline cycle</p><p className="mt-1 text-foreground">{data?.pipeline?.completedAt ? new Date(data.pipeline.completedAt).toLocaleString() : "Waiting for next Render cycle"}</p></div>
            <div><p className="text-xs text-muted">Pipeline state</p><p className={`mt-1 font-medium ${data?.pipeline?.status === "healthy" ? "text-emerald-400" : data?.pipeline?.status === "error" ? "text-red-400" : "text-amber-400"}`}>{data?.pipeline?.status || "No telemetry yet"}</p></div>
            <div><p className="text-xs text-muted">Last cycle duration</p><p className="mt-1 text-foreground">{data?.pipeline?.durationMs == null ? "Unavailable" : `${(data.pipeline.durationMs / 1000).toFixed(1)} sec`}</p></div>
            <div><p className="text-xs text-muted">Last cycle inserted</p><p className="mt-1 text-foreground">{data?.pipeline?.articlesInserted ?? "Unavailable"}</p></div>
            <div><p className="text-xs text-muted">Recorded cycle errors</p><p className="mt-1 text-foreground">{data?.pipeline?.errorCount ?? 0}</p></div>
            {data?.pipeline?.lastErrorType && <div><p className="text-xs text-muted">Latest error type</p><p className="mt-1 text-red-400">{data.pipeline.lastErrorType}</p></div>}
            {data?.pipeline?.notificationErrorType && <div><p className="text-xs text-muted">Latest notification error</p><p className="mt-1 text-red-400">{data.pipeline.notificationErrorType}</p></div>}
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">Pipeline telemetry appears after the updated worker runs. Vercel CPU, memory, and API request history are not collected by the current deployment.</p>
        </section>
        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2"><FileText className="h-5 w-5 text-orange-400" /><h2 className="font-semibold text-foreground">Recent account activity</h2></div>
          <div className="space-y-3">
            {(data?.logs || []).length ? data?.logs.map(log => <div key={log._id} className="flex items-start gap-3 border-b border-card-border pb-3 last:border-0 last:pb-0"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${log.status === "Success" ? "bg-emerald-400" : "bg-amber-400"}`} /><div className="min-w-0 flex-1"><p className="text-sm text-foreground">{log.action}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock3 className="h-3 w-3" />{new Date(log.createdAt).toLocaleString()}</p></div><span className="text-xs text-muted">{log.status}</span></div>) : <p className="py-6 text-center text-sm text-muted">No activity has been recorded yet.</p>}
          </div>
        </section>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted"><Check className="h-4 w-4 text-emerald-400" />{data?.metrics.users ?? 0} user accounts · {data?.metrics.sourceCount ?? 0} configured news sources</div>
    </div>
  );
}
