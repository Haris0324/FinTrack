"use client";

import React, { useEffect, useRef, memo } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface TradingViewGaugeProps {
  symbol?: string;
  interval?: string;
  height?: number;
}

function TradingViewGaugeComponent({
  symbol = "BINANCE:BTCUSDT",
  interval = "15m",
  height = 420,
}: TradingViewGaugeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = "100%";
    containerRef.current.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: interval,
      width: "100%",
      isTransparent: true,
      height: height,
      symbol: symbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: isDark ? "dark" : "light"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [isDark, symbol, interval, height]);

  return (
    <div 
      className="tradingview-widget-container w-full rounded-xl overflow-hidden border border-card-border bg-card p-2 shadow-sm"
      ref={containerRef}
      style={{ height: `${height}px` }}
    >
      <div className="tradingview-widget-container__widget h-full w-full flex items-center justify-center text-xs text-muted">
        Loading TradingView Technical Indicators...
      </div>
    </div>
  );
}

export default memo(TradingViewGaugeComponent);
