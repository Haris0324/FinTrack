"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { TrendingUp, Activity, BarChart3, ArrowUpRight, Search, Filter, Bell } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { motion } from "framer-motion";

const mockSentimentData = [
  { day: 'Mon', pos: 45, neg: 20, neu: 20 },
  { day: 'Tue', pos: 52, neg: 15, neu: 20 },
  { day: 'Wed', pos: 38, neg: 25, neu: 20 },
  { day: 'Thu', pos: 60, neg: 10, neu: 20 },
  { day: 'Fri', pos: 55, neg: 15, neu: 10 },
  { day: 'Sat', pos: 48, neg: 20, neu: 15 },
  { day: 'Sun', pos: 66, neg: 10, neu: 10 },
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
  const [newsData, setNewsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Live BTC States
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [btcChange, setBtcChange] = useState<string>("+0.00%");
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Ref for auto-scrolling to live news
  const newsSectionRef = useRef<HTMLDivElement>(null);

  // WebSocket for Live BTC Price
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.c) setBtcPrice(parseFloat(data.c));
      if (data.P) {
        const change = parseFloat(data.P);
        setBtcChange(`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);
      }
    };

    return () => ws.close();
  }, []);

  // Fetch Historical BTC Data for Chart
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1");
        if (res.ok) {
          const data = await res.json();
          const prices = data.prices;
          
          // Downsample to roughly 24 points (every ~1 hour) for a cleaner chart
          const formatted = prices.filter((_: any, i: number) => i % 12 === 0).map((point: [number, number]) => {
            const date = new Date(point[0]);
            return {
              time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
              price: parseFloat(point[1].toFixed(2))
            };
          });
          
          setChartData(formatted);
        }
      } catch (error) {
        console.error("Failed to fetch BTC chart data", error);
      }
    };
    
    fetchChartData();
  }, []);

  const fetchNews = async (pageNum: number, isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsLoadingMore(true);

      const response = await fetch(`/api/news?page=${pageNum}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        if (data.news.length < 20) setHasMore(false);
        
        if (isInitial) {
          setNewsData(data.news || []);
        } else {
          setNewsData(prev => [...prev, ...data.news]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNews(1, true);
  }, []);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, false);
  };

  const filteredNews = newsData.filter(news => {
    const matchesSearch = news.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (news.summary && news.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filter === 'All') return true;
    if (filter === 'High Impact') return news.impact === 'HIGH IMPACT';
    if (filter === 'Positive') return news.sentiment === 'POSITIVE';
    if (filter === 'Negative') return news.sentiment === 'NEGATIVE';
    if (filter === 'Bitcoin') return (news.tags || []).includes('Bitcoin') || news.title.toLowerCase().includes('bitcoin');
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.published || a.scraped_at || 0).getTime();
    const dateB = new Date(b.published || b.scraped_at || 0).getTime();
    return dateB - dateA;
  });

  // Custom tooltips
  const CustomPriceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e293b] border border-card-border p-3 rounded-lg shadow-xl min-w-[120px]">
          <p className="text-sm font-bold text-white mb-2">{label}</p>
          <p className="text-sm text-[#F97316]">price : ${payload[0]?.value?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  const CustomSentimentTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // payload[0] is positive, payload[1] is negative, payload[2] is neutral
      return (
        <div className="bg-[#1e293b] border border-card-border p-4 rounded-xl shadow-xl min-w-[140px]">
          <p className="text-sm font-bold text-white mb-3">{label}</p>
          <p className="text-sm text-success mb-1.5">positive : {payload[0]?.payload?.pos || 0}</p>
          <p className="text-sm text-danger mb-1.5">negative : {payload[0]?.payload?.neg || 0}</p>
          <p className="text-sm text-muted">neutral : {payload[0]?.payload?.neu || 0}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-xl bg-card border border-card-border">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted">Bitcoin Price</p>
              <TrendingUp className={`w-4 h-4 ${btcChange.startsWith('+') ? 'text-success' : 'text-danger'}`} />
            </div>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              {btcPrice ? `$${btcPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'Loading...'}
            </h3>
            <p className={`text-xs flex items-center gap-1 ${btcChange.startsWith('+') ? 'text-success' : 'text-danger'}`}>
              <ArrowUpRight className={`w-3 h-3 ${btcChange.startsWith('-') && 'rotate-180'}`} /> {btcChange} (24h)
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col h-[300px] lg:h-auto min-h-[300px]">
            <h3 className="text-sm font-medium text-foreground mb-4">Bitcoin Price (24h)</h3>
            <div className="flex-1 w-full h-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.length > 0 ? chartData : [{ time: 'Loading', price: 0 }]}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={true} />
                  <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                  <Tooltip content={<CustomPriceTooltip />} cursor={{ stroke: '#9CA3AF', strokeWidth: 1, strokeDasharray: '0' }} />
                  <Area type="monotone" dataKey="price" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col h-[300px] lg:h-auto min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-foreground">Sentiment Distribution (7 Days)</h3>
              <div className="flex gap-4 text-[10px] font-medium">
                <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-success"></span>Positive</span>
                <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-danger"></span>Negative</span>
                <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-muted"></span>Neutral</span>
              </div>
            </div>
            <div className="flex-1 w-full h-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockSentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={true} />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} domain={[0, 80]} />
                  <Tooltip content={<CustomSentimentTooltip />} cursor={{ stroke: '#9CA3AF', strokeWidth: 1 }} />
                  {/* We only draw the Positive line (grayed out somewhat) with white dots to match Pic 1 exactly */}
                  <Line type="natural" dataKey="pos" stroke="#9CA3AF" strokeWidth={2} dot={{ r: 3, fill: '#E5E7EB', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />

                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Live News Feed */}
        <div id="live-news" ref={newsSectionRef} className="rounded-xl bg-card border border-card-border overflow-hidden flex flex-col scroll-mt-24">
          <div className="p-4 border-b border-card-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground">Live News Feed</h3>
              <span className="flex items-center gap-1 text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['All', 'High Impact', 'Positive', 'Negative', 'Bitcoin'].map((f, i) => (
                <button 
                  key={i} 
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${filter === f ? 'bg-primary border-primary text-white' : 'bg-background border-card-border text-muted hover:text-foreground transition-colors'}`}>
                  {f}
                </button>
              ))}
              <div className="relative ml-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news..." 
                  className="bg-background border border-card-border rounded-full py-1.5 pl-8 pr-3 text-xs w-full sm:w-48 focus:outline-none focus:border-primary" 
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-card-border">
            {isLoading ? (
              <div className="p-8 text-center text-muted">Loading live news...</div>
            ) : filteredNews.length === 0 ? (
              <div className="p-8 text-center text-muted">No news articles found matching your criteria.</div>
            ) : (
              filteredNews.map((news) => (
                <div key={news._id} className="p-5 hover:bg-card-border/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                        news.sentiment === 'POSITIVE' ? 'bg-success/10 text-success' : 
                        news.sentiment === 'NEGATIVE' ? 'bg-danger/10 text-danger' : 
                        'bg-muted/10 text-foreground'
                      }`}>
                        {news.sentiment}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                        news.impact === 'HIGH IMPACT' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'
                      }`}>
                        {news.impact}
                      </span>
                      {(news.tags || ['Crypto']).map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-background border border-card-border text-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">{news.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-muted">
                      <span>{new Date(news.published || news.scraped_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(news.published || news.scraped_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="w-1 h-1 rounded-full bg-card-border"></span>
                      <span>{news.source}</span>
                      <span className="w-1 h-1 rounded-full bg-card-border"></span>
                      <span>Relevance: {news.relevance || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 mt-2 sm:mt-0">
                    <span className={`text-lg font-bold ${parseFloat(news.score) > 0 ? 'text-success' : parseFloat(news.score) < 0 ? 'text-danger' : 'text-muted'}`}>
                      {parseFloat(news.score) > 0 ? `+${news.score}` : news.score}
                    </span>
                    <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1">
                      Read More <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {hasMore && filteredNews.length > 0 && filter === 'All' && searchQuery === '' && (
            <div className="p-4 border-t border-card-border flex justify-center">
              <button 
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-xs font-medium text-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? "Loading..." : "Load More Articles"}
              </button>
            </div>
          )}
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
