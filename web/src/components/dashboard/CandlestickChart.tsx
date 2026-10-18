"use client";

import React, { useState, useMemo } from "react";

export interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlePoint[];
  height?: number;
  isDark?: boolean;
}

export default function CandlestickChart({
  data,
  height = 250,
  isDark = true,
}: CandlestickChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (!data || data.length === 0) {
      return { minPrice: 0, maxPrice: 100, priceRange: 100 };
    }
    const lows = data.map((d) => d.low);
    const highs = data.map((d) => d.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const padding = (max - min) * 0.08 || 50;
    const minP = Math.floor(min - padding);
    const maxP = Math.ceil(max + padding);
    return {
      minPrice: minP,
      maxPrice: maxP,
      priceRange: maxP - minP || 1,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center text-xs text-muted"
        style={{ height: `${height}px` }}
      >
        Loading candlestick data...
      </div>
    );
  }

  // Dimensions
  const paddingLeft = 10;
  const paddingRight = 65; // for price axis
  const paddingTop = 15;
  const paddingBottom = 25; // for time axis
  const chartHeight = height - paddingTop - paddingBottom;

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minPrice) / priceRange) * chartHeight;
  };

  const hoveredCandle = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  // 4 price levels for horizontal grid lines
  const priceLevels = [
    minPrice,
    minPrice + priceRange * 0.33,
    minPrice + priceRange * 0.66,
    maxPrice,
  ];

  return (
    <div className="relative w-full select-none" style={{ height: `${height}px` }}>
      {/* Interactive Floating OHLC Header */}
      {hoveredCandle ? (
        <div className="absolute top-0 left-0 right-0 z-10 flex flex-wrap items-center gap-3 text-[11px] bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded border border-card-border/50">
          <span className="font-semibold text-foreground">{hoveredCandle.time}</span>
          <span className="text-muted">
            O: <strong className="text-foreground">${hoveredCandle.open.toFixed(2)}</strong>
          </span>
          <span className="text-muted">
            H: <strong className="text-emerald-500">${hoveredCandle.high.toFixed(2)}</strong>
          </span>
          <span className="text-muted">
            L: <strong className="text-rose-500">${hoveredCandle.low.toFixed(2)}</strong>
          </span>
          <span className="text-muted">
            C: <strong className={hoveredCandle.close >= hoveredCandle.open ? "text-emerald-500" : "text-rose-500"}>
              ${hoveredCandle.close.toFixed(2)}
            </strong>
          </span>
          <span className={`font-bold ${hoveredCandle.close >= hoveredCandle.open ? "text-emerald-500" : "text-rose-500"}`}>
            {hoveredCandle.close >= hoveredCandle.open ? "+" : ""}
            {(((hoveredCandle.close - hoveredCandle.open) / hoveredCandle.open) * 100).toFixed(2)}%
          </span>
        </div>
      ) : (
        <div className="absolute top-0 right-14 z-10 text-[10px] text-muted flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-500 inline-block" /> Bullish Candle
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" /> Bearish Candle
          </span>
        </div>
      )}

      <svg 
        className="w-full h-full overflow-visible"
        viewBox={`0 0 800 ${height}`}
        preserveAspectRatio="none"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal Price Grid Lines & Labels */}
        {priceLevels.map((price, idx) => {
          const y = getY(price);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={800 - paddingRight}
                y2={y}
                stroke={isDark ? "#1F2937" : "#E2E8F0"}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={800 - paddingRight + 6}
                y={y + 3}
                fill={isDark ? "#9CA3AF" : "#64748B"}
                fontSize={10}
                fontFamily="inherit"
              >
                ${Math.round(price).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Candlesticks */}
        {data.map((point, i) => {
          const candleSlotWidth = (800 - paddingLeft - paddingRight) / data.length;
          const x = paddingLeft + (i + 0.5) * candleSlotWidth;
          const candleWidth = Math.max(candleSlotWidth * 0.65, 3);
          const isGreen = point.close >= point.open;
          const color = isGreen ? "#10b981" : "#ef4444";

          const yOpen = getY(point.open);
          const yClose = getY(point.close);
          const yHigh = getY(point.high);
          const yLow = getY(point.low);

          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);

          const isHovered = hoverIndex === i;

          return (
            <g 
              key={i}
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIndex(i)}
            >
              {/* Invisible wide hit area for easy hover on mobile and desktop */}
              <rect
                x={x - candleSlotWidth / 2}
                y={paddingTop}
                width={candleSlotWidth}
                height={chartHeight}
                fill="transparent"
              />

              {/* Vertical Crosshair Line on Hover */}
              {isHovered && (
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartHeight}
                  stroke={isDark ? "#475569" : "#cbd5e1"}
                  strokeDasharray="2 2"
                  strokeWidth={1}
                />
              )}

              {/* Wick Line (High to Low) */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={color}
                strokeWidth={isHovered ? 2 : 1.25}
              />

              {/* Candle Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                rx={1}
                stroke={isHovered ? (isDark ? "#ffffff" : "#000000") : "none"}
                strokeWidth={isHovered ? 0.75 : 0}
              />
            </g>
          );
        })}

        {/* X-Axis Time Labels */}
        {data.filter((_, idx) => idx % Math.ceil(data.length / 6) === 0).map((point, idx) => {
          const originalIndex = data.indexOf(point);
          const candleSlotWidth = (800 - paddingLeft - paddingRight) / data.length;
          const x = paddingLeft + (originalIndex + 0.5) * candleSlotWidth;

          return (
            <text
              key={idx}
              x={x}
              y={height - 6}
              textAnchor="middle"
              fill={isDark ? "#9CA3AF" : "#64748B"}
              fontSize={10}
              fontFamily="inherit"
            >
              {point.time}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
