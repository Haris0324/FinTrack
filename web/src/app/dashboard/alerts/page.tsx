"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { BellRing, Target, Activity, Clock, Settings2, Bell, AlertTriangle, ShieldAlert, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";

const predictionData = [
  { time: 'Now', price: 44280 },
  { time: '4h', price: 44500 },
  { time: '8h', price: 44750 },
  { time: '12h', price: 44600 },
  { time: '16h', price: 44800 },
  { time: '20h', price: 45050 },
  { time: '24h', price: 45230 },
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
            <div className="flex-1 w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictionData}>
                  <defs>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="10" stroke="#10B981" strokeWidth="1" strokeOpacity="0.2" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 500', 'dataMax + 500']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#10B981" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorPred)" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
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
          <div className="p-6 rounded-xl bg-card border border-primary/50 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-2 border-b border-card-border pb-4">
              <Settings2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Alert Settings</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Alert Types</h4>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-card-border bg-background accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-danger flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> High Impact Events</p>
                      <p className="text-[10px] text-muted">Predicted impact &gt; 2%</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 w-4 h-4 rounded border-card-border bg-background accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-orange-500 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Medium Impact Events</p>
                      <p className="text-[10px] text-muted">Predicted impact 0.5-2%</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 w-4 h-4 rounded border-card-border bg-background accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-blue-500 flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> Low Impact Events</p>
                      <p className="text-[10px] text-muted">Predicted impact &lt; 0.5%</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-foreground mb-4">Notification Channels</h4>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted" />
                      <span className="text-sm text-foreground">Push Notifications</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-card-border bg-background accent-primary" />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 text-muted flex items-center justify-center">@</span>
                      <span className="text-sm text-foreground">Email Notifications</span>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-card-border bg-background accent-primary" />
                  </label>
                  
                  <div className="pt-4 border-t border-card-border">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-foreground">Minimum Confidence</label>
                      <span className="text-xs font-bold text-primary">{confidence}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="99" 
                      value={confidence} 
                      onChange={(e) => setConfidence(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-card-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-[10px] text-muted mt-1">
                      <span>50%</span>
                      <span>99%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-card-border">
              <button onClick={() => setShowConfig(false)} className="px-4 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors">
                Cancel
              </button>
              <button onClick={() => setShowConfig(false)} className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Active Alerts List */}
        <div className="rounded-xl bg-card border border-card-border overflow-hidden">
          <div className="p-4 border-b border-card-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Active Alerts</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-bold">
              2 Active
            </span>
          </div>
          <div className="divide-y divide-card-border">
            
            <div className="p-5 hover:bg-card-border/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-danger/20 text-danger uppercase">High Impact</span>
                    <span className="text-[10px] text-muted">2 min ago</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Federal Reserve Signals Rate Cuts - High Impact Detected</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs text-muted">Prediction: <strong className="text-success">+4.5% in 24h</strong> | Confidence: <strong>87%</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:border-primary text-foreground text-xs font-medium rounded-md transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:bg-danger hover:text-white hover:border-danger text-muted text-xs font-medium rounded-md transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 hover:bg-card-border/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-danger/20 text-danger uppercase">High Impact</span>
                    <span className="text-[10px] text-muted">15 min ago</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Major Institutional Bitcoin Accumulation Detected</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs text-muted">Prediction: <strong className="text-success">+1.8% in 24h</strong> | Confidence: <strong>82%</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:border-primary text-foreground text-xs font-medium rounded-md transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:bg-danger hover:text-white hover:border-danger text-muted text-xs font-medium rounded-md transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 hover:bg-card-border/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <ShieldAlert className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-orange-500/20 text-orange-500 uppercase">Medium Impact</span>
                    <span className="text-[10px] text-muted">1 hour ago</span>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">SEC Approves New Crypto ETF Framework</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-xs text-muted">Prediction: <strong className="text-success">+1.2% in 24h</strong> | Confidence: <strong>78%</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:border-primary text-foreground text-xs font-medium rounded-md transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 py-1.5 bg-background border border-card-border hover:bg-danger hover:text-white hover:border-danger text-muted text-xs font-medium rounded-md transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
