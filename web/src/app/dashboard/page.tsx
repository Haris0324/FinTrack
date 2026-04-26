"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { TrendingUp, Activity, BarChart3, ArrowUpRight, Search, Filter, Bell } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const mockPriceData = [
  { time: '00:00', price: 42000 }, { time: '04:00', price: 42500 },
  { time: '08:00', price: 43200 }, { time: '12:00', price: 43800 },
  { time: '16:00', price: 43500 }, { time: '20:00', price: 44100 },
  { time: '24:00', price: 44280 },
];

const mockSentimentData = [
  { day: 'Mon', pos: 60, neg: 20, neu: 20 },
  { day: 'Tue', pos: 65, neg: 15, neu: 20 },
  { day: 'Wed', pos: 55, neg: 25, neu: 20 },
  { day: 'Thu', pos: 70, neg: 10, neu: 20 },
  { day: 'Fri', pos: 75, neg: 15, neu: 10 },
  { day: 'Sat', pos: 65, neg: 20, neu: 15 },
  { day: 'Sun', pos: 80, neg: 10, neu: 10 },
];

const mockNews = [
  {
    id: 1,
    title: "Federal Reserve Signals Potential Rate Cuts in Q3 2024",
    time: "2 min ago",
    source: "Bloomberg",
    relevance: "98%",
    sentiment: "POSITIVE",
    impact: "HIGH IMPACT",
    tags: ["Macroeconomics"],
    score: "+0.85",
  },
  {
    id: 2,
    title: "Major Institutional Investors Increase Bitcoin Holdings by 15%",
    time: "8 min ago",
    source: "CoinDesk",
    relevance: "95%",
    sentiment: "POSITIVE",
    impact: "HIGH IMPACT",
    tags: ["Bitcoin"],
    score: "+0.78",
  },
  {
    id: 3,
    title: "SEC Approves New Cryptocurrency ETF Framework",
    time: "12 min ago",
    source: "Reuters",
    relevance: "92%",
    sentiment: "POSITIVE",
    impact: "MEDIUM IMPACT",
    tags: ["Regulation"],
    score: "+0.72",
  },
  {
    id: 4,
    title: "Concerns Over Tether Reserves Spark Market Uncertainty",
    time: "25 min ago",
    source: "Financial Times",
    relevance: "75%",
    sentiment: "NEGATIVE",
    impact: "MEDIUM IMPACT",
    tags: ["Stablecoin"],
    score: "-0.58",
  }
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted">Bitcoin Price</p>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">$44,280</h3>
            <p className="text-xs text-success flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +3.14% (24h)
            </p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted">Overall Sentiment</p>
              <Activity className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-3xl font-bold text-success mb-1">Positive</h3>
            <p className="text-xs text-muted">Score: +0.84</p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted">Articles Today</p>
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">1,247</h3>
            <p className="text-xs text-muted">+124 vs yesterday</p>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted">High Impact News</p>
              <Bell className="w-4 h-4 text-danger" />
            </div>
            <h3 className="text-3xl font-bold text-danger mb-1">12</h3>
            <p className="text-xs text-danger">3 in last hour</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[300px]">
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Bitcoin Price (24h)</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPriceData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }} 
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#F97316" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Sentiment Distribution (7 Days)</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockSentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }} 
                  />
                  <Line type="monotone" dataKey="pos" name="Positive" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="neg" name="Negative" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                  <Line type="monotone" dataKey="neu" name="Neutral" stroke="#9CA3AF" strokeWidth={2} dot={false} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live News Feed */}
        <div className="rounded-xl bg-card border border-card-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-card-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Live News Feed</h3>
              <span className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'High Impact', 'Positive', 'Negative', 'Bitcoin'].map((filter, i) => (
                <button key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${i === 0 ? 'bg-primary border-primary text-white' : 'bg-background border-card-border text-muted hover:text-foreground'}`}>
                  {filter}
                </button>
              ))}
              <div className="relative ml-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input type="text" placeholder="Search news..." className="bg-background border border-card-border rounded-full py-1.5 pl-8 pr-3 text-xs w-48 focus:outline-none focus:border-primary" />
              </div>
            </div>
          </div>

          <div className="divide-y divide-card-border">
            {mockNews.map((news) => (
              <div key={news.id} className="p-5 hover:bg-card-border/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                      news.sentiment === 'POSITIVE' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {news.sentiment}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                      news.impact === 'HIGH IMPACT' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'
                    }`}>
                      {news.impact}
                    </span>
                    {news.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-background border border-card-border text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">{news.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{news.time}</span>
                    <span className="w-1 h-1 rounded-full bg-card-border"></span>
                    <span>{news.source}</span>
                    <span className="w-1 h-1 rounded-full bg-card-border"></span>
                    <span>Relevance: {news.relevance}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-lg font-bold ${parseFloat(news.score) > 0 ? 'text-success' : 'text-danger'}`}>
                    {news.score}
                  </span>
                  <button className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1">
                    Read More <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-card-border flex justify-center">
            <button className="text-xs font-medium text-muted hover:text-foreground transition-colors">
              Load More Articles
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
