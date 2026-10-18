"use client";

import React, { useEffect, useRef, memo } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
}

function TradingViewChartComponent({
  symbol = "BINANCE:BTCUSDT",
  interval = "15",
  height = 560,
}: TradingViewChartProps) {
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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: isDark ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      save_image: true,
      studies: [
        "STD;RSI",
        "STD;MACD",
        "STD;Bollinger_Bands"
      ],
      support_host: "https://www.tradingview.com"
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
      className="tradingview-widget-container w-full rounded-xl overflow-hidden border border-card-border bg-card shadow-sm"
      ref={containerRef}
      style={{ height: `${height}px` }}
    >
      <div className="tradingview-widget-container__widget h-full w-full flex items-center justify-center text-xs text-muted">
        Loading TradingView Bitcoin Chart...
      </div>
    </div>
  );
}

export default memo(TradingViewChartComponent);
