"use client";

import { useEffect, useState } from "react";
import { Rss, RefreshCw, Info } from "lucide-react";
import AdminTabNav from "@/components/admin/AdminTabNav";

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function SourcesPage() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sources", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 60000);
    return () => clearInterval(interval);
  }, []);

  const sources: any[] = data?.sources || [];
  const totalToday = data?.totalToday ?? 0;
  const active = sources.filter(s => s.status === "Active").length;

  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">News Sources</h2>
          <p className="text-sm text-muted">Live monitoring of active RSS feed scrapers</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">Updated {timeAgo(lastRefresh)}</span>
          <button
            onClick={fetchSources}
            className="flex items-center gap-2 px-3 py-1.5 bg-card border border-card-border rounded-lg text-xs text-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sources", value: sources.length || 5, color: "text-foreground" },
          { label: "Active Sources", value: loading ? "—" : active, color: "text-success" },
          { label: "Articles Today", value: loading ? "—" : totalToday, color: "text-primary" },
          { label: "Avg / Source", value: loading || !sources.length ? "—" : Math.round(totalToday / sources.length), color: "text-fuchsia-400" },
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-card-border">
            <p className="text-xs font-medium text-muted mb-2">{card.label}</p>
            {loading ? (
              <div className="h-7 w-16 bg-card-border rounded animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Sources Table */}
      <div className="rounded-xl bg-card border border-card-border overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center gap-2">
          <Rss className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Active RSS Scrapers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-6 py-4 text-xs font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Source Name</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">URL</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Articles (1h)</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Articles (24h)</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Articles (7d)</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Scrape Rate</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-3 bg-card-border rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : sources.map((src, i) => (
                    <tr key={i} className="hover:bg-card-border/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          <span className="text-xs text-success font-medium">Active</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-foreground">{src.name}</td>
                      <td className="px-6 py-4 text-xs text-muted">{src.displayUrl}</td>
                      <td className="px-6 py-4 text-xs text-foreground text-center font-medium">{src.articles1h}</td>
                      <td className="px-6 py-4 text-xs text-foreground text-center font-medium">{src.articles24h}</td>
                      <td className="px-6 py-4 text-xs text-foreground text-center font-medium">{src.articles7d}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-sm">Every 1 min</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-sm">RSS Feed</span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-blue-400 mb-1">Read-Only Monitoring</p>
          <p className="text-xs text-muted">
            News sources are hardcoded in the data pipeline scraper and managed by the development team.
            This view shows live article counts from MongoDB. To add or modify sources, contact your developer.
          </p>
        </div>
      </div>
    </div>
  );
}
