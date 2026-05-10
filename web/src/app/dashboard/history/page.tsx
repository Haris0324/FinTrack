"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Clock, Calendar, TrendingUp, Search, Activity, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const timelineData = [
  { day: '-7d', price: 38500 },
  { day: '-5d', price: 38200 },
  { day: '-3d', price: 38800 },
  { day: '-1d', price: 39100 },
  { day: 'Event Day', price: 39500 },
  { day: '+1d', price: 41500 },
  { day: '+3d', price: 43800 },
  { day: '+5d', price: 45200 },
  { day: '+7d', price: 47100 },
];

const historicalEvents = [
  {
    category: "Regulatory",
    date: "March 12, 2024",
    title: "SEC Approves First Spot Bitcoin ETF",
    impact: "+18.5%",
    timeframe: "7 days",
    active: true,
  },
  {
    category: "Macro Economics",
    date: "November 8, 2023",
    title: "Federal Reserve Halts Interest Rate Hikes",
    impact: "+12.3%",
    timeframe: "14 days",
    active: false,
  },
  {
    category: "Market Event",
    date: "May 15, 2023",
    title: "FTX Exchange Collapse Aftermath",
    impact: "-24.7%",
    timeframe: "30 days",
    active: false,
  },
  {
    category: "Bitcoin",
    date: "April 5, 2024",
    title: "Bitcoin Halving Event",
    impact: "+15.8%",
    timeframe: "60 days",
    active: false,
  },
  {
    category: "Adoption",
    date: "January 20, 2024",
    title: "Major Institutional Adoption Announcement",
    impact: "+9.2%",
    timeframe: "7 days",
    active: false,
  },
];

const similarEvents = [
  {
    date: "March 8, 2026",
    match: "92% Match",
    title: "Federal Reserve Signals Potential Rate Cuts in Q2 2026",
    impact: "+10-15%",
    confidence: "87%",
  },
  {
    date: "March 7, 2026",
    match: "78% Match",
    title: "Major Institutional Investors Increase Bitcoin Holdings",
    impact: "+8-12%",
    confidence: "82%",
  },
  {
    date: "March 6, 2026",
    match: "85% Match",
    title: "SEC Approves New Cryptocurrency ETF Framework",
    impact: "+12-18%",
    confidence: "89%",
  },
];

