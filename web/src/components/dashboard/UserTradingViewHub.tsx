"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { TrendingUp, Activity } from "lucide-react";
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

const CHART_HEIGHT = 680;

function UserTradingViewHubComponent({
  btcPrice,
  btcChange = "+0.00%",
}: UserTradingViewHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const [selectedInterval, setSelectedInterval] = useState("15");

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = `${CHART_HEIGHT}px`;
    widgetContainer.style.width = "100%";
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: CHART_HEIGHT,
      symbol: "BINANCE:BTCUSDT",
      interval: selectedInterval,
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      withdateranges: true,
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
    <div className="rounded-xl bg-card border border-card-border overflow-hidden shadow-lg flex flex-col">
      
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-card-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/40">
        
        {/* Left: Title & Symbol details */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Interactive Market Technical Analysis (BTC/USDT)</h3>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 whitespace-nowrap shrink-0 leading-normal">
                TradingView Pro
              </span>
            </div>
            <p className="text-xs text-muted">Real-time candlesticks with Bollinger Bands and RSI technical momentum</p>
          </div>
        </div>

        {/* Right: Live Price Badge & Quick Timeframe Selector */}
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
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
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

      {/* TradingView Chart Container with Full 680px Height and Zero Overlap */}
      <div 
        className="tradingview-widget-container w-full bg-background" 
        ref={containerRef} 
        style={{ minHeight: `${CHART_HEIGHT}px`, height: `${CHART_HEIGHT}px` }}
      >
        <div className="tradingview-widget-container__widget h-full w-full flex items-center justify-center text-xs text-muted">
          <Activity className="w-4 h-4 animate-spin text-primary mr-2" />
          Loading TradingView Pro Technical Chart...
        </div>
      </div>

    </div>
  );
}

export default memo(UserTradingViewHubComponent);
