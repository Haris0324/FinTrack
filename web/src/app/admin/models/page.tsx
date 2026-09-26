"use client";

import { useEffect, useState } from "react";
import { Brain, Save, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import AdminTabNav from "@/components/admin/AdminTabNav";

const FEATURE_GROUPS: Record<string, string[]> = {
  "FinBERT Probabilities": ["finbert_positive_prob", "finbert_negative_prob", "finbert_neutral_prob", "finbert_confidence"],
  "Sentiment & Relevance": ["sentiment_encoded", "relevance_weight", "urgency_flag", "source_weight"],
  "Entity Flags": ["has_bitcoin", "has_sec", "has_federal_reserve", "has_blackrock", "has_binance", "has_coinbase", "has_ethereum", "has_solana", "has_xrp", "has_elon_musk", "has_microstrategy", "entity_count"],
  "Temporal Features": ["hour_of_day", "day_of_week", "title_word_count"],
  "Derived Features": ["score_x_relevance", "bull_bear_spread", "price_at_news"],
};

function Badge({ children, color }: { children: React.ReactNode; color: "green" | "orange" | "gray" }) {
  const cls = {
    green: "bg-success/10 text-success border-success/20",
    orange: "bg-primary/10 text-primary border-primary/20",
    gray: "bg-card-border text-muted border-card-border",
  }[color];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${cls}`}>{children}</span>;
}

export default function ModelsPage() {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [dirThreshold, setDir]  = useState<number>(0.5);
  const [impThreshold, setImp]  = useState<number>(2.0);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    fetch("/api/admin/models")
      .then(r => r.json())
      .then(d => {
        setData(d);
        if (d.metadata) {
          setDir(d.metadata.direction_threshold ?? 0.5);
          setImp(d.metadata.high_impact_threshold ?? 2.0);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction_threshold: dirThreshold, high_impact_threshold: impThreshold }),
      });
      const d = await res.json();
      if (res.ok) {
        setData((prev: any) => ({ ...prev, metadata: d.metadata }));
        showToast("✓ Thresholds saved successfully");
      } else {
        showToast(`Error: ${d.error}`);
      }
    } catch {
      showToast("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const meta = data?.metadata;
  const models = data?.models || {};

  return (
    <div className="flex flex-col gap-6">
      <AdminTabNav />

      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">ML Models & Configuration</h2>
        <p className="text-sm text-muted">XGBoost model status, thresholds, and feature configuration</p>
      </div>

      {/* Model Info + Thresholds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Info */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-fuchsia-500" />
            <h3 className="text-sm font-semibold text-foreground">Model Information</h3>
            {!loading && meta && <Badge color="green">Loaded</Badge>}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-24 bg-card-border rounded animate-pulse" />
                  <div className="h-3 w-20 bg-card-border rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : meta ? (
            <div className="space-y-3">
              {[
                ["Version", meta.version],
                ["Feature Type", meta.feature_type],
                ["Training Samples", meta.n_train_samples?.toLocaleString()],
                ["Direction Accuracy", <span className="text-success font-bold">{(meta.direction_accuracy * 100).toFixed(1)}%</span>],
                ["Impact Accuracy", <span className="text-success font-bold">{(meta.impact_accuracy * 100).toFixed(1)}%</span>],
                ["Feature Count", meta.n_features],
                ["Status", <Badge color="green">{meta.status?.replace(/_/g, " ")}</Badge>],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between items-center text-xs border-b border-card-border/50 pb-2 last:border-0">
                  <span className="text-muted">{label}</span>
                  <span className="text-foreground font-medium">{value as any}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-danger">Model metadata not found. Ensure models are trained.</p>
          )}

          {/* Model Files */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Model Files</p>
            {[
              { key: "direction", label: "Direction Classifier", color: "fuchsia" },
              { key: "impact",    label: "High-Impact Detector", color: "orange" },
              { key: "regression",label: "Price Regression",    color: "blue" },
            ].map(m => {
              const exists = models[m.key]?.exists;
              return (
                <div key={m.key} className="flex items-center justify-between p-3 rounded-lg bg-background border border-card-border">
                  <span className="text-xs text-foreground font-medium">{m.label}</span>
                  {loading
                    ? <div className="h-4 w-14 bg-card-border rounded animate-pulse" />
                    : exists
                      ? <Badge color="green">✓ Loaded</Badge>
                      : <Badge color="gray">Not Found</Badge>
                  }
                </div>
              );
            })}
          </div>

          {/* Retrain (disabled) */}
          <div className="relative group mt-2">
            <button
              disabled
              className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
            >
              <Brain className="w-4 h-4" /> Retrain Model
            </button>
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 bg-card border border-card-border rounded-lg text-[10px] text-muted text-center shadow-xl z-10">
              Retraining requires running <code className="text-primary">train_xgboost.py</code> on the server. Contact your development team.
            </div>
          </div>
        </div>

        {/* Threshold Config */}
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Threshold Configuration</h3>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-foreground">Direction Threshold</label>
                  <span className="text-xs font-bold text-primary">{dirThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.1} max={0.9} step={0.05}
                  value={dirThreshold}
                  onChange={e => setDir(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>0.10 (more signals)</span><span>0.90 (fewer signals)</span>
                </div>
                <p className="text-[10px] text-muted mt-1">Minimum confidence to classify as BULLISH or BEARISH</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-medium text-foreground">High Impact Threshold</label>
                  <span className="text-xs font-bold text-primary">{impThreshold.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.5} max={5.0} step={0.5}
                  value={impThreshold}
                  onChange={e => setImp(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted mt-1">
                  <span>0.5 (more HIGH alerts)</span><span>5.0 (fewer HIGH alerts)</span>
                </div>
                <p className="text-[10px] text-muted mt-1">Threshold score to classify news as HIGH IMPACT</p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Thresholds"}
              </button>
            </div>
          </div>

          {/* Impact Guide */}
          <div className="p-5 rounded-xl bg-card border border-card-border">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Impact Level Guide</p>
            <div className="space-y-2">
              {[
                { label: "LOW IMPACT",    desc: "Score below threshold",      color: "gray" as const },
                { label: "HIGH IMPACT",   desc: "Score meets/exceeds threshold", color: "orange" as const },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-card-border">
                  <div>
                    <Badge color={row.color}>{row.label}</Badge>
                    <p className="text-[10px] text-muted mt-1">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Columns */}
      <div className="p-6 rounded-xl bg-card border border-card-border">
        <div className="flex items-center gap-2 mb-5">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">XGBoost Feature Columns</h3>
          <span className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-sm">26 features</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(FEATURE_GROUPS).map(([group, features]) => (
            <div key={group} className="p-4 rounded-lg bg-background border border-card-border">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-3">{group}</p>
              <div className="space-y-1.5">
                {features.map((f, i) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-[9px] text-muted w-4 shrink-0">{i + 1}</span>
                    <code className="text-[10px] text-foreground font-mono">{f}</code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-card border border-card-border rounded-xl shadow-2xl text-sm text-foreground">
          <CheckCircle2 className="w-4 h-4 text-success" />
          {toast}
        </div>
      )}
    </div>
  );
}
