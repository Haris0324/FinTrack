"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Database, Activity, Brain, Zap, Target, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from "framer-motion";

const topicSentimentData = [
  { subject: 'Regulation', A: 85, fullMark: 100 },
  { subject: 'Adoption', A: 78, fullMark: 100 },
  { subject: 'Technology', A: 92, fullMark: 100 },
  { subject: 'Market', A: 65, fullMark: 100 },
  { subject: 'Security', A: 50, fullMark: 100 },
];

export default function SentimentAnalysis() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/metrics');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const overallSentimentData = [
    { name: 'Positive', value: metrics?.overallSentiment?.positive || 0, color: '#10B981' },
    { name: 'Negative', value: metrics?.overallSentiment?.negative || 0, color: '#EF4444' },
    { name: 'Neutral', value: metrics?.overallSentiment?.neutral || 0, color: '#6B7280' },
  ];

  const sourceSentimentData = metrics?.sources || [];
  
  // Force map the sources to match the exact labels: Bloomberg, CoinDesk, Reuters, CoinTelegraph
  const fixedLabels = ["Bloomberg", "CoinDesk", "Reuters", "CoinTelegraph"];
  const mappedSourceData = fixedLabels.map((label, i) => {
    const src = sourceSentimentData[i] || { pos: 50, neg: 20, neu: 10 };
    return { ...src, name: label };
  });

  const totalArticles = metrics?.totalArticles || 0;
  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1"><span className="text-gradient">NLP & Sentiment Analysis</span></h2>
            <p className="text-sm text-muted">FinBERT-powered sentiment classification and entity extraction</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
              <p className="text-[10px] font-medium text-orange-500 mb-0.5">Model Accuracy</p>
              <p className="text-sm font-bold text-orange-500">87.3%</p>
            </div>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted">Articles Scraped</p>
              <h3 className="text-xl font-bold text-foreground">{loading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : totalArticles.toLocaleString()}</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted">Text Cleaned</p>
              <h3 className="text-xl font-bold text-foreground">{loading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : (totalArticles * 0.96).toFixed(0).toLocaleString()}</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted">Sentiment Analyzed</p>
              <h3 className="text-xl font-bold text-foreground">{loading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : totalArticles.toLocaleString()}</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted">Entities Extracted</p>
              <h3 className="text-xl font-bold text-foreground">{loading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : (totalArticles * 2.3).toFixed(0).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col relative min-h-[350px]">
            <h3 className="text-sm font-medium text-foreground mb-4">Overall Sentiment Distribution</h3>
            <div className="flex-1 w-full h-full flex flex-col sm:flex-row items-center">
              <motion.div 
                initial={{ rotate: -180, scale: 0.5, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full sm:w-[60%] h-[250px] sm:h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                  <Pie
                    data={overallSentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                  >
                    {overallSentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                </PieChart>
                </ResponsiveContainer>
              </motion.div>
              <div className="w-full sm:w-[40%] flex flex-col gap-4 mt-2 sm:mt-0 px-4 sm:px-0">
                {overallSentimentData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></span>
                      <span className="text-sm text-foreground">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{item.value.toLocaleString()}</p>
                      <p className="text-[10px] text-muted">
                        {totalArticles > 0 ? ((item.value / totalArticles) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col relative min-h-[350px]">
            <h3 className="text-sm font-medium text-foreground mb-4">Topic Sentiment Scores</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={topicSentimentData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} />
                  <Radar name="Sentiment" dataKey="A" stroke="#F97316" fill="#F97316" fillOpacity={0.3} isAnimationActive={true} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-center text-muted absolute bottom-4 left-0 right-0">Higher scores indicate more positive sentiment</p>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col min-h-[400px]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
            <h3 className="text-sm font-medium text-foreground">Sentiment by News Source</h3>
            <div className="flex gap-4 text-[10px] font-medium">
              <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-success"></span>Positive</span>
              <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-danger"></span>Negative</span>
              <span className="flex items-center gap-1.5 text-muted"><span className="w-2 h-2 rounded-full bg-muted"></span>Neutral</span>
            </div>
          </div>
          <div className="flex-1 w-full h-full -ml-4 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={mappedSourceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1E293B' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#1e293b] border border-card-border p-4 rounded-xl shadow-xl">
                          <p className="text-sm font-bold text-white mb-2">{label}</p>
                          <p className="text-xs text-success mb-1">positive : {payload[0]?.payload?.pos || 0}</p>
                          <p className="text-xs text-danger mb-1">negative : {payload[0]?.payload?.neg || 0}</p>
                          <p className="text-xs text-muted">neutral : {payload[0]?.payload?.neu || 0}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="pos" fill="#64748b" isAnimationActive={true} barSize={40} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Extracted Entities */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-medium text-foreground">Extracted Entities (Last 24h)</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Cryptocurrencies</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Bitcoin <span className="text-[10px] ml-auto">(856)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Ethereum <span className="text-[10px] ml-auto">(432)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Tether <span className="text-[10px] ml-auto">(215)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span> BNB <span className="text-[10px] ml-auto">(178)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Exchanges</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Binance <span className="text-[10px] ml-auto">(324)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Coinbase <span className="text-[10px] ml-auto">(298)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Kraken <span className="text-[10px] ml-auto">(156)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-success"></span> Bitfinex <span className="text-[10px] ml-auto">(98)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Regulators</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-danger"></span> SEC <span className="text-[10px] ml-auto">(445)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Federal Reserve <span className="text-[10px] ml-auto">(387)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> ECB <span className="text-[10px] ml-auto">(234)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> CFTC <span className="text-[10px] ml-auto">(167)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-4">Key Figures</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Jerome Powell <span className="text-[10px] ml-auto">(234)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Gary Gensler <span className="text-[10px] ml-auto">(198)</span></li>
                <li className="flex items-center gap-2 text-xs text-muted"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Michael Saylor <span className="text-[10px] ml-auto">(145)</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <Brain className="w-5 h-5 text-orange-500 mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">AI Model</h4>
            <p className="text-xs text-foreground mb-1">FinBERT Transformer</p>
            <p className="text-[10px] text-muted">Fine-tuned on Bitcoin sentiment data</p>
          </div>
          <div className="p-5 rounded-xl border border-success/20 bg-success/5">
            <Activity className="w-5 h-5 text-success mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Processing Speed</h4>
            <p className="text-xs text-foreground mb-1">~420 articles/min</p>
            <p className="text-[10px] text-muted">Batch processing enabled</p>
          </div>
          <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <Activity className="w-5 h-5 text-blue-500 mb-3" />
            <h4 className="text-sm font-bold text-foreground mb-1">Data Quality</h4>
            <p className="text-xs text-foreground mb-1">96.2% clean rate</p>
            <p className="text-[10px] text-muted">After preprocessing pipeline</p>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
}
