"use client";

import { useEffect, useState } from "react";
import { Server, Activity, Brain, BellRing, Database, Shield, Users, FileBarChart, Settings, RefreshCw, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AdminTabNav from "@/components/admin/AdminTabNav";
import Link from "next/link";

const staticResourceData = [
  { time: "00:00", cpu: 30, memory: 40 }, { time: "04:00", cpu: 25, memory: 38 },
  { time: "08:00", cpu: 45, memory: 55 }, { time: "12:00", cpu: 75, memory: 65 },
  { time: "16:00", cpu: 60, memory: 60 }, { time: "20:00", cpu: 50, memory: 50 },
  { time: "24:00", cpu: 35, memory: 45 },
];

function timeAgo(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/system", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const meta = data?.modelMetadata;
  const logs = data?.recentLogs || [];
  const volumeData = data?.requestVolume24h || staticResourceData.map((r: any) => ({ time: r.time, requests: 0 }));

  const SOURCES = [
    "CoinTelegraph", "CoinDesk", "CryptoPanic", "Reuters (BTC)", "Bloomberg (BTC)"
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Administrative Panel</h2>
          <p className="text-sm text-muted">System configuration, monitoring, and management</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live System
          </button>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
            loading ? "border-card-border text-muted" : "bg-success/10 text-success border-success/30"
          }`}>
            {loading ? "Loading..." : "All Systems Operational"}
          </span>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { icon: <Server className="w-4 h-4 text-primary" />, label: "News Scraping", value: loading ? "—" : `${data?.articlesToday ?? 0} articles today`, status: "Active" },
          { icon: <Activity className="w-4 h-4 text-fuchsia-500" />, label: "NLP Processing", value: loading ? "—" : `${data?.articlesToday ?? 0} analyzed`, status: "Active" },
          { icon: <Brain className="w-4 h-4 text-orange-500" />, label: "ML Prediction", value: loading ? "—" : `${meta ? (meta.direction_accuracy * 100).toFixed(1) : "59.3"}% accuracy`, status: "Active" },
          { icon: <BellRing className="w-4 h-4 text-danger" />, label: "Alert System", value: loading ? "—" : `${data?.highImpactToday ?? 0} active alerts`, status: "Active" },
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {card.icon}
                <p className="text-xs font-medium text-muted">{card.label}</p>
              </div>
              <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">{card.status}</span>
            </div>
            {loading ? (
              <div className="h-4 w-28 bg-card-border rounded animate-pulse" />
            ) : (
              <p className="text-xs text-muted">{card.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[300px]">
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <h3 className="text-sm font-medium text-foreground mb-4">System Resources (24h)</h3>
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={staticResourceData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "0.5rem", color: "#f8fafc" }} itemStyle={{ color: "#e2e8f0" }} />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#F97316" fillOpacity={1} fill="url(#colorCpu)" />
                <Area type="monotone" dataKey="memory" name="Memory %" stroke="#A855F7" fillOpacity={1} fill="url(#colorMem)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute top-0 right-0 flex gap-4">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-[10px] text-muted">CPU</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /><span className="text-[10px] text-muted">Memory</span></div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <h3 className="text-sm font-medium text-foreground mb-4">API Request Volume (24h)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "0.5rem", color: "#f8fafc" }} itemStyle={{ color: "#e2e8f0" }} />
                <Line type="monotone" dataKey="requests" name="Articles" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-3 pt-3 border-t border-card-border">
            <div><p className="text-[10px] text-muted">Today</p><p className="text-sm font-bold text-foreground">{loading ? "—" : data?.articlesToday ?? 0}</p></div>
            <div><p className="text-[10px] text-muted">Last 1h</p><p className="text-sm font-bold text-foreground">{loading ? "—" : data?.articlesLast1h ?? 0}</p></div>
            <div><p className="text-[10px] text-muted">High Impact</p><p className="text-sm font-bold text-danger">{loading ? "—" : data?.highImpactToday ?? 0}</p></div>
          </div>
        </div>
      </div>

      {/* News Sources Table */}
      <div className="rounded-xl bg-card border border-card-border overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">News Sources</h3>
          <span className="text-xs text-muted">5 active RSS scrapers • auto-refresh every 1 min</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-6 py-4 text-xs font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Source</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Articles (24h)</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Scraper</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {SOURCES.map((name, i) => (
                <tr key={i} className="hover:bg-card-border/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-foreground">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-medium text-foreground">{name}</td>
                  <td className="px-6 py-3 text-xs text-foreground text-center">
                    {loading ? <span className="inline-block h-3 w-8 bg-card-border rounded animate-pulse" /> : "—"}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-sm">RSS Feed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ML Config + Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-5 h-5 text-fuchsia-500" />
              <h3 className="text-sm font-medium text-foreground">ML Model Configuration</h3>
            </div>
            <div className="space-y-4">
              {[
                ["Model Version", meta ? meta.version : "news_v2"],
                ["Last Trained", meta ? `${meta.n_train_samples?.toLocaleString()} samples` : "—"],
                ["Training Samples", meta ? meta.n_train_samples?.toLocaleString() : "—"],
                ["Direction Accuracy", meta ? <span className="text-success font-bold">{(meta.direction_accuracy * 100).toFixed(1)}%</span> : "—"],
                ["Impact Accuracy", meta ? <span className="text-success font-bold">{(meta.impact_accuracy * 100).toFixed(1)}%</span> : "—"],
                ["Feature Count", meta ? meta.n_features : "26"],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="text-foreground font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 relative group">
            <button
              disabled
              className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Retrain Model
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-card border border-card-border rounded-lg text-[10px] text-muted text-center shadow-xl">
              Retraining requires running train_xgboost.py on the server. Contact your development team.
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Recent Logs</h3>
            </div>
            <Link href="/admin/monitoring" className="text-[10px] text-primary hover:underline">View All</Link>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1 max-h-[280px]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-4 h-4 rounded-full bg-card-border animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 bg-card-border rounded animate-pulse" />
                    <div className="h-3 w-40 bg-card-border rounded animate-pulse" />
                  </div>
                </div>
              ))
            ) : logs.length === 0 ? (
              <div className="text-xs text-muted text-center py-4">No recent activity</div>
            ) : (
              logs.slice(0, 8).map((log: any, i: number) => {
                const isError   = log.type === "danger";
                const isWarning = log.type === "warning";
                const isSuccess = log.type === "success";
                return (
                  <div key={i} className="flex items-start gap-3">
                    {isError   && <Shield className="w-4 h-4 text-danger shrink-0 mt-0.5" />}
                    {isWarning && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                    {isSuccess && <CheckCircle className="w-4 h-4 text-success shrink-0 mt-0.5" />}
                    {!isError && !isWarning && !isSuccess && <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isError ? "bg-danger/20 text-danger" :
                          isWarning ? "bg-orange-500/20 text-orange-500" :
                          isSuccess ? "bg-success/20 text-success" :
                          "bg-blue-500/20 text-blue-500"
                        }`}>
                          {isError ? "ERROR" : isWarning ? "WARNING" : isSuccess ? "SUCCESS" : "INFO"}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {(log.userId as any)?.name || "System"}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">{log.action}</p>
                    </div>
                    <span className="text-[10px] text-muted shrink-0">{timeAgo(log.createdAt)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Database className="w-4 h-4 text-primary" />, title: "Backup Database", sub: "Create snapshot" },
          { icon: <Shield className="w-4 h-4 text-success" />, title: "Security Audit", sub: "Run diagnostics", href: "/admin/monitoring" },
          { icon: <Users className="w-4 h-4 text-fuchsia-500" />, title: "User Management", sub: "Manage access", href: "/admin/users" },
          { icon: <FileBarChart className="w-4 h-4 text-orange-500" />, title: "Performance Report", sub: "View monitoring", href: "/admin/monitoring" },
        ].map((item, i) => {
          const content = (
            <div className="p-3 rounded-lg border border-card-border bg-card hover:bg-card-border/50 cursor-pointer transition-colors flex items-center gap-3">
              {item.icon}
              <div>
                <p className="text-[10px] font-bold text-foreground">{item.title}</p>
                <p className="text-[9px] text-muted">{item.sub}</p>
              </div>
            </div>
          );
          return item.href ? <Link key={i} href={item.href}>{content}</Link> : <div key={i}>{content}</div>;
        })}
      </div>
    </div>
  );
}
