"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { BellRing, Target, Activity, Clock, Settings2, Bell, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";

const predictionData = [
  { time: 'Now', price: 44280 },
  { time: '1h', price: 44350 },
  { time: '4h', price: 44500 },
  { time: '12h', price: 44800 },
  { time: '24h', price: 45200 },
  { time: '48h', price: 45800 },
  { time: '7d', price: 46800 },
];

export default function PredictionsAlerts() {
  const [showConfig, setShowConfig] = useState(false);
  const [confidence, setConfidence] = useState(70);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Predictions & Alerts</h2>
            <p className="text-sm text-muted">ML-powered impact predictions and intelligent alerts</p>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Configure Alerts
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-1">24h Prediction</p>
              <h3 className="text-2xl font-bold text-success">+2.1%</h3>
              <p className="text-[10px] text-muted mt-1">Target: $45,230</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <Target className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-1">Confidence Level</p>
              <h3 className="text-2xl font-bold text-foreground">85%</h3>
              <p className="text-[10px] text-muted mt-1">High accuracy</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <BellRing className="w-5 h-5 text-danger" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-1">Active Alerts</p>
              <h3 className="text-2xl font-bold text-foreground">12</h3>
              <p className="text-[10px] text-danger mt-1">2 high impact</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted mb-1">Avg Response</p>
              <h3 className="text-2xl font-bold text-foreground">2.4s</h3>
              <p className="text-[10px] text-muted mt-1">From news to alert</p>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Prediction Chart */}
          <div className="lg:col-span-2 p-6 rounded-xl bg-card border border-card-border flex flex-col h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-medium text-foreground">Price Movement Prediction</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-white">24h</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md bg-background border border-card-border text-muted hover:text-foreground">48h</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md bg-background border border-card-border text-muted hover:text-foreground">7d</button>
              </div>
            </div>
            <div className="flex-1 w-full h-full relative -ml-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictionData}>
                  <defs>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 500', 'dataMax + 500']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPred)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 right-4 text-right">
                <p className="text-[10px] text-muted">Current Price:</p>
                <p className="text-xs font-bold text-foreground mb-1">$44,280</p>
                <p className="text-[10px] text-muted">Predicted (24h):</p>
                <p className="text-xs font-bold text-success mb-1">$45,230 (+2.1%)</p>
                <p className="text-[10px] text-muted">Confidence:</p>
                <div className="w-24 h-1.5 bg-card-border rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact by Category */}
          <div className="lg:col-span-1 p-6 rounded-xl bg-card border border-card-border flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-6">Impact by Category</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Regulation</span>
                    <span className="text-success">+89</span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '89%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Adoption</span>
                    <span className="text-success">+72</span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Market</span>
                    <span className="text-muted">-45</span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div className="h-full bg-muted" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Technology</span>
                    <span className="text-success">+88</span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '88%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground">Macro Econ</span>
                    <span className="text-success">+65</span>
                  </div>
                  <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                    <div className="h-full bg-success" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-card-border">
              <h4 className="text-xs font-medium text-muted mb-2">Overall Market Sentiment</h4>
              <p className="text-2xl font-bold text-success">Bullish</p>
              <p className="text-xs text-muted mt-1">Strong positive indicators across most categories.</p>
            </div>
          </div>
        </div>

        {/* Alert Configuration Panel */}
        {showConfig && (
          <div className="p-6 rounded-xl bg-[#0B1120] border border-card-border flex flex-col gap-8 mb-6 animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-lg font-bold text-white border-b border-card-border pb-4">Alert Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h4 className="text-sm font-medium text-white mb-6">Alert Types</h4>
                <div className="space-y-6">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-danger mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">High Impact Events</p>
                        <p className="text-xs text-muted mt-1">Predicted impact &gt; 2%</p>
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-card-border bg-background accent-[#F97316] cursor-pointer" />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Medium Impact Events</p>
                        <p className="text-xs text-muted mt-1">Predicted impact 0.5-2%</p>
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-card-border bg-background accent-[#F97316] cursor-pointer" />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Low Impact Events</p>
                        <p className="text-xs text-muted mt-1">Predicted impact &lt; 0.5%</p>
                      </div>
                    </div>
                    <input type="checkbox" className="w-5 h-5 rounded border-card-border bg-background accent-[#F97316] cursor-pointer" />
                  </label>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-white mb-6">Notification Channels</h4>
                <div className="space-y-6">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Push Notifications</p>
                        <p className="text-xs text-muted mt-1">Browser alerts</p>
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-card-border bg-background accent-[#F97316] cursor-pointer" />
                  </label>
                  
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-start gap-3">
                      <span className="w-5 h-5 text-blue-500 flex items-center justify-center font-serif text-lg mt-0.5">@</span>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">Email Notifications</p>
                        <p className="text-xs text-muted mt-1">Digest summary</p>
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-card-border bg-background accent-[#F97316] cursor-pointer" />
                  </label>
                  
                  <div className="pt-6 mt-6">
                    <div className="mb-4">
                      <p className="text-sm font-bold text-white mb-1">Minimum Confidence</p>
                      <p className="text-xs text-muted">Only alert for predictions above this confidence level</p>
                    </div>
                    <div className="relative pt-6">
                      <input 
                        type="range" 
                        min="50" 
                        max="95" 
                        value={confidence} 
                        onChange={(e) => setConfidence(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#334155] rounded-lg appearance-none cursor-pointer accent-[#F97316] relative z-10"
                      />
                      <div className="absolute top-0 w-full flex justify-center z-0">
                        <span className="text-lg font-bold text-[#F97316]">{confidence}%</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold text-muted mt-2">
                        <span>50%</span>
                        <span>95%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end items-center gap-6 mt-8 pt-6 border-t border-card-border">
              <button onClick={() => setShowConfig(false)} className="text-xs font-bold text-muted hover:text-white transition-colors">
                Reset to Default
              </button>
              <button onClick={() => setShowConfig(false)} className="px-6 py-2.5 bg-[#F97316] hover:bg-[#ea580c] text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-orange-500/20">
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Active Alerts List */}
        <div className="rounded-xl bg-background border-none overflow-hidden">
          <div className="pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-[#F97316]" />
              <h3 className="text-lg font-bold text-white">Active Alerts</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-danger/10 text-danger text-xs font-bold border border-danger/20">
              2 Active
            </span>
          </div>
          <div className="space-y-4">
            
            {/* Alert Item 1 */}
            <div className="border border-card-border rounded-xl bg-[#0B1120] overflow-hidden">
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full border border-danger/30 text-danger bg-danger/5 uppercase tracking-wide">High Impact</span>
                  <span className="text-[11px] text-muted">2 min ago</span>
                </div>
                <h4 className="text-base font-bold text-white">Federal Reserve Signals Rate Cuts - High Impact Detected</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted">Prediction: <strong className="text-success">+2.5% in 24h</strong> &nbsp;&nbsp;Confidence: <strong className="text-white">87%</strong></span>
                </div>
              </div>
              <div className="bg-[#1e293b] p-3 flex gap-3 mx-2 mb-2 rounded-lg">
                <button className="flex-1 py-2 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md transition-colors">
                  View Details
                </button>
                <button className="px-6 py-2 bg-[#334155] hover:bg-danger text-white text-xs font-bold rounded-md transition-colors">
                  Dismiss
                </button>
              </div>
            </div>

            {/* Alert Item 2 */}
            <div className="border border-card-border rounded-xl bg-[#0B1120] overflow-hidden">
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full border border-danger/30 text-danger bg-danger/5 uppercase tracking-wide">High Impact</span>
                  <span className="text-[11px] text-muted">15 min ago</span>
                </div>
                <h4 className="text-base font-bold text-white">Major Institutional Bitcoin Accumulation Detected</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted">Prediction: <strong className="text-success">+1.8% in 24h</strong> &nbsp;&nbsp;Confidence: <strong className="text-white">82%</strong></span>
                </div>
              </div>
              <div className="bg-[#1e293b] p-3 flex gap-3 mx-2 mb-2 rounded-lg">
                <button className="flex-1 py-2 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md transition-colors">
                  View Details
                </button>
                <button className="px-6 py-2 bg-[#334155] hover:bg-danger text-white text-xs font-bold rounded-md transition-colors">
                  Dismiss
                </button>
              </div>
            </div>

            {/* Alert Item 3 */}
            <div className="border border-card-border rounded-xl bg-[#0B1120] overflow-hidden">
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-success" />
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full border border-orange-500/30 text-orange-500 bg-orange-500/5 uppercase tracking-wide">Medium Impact</span>
                  <span className="text-[11px] text-muted">1 hour ago</span>
                </div>
                <h4 className="text-base font-bold text-white">SEC Approves New Crypto ETF Framework</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted">Prediction: <strong className="text-success">+1.2% in 24h</strong> &nbsp;&nbsp;Confidence: <strong className="text-white">78%</strong></span>
                </div>
              </div>
              <div className="bg-[#1e293b] p-3 flex gap-3 mx-2 mb-2 rounded-lg">
                <button className="flex-1 py-2 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md transition-colors">
                  View Details
                </button>
                <button className="px-6 py-2 bg-[#334155] hover:bg-danger text-white text-xs font-bold rounded-md transition-colors">
                  Dismiss
                </button>
              </div>
            </div>

            {/* Alert Item 4 */}
            <div className="border border-card-border rounded-xl bg-[#0B1120] overflow-hidden">
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-bold px-3 py-0.5 rounded-full border border-orange-500/30 text-orange-500 bg-orange-500/5 uppercase tracking-wide">Medium Impact</span>
                  <span className="text-[11px] text-muted">2 hours ago</span>
                </div>
                <h4 className="text-base font-bold text-white">Tether Reserves Audit Concerns Emerge</h4>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted">Prediction: <strong className="text-danger">-0.8% in 12h</strong> &nbsp;&nbsp;Confidence: <strong className="text-white">65%</strong></span>
                </div>
              </div>
              <div className="bg-[#1e293b] p-3 flex gap-3 mx-2 mb-2 rounded-lg">
                <button className="flex-1 py-2 bg-[#334155] hover:bg-[#475569] text-white text-xs font-bold rounded-md transition-colors">
                  View Details
                </button>
                <button className="px-6 py-2 bg-[#334155] hover:bg-danger text-white text-xs font-bold rounded-md transition-colors">
                  Dismiss
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
