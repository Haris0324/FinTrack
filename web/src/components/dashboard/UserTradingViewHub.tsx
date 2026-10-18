"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { TrendingUp, Zap, BarChart2, ShieldCheck, Sparkles, Clock, Compass, Activity } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface UserTradingViewHubProps {
  btcPrice?: number | null;
  btcChange?: string;
  activePredictionsCount?: number;
}

const intervals = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
];

function UserTradingViewHubComponent({
  btcPrice,
  btcChange = "+0.00%",
  activePredictionsCount = 3,
}: UserTradingViewHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [selectedInterval, setSelectedInterval] = useState("15");

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "520px";
    widgetContainer.style.width = "100%";
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: 520,
      symbol: "BINANCE:BTCUSDT",
      interval: selectedInterval,
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      save_image: true,
      studies: [
        "STD;Bollinger_Bands",
        "STD;RSI"
      ],
      support_host: "https://www.tradingview.com"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isDark, selectedInterval]);

  return (
    <div className="rounded-xl bg-card border border-card-border overflow-hidden shadow-lg flex flex-col gap-0">
      
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/30">
        
        {/* Left: Title & Symbol details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Interactive Market Pro Analysis (BTC/USDT)</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                TradingView Feed
              </span>
            </div>
            <p className="text-xs text-muted">Real-time candlesticks with Bollinger Bands and RSI technical momentum</p>
          </div>
        </div>

        {/* Right: Quick Timeframe Selector Pills & Live Price Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {btcPrice && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-card-border text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-foreground">${btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={`text-[11px] ${btcChange.startsWith('-') ? 'text-rose-500' : 'text-emerald-500'}`}>{btcChange}</span>
            </div>
          )}

          <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-card-border">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => setSelectedInterval(int.value)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  selectedInterval === int.value
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted hover:text-foreground hover:bg-card-border/50"
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TradingView Chart Container (520px height for clear, unmixed analysis) */}
      <div 
        className="w-full bg-background" 
        ref={containerRef} 
        style={{ minHeight: "520px", height: "520px" }}
      >
        <div className="h-full w-full flex items-center justify-center text-xs text-muted">
          Loading TradingView Pro Chart...
        </div>
      </div>

      {/* Bottom 3-Pillar Technical & FinTrack AI Horizon */}
      <div className="p-4 sm:p-5 border-t border-card-border bg-background/20 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Pillar 1: Technical Momentum */}
        <div className="p-3.5 rounded-lg bg-card border border-card-border/80 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground mb-0.5">Technical Momentum</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Bollinger Bands track volatility expansion while RSI 14 reveals overbought/oversold momentum reversals on the selected timeframe.
            </p>
          </div>
        </div>

        {/* Pillar 2: FinBERT Sentiment Alignment */}
        <div className="p-3.5 rounded-lg bg-card border border-card-border/80 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground mb-0.5">FinBERT NLP Alignment</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Scrapes 100+ daily crypto headlines to detect real-time sentiment shifts before they reflect in candlestick price moves.
            </p>
          </div>
        </div>

        {/* Pillar 3: XGBoost 3-Hour Horizon */}
        <div className="p-3.5 rounded-lg bg-card border border-card-border/80 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground mb-0.5">XGBoost 3h Horizon</h4>
            <p className="text-[11px] text-muted leading-relaxed">
              Currently tracking <strong className="text-foreground">{activePredictionsCount} active 3-hour predictions</strong> evaluated against live Binance 1m price data.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}

export default memo(UserTradingViewHubComponent);