export default function HistoricalPatterns() {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentEvent = historicalEvents[activeIndex];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-5 max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-0.5"><span className="text-gradient">Historical Pattern Analysis</span></h2>
            <p className="text-xs text-muted">Compare current events with historical data to predict market reactions</p>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50">
            <Clock className="w-4 h-4 text-orange-500 mb-1.5" />
            <h3 className="text-xl font-bold text-foreground">847</h3>
            <p className="text-[10px] text-muted">Historical Events</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50">
            <Calendar className="w-4 h-4 text-blue-500 mb-1.5" />
            <h3 className="text-xl font-bold text-foreground">5 Years</h3>
            <p className="text-[10px] text-muted">Data Coverage</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50">
            <TrendingUp className="w-4 h-4 text-success mb-1.5" />
            <h3 className="text-xl font-bold text-foreground">83%</h3>
            <p className="text-[10px] text-muted">Pattern Match Rate</p>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50">
            <Search className="w-4 h-4 text-purple-500 mb-1.5" />
            <h3 className="text-xl font-bold text-foreground">3</h3>
            <p className="text-[10px] text-muted">Similar Events Today</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column: Major Historical Events */}
          <div className="lg:col-span-1 space-y-3">
            <div className="p-3 bg-card border border-card-border rounded-xl">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Major Historical Events</h3>
            </div>
            <div className="space-y-2 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {historicalEvents.map((event, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveIndex(i)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeIndex === i 
                      ? "bg-[#2a1d0f] border-orange-500/50 shadow-lg shadow-orange-500/10" 
                      : "bg-[#0b1120] border-card-border/50 hover:bg-card-border/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      event.category === 'Regulatory' ? 'bg-success/10 text-success' :
                      event.category === 'Macro Economics' ? 'bg-blue-500/10 text-blue-500' :
                      event.category === 'Market Event' ? 'bg-danger/10 text-danger' :
                      'bg-primary/10 text-primary'
                    }`}>
                      {event.category}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{event.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground mb-2 leading-tight">{event.title}</h4>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold ${event.impact.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                      {event.impact}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{event.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Detailed View & Chart */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-6 rounded-xl bg-[#0b1120] border border-card-border/50">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                  currentEvent.category === 'Regulatory' ? 'bg-success/10 text-success' :
                  currentEvent.category === 'Macro Economics' ? 'bg-blue-500/10 text-blue-500' :
                  currentEvent.category === 'Market Event' ? 'bg-danger/10 text-danger' :
                  'bg-primary/10 text-primary'
                }`}>
                  {currentEvent.category}
                </span>
                <span className="text-[10px] text-muted">{currentEvent.date}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{currentEvent.title}</h2>
              <p className="text-xs text-muted mb-6 max-w-lg leading-relaxed">Detailed historical data for the {currentEvent.title} event.</p>
              
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Price Impact</p>
                  <p className={`text-xl font-bold ${currentEvent.impact.startsWith('+') ? 'text-success' : 'text-danger'}`}>{currentEvent.impact}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Timeframe</p>
                  <p className="text-xl font-bold text-foreground">{currentEvent.timeframe}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Volatility</p>
                  <p className="text-xl font-bold text-orange-500">{currentEvent.category === 'Regulatory' ? 'High' : 'Medium'}</p>
                </div>
              </div>

              <div className="bg-[#0f172a] p-4 rounded-xl border border-card-border/30">
                <h4 className="text-sm font-bold text-foreground mb-8">Price Movement Timeline</h4>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData} margin={{ left: 0, right: 10, top: 45, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={true} horizontal={true} />
                      <XAxis 
                        dataKey="day" 
                        stroke="#475569" 
                        fontSize={9} 
                        axisLine={false} 
                        tickLine={false} 
                        dy={5}
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={9} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={[37200, 47800]}
                        ticks={[37200, 40200, 43200, 47800]}
                        width={35}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const lbl = String(label);
                            return (
                              <div className="bg-[#1e293b] border border-card-border p-3 rounded-lg shadow-2xl min-w-[120px]">
                                <p className="text-xs font-bold text-white mb-1.5">{lbl.startsWith('-') || lbl.startsWith('+') ? `Day ${lbl.replace('d', '')}` : (lbl === 'Event Day' ? 'Day 0' : lbl)}</p>
                                <p className="text-[11px] text-success font-medium">price : {payload[0].value}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ stroke: '#475569', strokeWidth: 1 }}
                      />
                      <ReferenceLine 
                        x="Event Day" 
                        stroke="#f97316" 
                        strokeDasharray="3 3" 
                        label={{ position: 'top', value: 'Event', fill: '#94a3b8', fontSize: 11, dy: -8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#22c55e" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#22c55e', strokeWidth: 2, stroke: '#0f172a' }} 
                        activeDot={{ r: 6, fill: '#ffffff', stroke: '#22c55e', strokeWidth: 2 }}
                        isAnimationActive={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-center text-muted mt-6">Price movement 7 days before and after the event</p>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Current Events Section */}
        <div className="p-5 rounded-xl bg-[#0b1120] border border-card-border/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-orange-500" />
              <h3 className="text-base font-bold text-foreground">Similar Current Events</h3>
            </div>
            <span className="text-[10px] text-muted">Based on semantic similarity</span>
          </div>
          
          <div className="space-y-2.5">
            {similarEvents.map((event, i) => (
              <div key={i} className="group p-4 bg-[#0f172a] border border-card-border/30 rounded-xl hover:bg-card-border/20 transition-all cursor-pointer flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted font-medium">{event.date}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      {event.match}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h4>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span className="text-[10px] text-muted">Predicted Impact: <strong className="text-success">{event.impact}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted">Confidence: <strong className="text-foreground">{event.confidence}</strong></span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-foreground transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards at Bottom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-4">
          <div className="p-5 rounded-xl border border-purple-500/30 bg-[#0f172a] shadow-[0_0_15px_-5px_rgba(168,85,247,0.15)]">
            <h4 className="text-sm font-bold text-foreground mb-1.5">Semantic Matching</h4>
            <p className="text-[11px] text-muted leading-relaxed">Uses NLP embeddings to find similar events based on content and context</p>
          </div>
          <div className="p-5 rounded-xl border border-blue-500/30 bg-[#0f172a] shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)]">
            <h4 className="text-sm font-bold text-foreground mb-1.5">Price Correlation</h4>
            <p className="text-[11px] text-muted leading-relaxed">Analyzes historical price movements to identify patterns and trends</p>
          </div>
          <div className="p-5 rounded-xl border border-orange-500/30 bg-[#0f172a] shadow-[0_0_15px_-5px_rgba(249,115,22,0.15)]">
            <h4 className="text-sm font-bold text-foreground mb-1.5">Weighted Recency</h4>
            <p className="text-[11px] text-muted leading-relaxed">Recent events given higher weight as market conditions evolve</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
