"use client";

import { Activity, Server, Brain, BellRing, Database, Shield, Users, FileBarChart, Play, Settings, RefreshCw, AlertTriangle, Info, Plus } from "lucide-react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const resourcesData = [
  { time: '00:00', cpu: 30, memory: 40 },
  { time: '04:00', cpu: 25, memory: 38 },
  { time: '08:00', cpu: 45, memory: 55 },
  { time: '12:00', cpu: 75, memory: 65 },
  { time: '16:00', cpu: 60, memory: 60 },
  { time: '20:00', cpu: 50, memory: 50 },
  { time: '24:00', cpu: 35, memory: 45 },
];

const apiData = [
  { time: '00:00', requests: 1200 },
  { time: '04:00', requests: 800 },
  { time: '08:00', requests: 2500 },
  { time: '12:00', requests: 3800 },
  { time: '16:00', requests: 3100 },
  { time: '20:00', requests: 2200 },
  { time: '24:00', requests: 1500 },
];

const sources = [
  { status: 'Active', name: 'Bloomberg', url: 'bloomberg.com/crypto', articles: 136, uptime: '99.9%' },
  { status: 'Active', name: 'CoinDesk', url: 'coindesk.com/feed', articles: 254, uptime: '99.9%' },
  { status: 'Active', name: 'Reuters', url: 'reuters.com/markets/crypto', articles: 142, uptime: '99.2%' },
  { status: 'Active', name: 'Financial Times', url: 'ft.com/cryptocurrency', articles: 98, uptime: '99.5%' },
  { status: 'Warning', name: 'The Block', url: 'theblock.co/rss', articles: 145, uptime: '95.4%' },
  { status: 'Active', name: 'CryptoSlate', url: 'cryptoslate.com/feed', articles: 204, uptime: '99.2%' },
  { status: 'Error', name: 'Bitcoin Magazine', url: 'bitcoinmagazine.com/rss', articles: 0, uptime: '87.1%' },
];

