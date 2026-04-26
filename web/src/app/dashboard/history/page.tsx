"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { History, Calendar, CheckCircle2, Search, ArrowUpRight, ArrowDownRight, Activity, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const timelineData = [
  { day: '-7d', price: 42000 },
  { day: '-5d', price: 41800 },
  { day: '-3d', price: 42500 },
  { day: '-1d', price: 43200 },
  { day: 'Event Day', price: 44000 },
  { day: '+1d', price: 46500 },
  { day: '+3d', price: 48000 },
  { day: '+5d', price: 49200 },
  { day: '+7d', price: 50100 },
];

export default function HistoricalPatterns() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Historical Pattern Analysis</h2>
          <p className="text-sm text-muted">Compare current events with historical data to predict market reactions</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">847</h3>
              <p className="text-xs font-medium text-muted">Historical Events</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">5 Years</h3>
              <p className="text-xs font-medium text-muted">Data Coverage</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">87%</h3>
              <p className="text-xs font-medium text-muted">Pattern Match Rate</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Search className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">3</h3>
              <p className="text-xs font-medium text-muted">Similar Event Rules</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Major Historical Events */}
          <div className="lg:col-span-1 rounded-xl bg-card border border-card-border overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-card-border">
              <h3 className="text-sm font-medium text-foreground">Major Historical Events</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              
              <div className="p-3 rounded-lg border border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-500 uppercase">Regulatory</span>
                  <span className="text-xs text-muted">Jan 10, 2024</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">SEC Approves First Spot Bitcoin ETF</h4>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-success" />
                  <span className="text-xs font-bold text-success">+18.5%</span>
                  <span className="text-[10px] text-muted ml-auto">7 days</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-card-border hover:bg-card-border/30 cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-orange-500/20 text-orange-500 uppercase">Macroeconomy</span>
                  <span className="text-xs text-muted">Nov 1, 2023</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Federal Reserve Halts Interest Rate Hikes</h4>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-success" />
                  <span className="text-xs font-bold text-success">+12.4%</span>
                  <span className="text-[10px] text-muted ml-auto">14 days</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-card-border hover:bg-card-border/30 cursor-pointer transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-danger/20 text-danger uppercase">Market Event</span>
                  <span className="text-xs text-muted">May 12, 2022</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Terra/Luna Collapse Aftermath</h4>
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-danger" />
                  <span className="text-xs font-bold text-danger">-34.7%</span>
                  <span className="text-[10px] text-muted ml-auto">30 days</span>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Event Details & Chart */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="p-6 rounded-xl bg-card border border-card-border">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-500 uppercase">Regulatory</span>
                    <span className="text-xs text-muted">January 10, 2024</span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">SEC Approves First Spot Bitcoin ETF</h3>
                  <p className="text-sm text-muted mt-1">Major regulatory milestone as SEC approves multiple spot Bitcoin ETF applications.</p>
                </div>
                <div className="flex gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted mb-1">Price Impact</p>
                    <p className="text-xl font-bold text-success">+18.5%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-1">Timeframe</p>
                    <p className="text-xl font-bold text-foreground">7 days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted mb-1">Volatility</p>
                    <p className="text-xl font-bold text-primary">High</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-muted mb-4 uppercase tracking-wider">Price Movement Timeline</h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                      <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 2000', 'dataMax + 2000']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        formatter={(value) => [`$${value}`, 'Price']}
                      />
                      <ReferenceLine x="Event Day" stroke="#F97316" strokeDasharray="3 3" label={{ position: 'top', value: 'Event', fill: '#F97316', fontSize: 10 }} />
                      <Line type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 5 }} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-center text-muted mt-2">Metrics documented 7 days before and after the event</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="rounded-xl bg-card border border-card-border overflow-hidden">
          <div className="p-4 border-b border-card-border">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Similar Current Events</h3>
            </div>
          </div>
          <div className="divide-y divide-card-border">
            
            <div className="p-4 hover:bg-card-border/30 transition-colors flex items-center justify-between cursor-pointer">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted">Active (1 min ago)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-danger/20 text-danger uppercase">92% Match</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Federal Reserve Signals Potential Rate Cuts in Q3 2024</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-xs text-muted">Predicted impact: <strong className="text-success">+4.5%</strong> | Confidence: <strong>88%</strong></span>
                </div>
              </div>
              <Activity className="w-4 h-4 text-muted" />
            </div>

            <div className="p-4 hover:bg-card-border/30 transition-colors flex items-center justify-between cursor-pointer">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-muted">Active (12 min ago)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-orange-500/20 text-orange-500 uppercase">85% Match</span>
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">SEC Approves New Cryptocurrency ETF Framework</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-success" />
                  <span className="text-xs text-muted">Predicted impact: <strong className="text-success">+1.2%</strong> | Confidence: <strong>82%</strong></span>
                </div>
              </div>
              <Activity className="w-4 h-4 text-muted" />
            </div>

          </div>
        </div>

        {/* Small metric cards at the very bottom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
            <h4 className="text-xs font-bold text-primary mb-1">Semantic Matching</h4>
            <p className="text-[10px] text-muted">Uses NLP embeddings to find similar events based on context and nuances.</p>
          </div>
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <h4 className="text-xs font-bold text-blue-500 mb-1">Price Correlation</h4>
            <p className="text-[10px] text-muted">Evaluates historical price movements to identify patterns and trends.</p>
          </div>
          <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <h4 className="text-xs font-bold text-orange-500 mb-1">Weighted Recency</h4>
            <p className="text-[10px] text-muted">Recent events carry higher weights as market conditions evolve.</p>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
