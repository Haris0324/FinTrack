"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { BellRing, Target, Activity, Clock, Settings2, Bell, AlertTriangle, ShieldAlert, TrendingUp, ChevronRight, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useMemo } from "react";

const predictionData = {
  "24h": [
    { time: 'Now', price: 44280 },
    { time: '1h', price: 44350 },
    { time: '4h', price: 44520 },
    { time: '12h', price: 44800 },
    { time: '24h', price: 45200 },
  ],
  "48h": [
    { time: 'Now', price: 44280 },
    { time: '4h', price: 44520 },
    { time: '12h', price: 44800 },
    { time: '24h', price: 45200 },
    { time: '48h', price: 45800 },
  ],
  "7d": [
    { time: 'Now', price: 44280 },
    { time: '12h', price: 44800 },
    { time: '24h', price: 45200 },
    { time: '48h', price: 45800 },
    { time: '7d', price: 47000 },
  ]
};

const activeAlertsData = [
  {
    id: 1,
    type: "HIGH IMPACT",
    time: "2 min ago",
    title: "Federal Reserve Signals Rate Cuts - High Impact Detected",
    prediction: "+2.5% in 24h",
    confidence: "87%",
    status: "active"
  },
  {
    id: 2,
    type: "HIGH IMPACT",
    time: "15 min ago",
    title: "Major Institutional Bitcoin Accumulation Detected",
    prediction: "+1.8% in 24h",
    confidence: "82%",
    status: "active"
  },
  {
    id: 3,
    type: "MEDIUM IMPACT",
    time: "1 hour ago",
    title: "SEC Approves New Crypto ETF Framework",
    prediction: "+1.2% in 24h",
    confidence: "78%",
    status: "active"
  },
  {
    id: 4,
    type: "MEDIUM IMPACT",
    time: "2 hours ago",
    title: "Tether Reserves Audit Concerns Emerge",
    prediction: "-0.8% in 12h",
    confidence: "65%",
    status: "active"
  }
];