export default function AdminPanel() {
  return (
    <div className="flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Administrative Panel</h2>
          <p className="text-sm text-muted">System configuration, monitoring, and management</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            Live System
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary border border-primary/50 text-sm font-medium rounded-lg hover:bg-primary hover:text-white transition-colors">
            <Settings className="w-4 h-4" />
            System Operations
          </button>
        </div>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="p-4 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-muted">System Scraping</p>
            </div>
            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">Active</span>
          </div>
          <p className="text-xs text-muted">1,247 articles today</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-fuchsia-500" />
              <p className="text-xs font-medium text-muted">NLP Processing</p>
            </div>
            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">Active</span>
          </div>
          <p className="text-xs text-muted">1,047 analyzed</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-500" />
              <p className="text-xs font-medium text-muted">ML Prediction</p>
            </div>
            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">Active</span>
          </div>
          <p className="text-xs text-muted">87.5% accuracy</p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-card-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-danger" />
              <p className="text-xs font-medium text-muted">Alert System</p>
            </div>
            <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-sm">Active</span>
          </div>
          <p className="text-xs text-muted">12 active alerts</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[300px]">
        {/* System Resources */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <h3 className="text-sm font-medium text-foreground mb-4">System Resources (24h)</h3>
          <div className="flex-1 w-full h-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourcesData}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="cpu" name="CPU Usage" stroke="#F97316" fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                <Area type="monotone" dataKey="memory" name="Memory Usage" stroke="#A855F7" fillOpacity={1} fill="url(#colorMemory)" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute top-0 right-0 flex gap-4">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-[10px] text-muted">CPU Usage</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span><span className="text-[10px] text-muted">Memory Usage</span></div>
            </div>
          </div>
        </div>

        {/* API Requests */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <h3 className="text-sm font-medium text-foreground mb-4">API Request Volume (24h)</h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="requests" name="Requests" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t border-card-border">
            <div>
              <p className="text-[10px] text-muted">Avg / Hour</p>
              <p className="text-sm font-bold text-foreground">1,642</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Peak</p>
              <p className="text-sm font-bold text-foreground">3,800</p>
            </div>
            <div>
              <p className="text-[10px] text-muted">Success Rate</p>
              <p className="text-sm font-bold text-success">99.2%</p>
            </div>
          </div>
        </div>
      </div>

      {/* News Sources Table */}
      <div className="rounded-xl bg-card border border-card-border overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">News Sources</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary border border-primary/50 text-xs font-medium rounded-lg hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-6 py-4 text-xs font-medium text-muted">Status</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">Source Name</th>
                <th className="px-6 py-4 text-xs font-medium text-muted">URL</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Articles (24h)</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-center">Uptime</th>
                <th className="px-6 py-4 text-xs font-medium text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {sources.map((source, i) => (
                <tr key={i} className="hover:bg-card-border/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        source.status === 'Active' ? 'bg-success' : source.status === 'Warning' ? 'bg-orange-500' : 'bg-danger'
                      }`}></span>
                      <span className="text-xs text-foreground">{source.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-medium text-foreground">{source.name}</td>
                  <td className="px-6 py-3 text-xs text-muted">{source.url}</td>
                  <td className="px-6 py-3 text-xs text-foreground text-center">{source.articles}</td>
                  <td className="px-6 py-3 text-xs font-medium text-center text-success">{source.uptime}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="p-1.5 text-muted hover:text-primary transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Configuration */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-5 h-5 text-fuchsia-500" />
              <h3 className="text-sm font-medium text-foreground">ML Model Configuration</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Model Version</span>
                <span className="text-foreground font-medium">2.4.1 (FinBERT Transformer)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Last Retrained</span>
                <span className="text-foreground font-medium">March 12, 2024</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Training Samples</span>
                <span className="text-foreground font-medium">104,567</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Current Accuracy</span>
                <span className="text-success font-bold">88.3%</span>
              </div>
            </div>
          </div>
          <button className="mt-8 w-full py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <RefreshCw className="w-4 h-4" />
            Retrain Model
          </button>
        </div>

        {/* Recent Logs */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Recent Logs</h3>
            </div>
            <span className="text-[10px] text-primary hover:underline cursor-pointer">View All</span>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[250px]">
            
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">WARNING</span>
                  <span className="text-xs font-medium text-foreground">The Block</span>
                </div>
                <p className="text-xs text-muted">Rate limit approaching (95/100 req/min)</p>
              </div>
              <span className="text-[10px] text-muted ml-auto">2 min ago</span>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-danger/20 text-danger">ERROR</span>
                  <span className="text-xs font-medium text-foreground">Bitcoin Magazine</span>
                </div>
                <p className="text-xs text-muted">Connection timeout - retrying in 5 minutes</p>
              </div>
              <span className="text-[10px] text-muted ml-auto">15 min ago</span>
            </div>

            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">INFO</span>
                  <span className="text-xs font-medium text-foreground">System</span>
                </div>
                <p className="text-xs text-muted">Model retrained with 10,000 new samples</p>
              </div>
              <span className="text-[10px] text-muted ml-auto">1 hour ago</span>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">WARNING</span>
                  <span className="text-xs font-medium text-foreground">Database</span>
                </div>
                <p className="text-xs text-muted">Storage usage at 78% capacity</p>
              </div>
              <span className="text-[10px] text-muted ml-auto">4 hours ago</span>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Mini Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        <div className="p-3 rounded-lg border border-card-border bg-card hover:bg-card-border/50 cursor-pointer transition-colors flex items-center gap-3">
          <Database className="w-4 h-4 text-primary" />
          <div>
            <p className="text-[10px] font-bold text-foreground">Backup Database</p>
            <p className="text-[9px] text-muted">Create snapshot</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-card-border bg-card hover:bg-card-border/50 cursor-pointer transition-colors flex items-center gap-3">
          <Shield className="w-4 h-4 text-success" />
          <div>
            <p className="text-[10px] font-bold text-foreground">Security Audit</p>
            <p className="text-[9px] text-muted">Run diagnostics</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-card-border bg-card hover:bg-card-border/50 cursor-pointer transition-colors flex items-center gap-3">
          <Users className="w-4 h-4 text-fuchsia-500" />
          <div>
            <p className="text-[10px] font-bold text-foreground">User Management</p>
            <p className="text-[9px] text-muted">Manage access</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-card-border bg-card hover:bg-card-border/50 cursor-pointer transition-colors flex items-center gap-3">
          <FileBarChart className="w-4 h-4 text-orange-500" />
          <div>
            <p className="text-[10px] font-bold text-foreground">Performance Report</p>
            <p className="text-[9px] text-muted">Generate PDF</p>
          </div>
        </div>
      </div>

    </div>
  );
}