export default function PredictionsAlerts() {
  const [showConfig, setShowConfig] = useState(false);
  const [timeframe, setTimeframe] = useState<"24h" | "48h" | "7d">("24h");
  const [confidence, setConfidence] = useState(70);
  const [alerts, setAlerts] = useState(activeAlertsData);

  const dismissAlert = (id: number) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const chartData = useMemo(() => predictionData[timeframe], [timeframe]);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-0.5"><span className="text-gradient">Predictions & Alerts</span></h2>
            <p className="text-xs text-muted">ML-powered impact predictions and intelligent alerts</p>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20"
          >
            <Settings2 className="w-4 h-4" />
            Configure Alerts
          </button>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50 group hover:border-success/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted mb-1">24h Prediction</p>
              <h3 className="text-xl font-bold text-success">+2.1%</h3>
              <p className="text-[9px] text-muted mt-1">Target: $45,200</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50 group hover:border-orange-500/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-orange-500" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted mb-1">Confidence Level</p>
              <h3 className="text-xl font-bold text-foreground">85%</h3>
              <p className="text-[9px] text-muted mt-1">High accuracy</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50 group hover:border-danger/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-danger" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted mb-1">Active Alerts</p>
              <h3 className="text-xl font-bold text-foreground">12</h3>
              <p className="text-[9px] text-danger mt-1">2 high impact</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#0b1120] border border-card-border/50 group hover:border-blue-500/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted mb-1">Avg Response</p>
              <h3 className="text-xl font-bold text-foreground">2.4s</h3>
              <p className="text-[9px] text-muted mt-1">From news to alert</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Prediction Chart */}
          <div className="lg:col-span-2 p-5 rounded-xl bg-[#0b1120] border border-card-border/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-foreground">Price Movement Prediction</h3>
              <div className="flex p-1 bg-background/50 rounded-lg border border-card-border/50">
                {(["24h", "48h", "7d"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                      timeframe === tf 
                        ? "bg-orange-500 text-white shadow-md" 
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#1F2937" opacity={0.5} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#475569" 
                    fontSize={10} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    axisLine={false} 
                    tickLine={false} 
                    domain={['dataMin - 100', 'dataMax + 100']}
                    ticks={[43780, 44630, 45480, 47000]}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#1e293b] border border-card-border p-3 rounded-lg shadow-2xl">
                            <p className="text-[11px] font-bold text-white mb-1">{label}</p>
                            <p className="text-[11px] text-success">predicted : {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                    isAnimationActive={false}
                    dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-card-border/30">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Current Price:</p>
                  <p className="text-xs font-bold text-foreground">$44,280</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Predicted ({timeframe}):</p>
                  <p className="text-xs font-bold text-success">$45,200 (+2.1%)</p>
                </div>
              </div>
              <div className="w-full sm:w-48">
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-muted">Confidence:</span>
                  <span className="text-success font-bold">85%</span>
                </div>
                <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact by Category */}
          <div className="lg:col-span-1 p-5 rounded-xl bg-[#0b1120] border border-card-border/50 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-6">Impact by Category</h3>
              <div className="space-y-5">
                {[
                  { name: "Regulation", val: 85, impact: "+85" },
                  { name: "Adoption", val: 72, impact: "+72" },
                  { name: "Market", val: 45, impact: "45" },
                  { name: "Technology", val: 38, impact: "+38" },
                  { name: "Macro Econ", val: 65, impact: "+65" }
                ].map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center text-[11px] mb-2">
                      <span className="text-foreground font-medium">{item.name}</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-success" />
                        <span className="text-foreground font-bold">{item.impact}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-card-border/50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.val > 50 ? 'bg-success' : 'bg-muted'}`} 
                        style={{ width: `${item.val}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-card-border/30">
              <h4 className="text-[10px] font-medium text-muted mb-1.5">Overall Market Sentiment</h4>
              <p className="text-xl font-bold text-success mb-1">Bullish</p>
              <p className="text-[10px] text-muted leading-relaxed">Strong positive indicators across most categories.</p>
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="lg:col-span-3 p-5 rounded-xl bg-[#0b1120] border border-card-border/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-foreground">Active Alerts</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20">
                {alerts.filter(a => a.type === "HIGH IMPACT").length} Active
              </span>
            </div>
            
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="group p-4 bg-[#0f172a] border border-card-border/30 rounded-xl hover:bg-card-border/50 transition-all">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-3.5 h-3.5 ${alert.type === 'HIGH IMPACT' ? 'text-danger' : 'text-orange-500'}`} />
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          alert.type === 'HIGH IMPACT' 
                            ? 'bg-danger/10 text-danger border-danger/20' 
                            : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                        }`}>
                          {alert.type}
                        </span>
                        <span className="text-[10px] text-muted">{alert.time}</span>
                      </div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{alert.title}</h4>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3 h-3 text-success" />
                          <span className="text-[10px] text-muted">Prediction: <strong className="text-success">{alert.prediction}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted">Confidence: <strong className="text-foreground">{alert.confidence}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="flex-1 md:flex-none px-4 py-1.5 bg-card-border/50 hover:bg-card-border text-foreground text-[11px] font-bold rounded-lg transition-colors">
                        View Details
                      </button>
                      <button 
                        onClick={() => dismissAlert(alert.id)}
                        className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-all"
                      >
                        <span className="text-[11px] font-bold px-1">Dismiss</span>
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 w-full h-1 bg-card-border/30 rounded-full overflow-hidden">
                    <div className="h-full bg-card-border/50" style={{ width: '100%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Settings */}
          {showConfig && (
            <div className="lg:col-span-3 p-6 rounded-xl bg-[#0b1120] border border-card-border flex flex-col gap-8 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-card-border/30 pb-4">
                <h3 className="text-base font-bold text-white">Alert Settings</h3>
                <button onClick={() => setShowConfig(false)} className="p-1 hover:bg-card-border/50 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-muted" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-6">Alert Types</h4>
                  <div className="space-y-6">
                    {[
                      { label: "High Impact Events", desc: "Predicted impact > 2%", icon: AlertTriangle, color: "text-danger" },
                      { label: "Medium Impact Events", desc: "Predicted impact 0.5-2%", icon: AlertTriangle, color: "text-orange-500" },
                      { label: "Low Impact Events", desc: "Predicted impact < 0.5%", icon: ShieldAlert, color: "text-blue-500" }
                    ].map((type, i) => (
                      <div key={type.label} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-card-border/30 flex items-center justify-center`}>
                            <type.icon className={`w-4 h-4 ${type.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{type.label}</p>
                            <p className="text-[10px] text-muted">{type.desc}</p>
                          </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${i < 2 ? 'bg-orange-500' : 'bg-card-border'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${i < 2 ? 'right-1' : 'left-1'}`}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-6">Notification Channels</h4>
                  <div className="space-y-6">
                    {[
                      { label: "Push Notifications", desc: "Browser alerts", icon: Bell, checked: true },
                      { label: "Email Notifications", desc: "Digest summary", icon: BellRing, checked: true }
                    ].map((channel) => (
                      <div key={channel.label} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-card-border/30 flex items-center justify-center">
                            <channel.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{channel.label}</p>
                            <p className="text-[10px] text-muted">{channel.desc}</p>
                          </div>
                        </div>
                        <div className="w-5 h-5 rounded border-2 border-orange-500 flex items-center justify-center bg-orange-500 text-white">
                          <Activity className="w-3 h-3" />
                        </div>
                      </div>
                    ))}

                    <div className="pt-6 border-t border-card-border/30">
                      <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-bold text-white">Minimum Confidence</p>
                        <span className="text-sm font-bold text-orange-500">{confidence}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="95" 
                        value={confidence}
                        onChange={(e) => setConfidence(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-card-border rounded-full appearance-none cursor-pointer accent-orange-500"
                      />
                      <div className="flex justify-between mt-2 text-[10px] text-muted font-medium">
                        <span>50%</span>
                        <span>70%</span>
                        <span>95%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-6 border-t border-card-border/30">
                <button className="px-4 py-2 text-xs font-bold text-muted hover:text-white transition-colors">Reset to Default</button>
                <button 
                  onClick={() => setShowConfig(false)}
                  className="px-6 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
