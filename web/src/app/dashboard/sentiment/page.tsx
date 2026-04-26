"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Wand2, MessageSquareText, Tags, Cpu, Zap, Activity } from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const sentimentData = [
  { name: 'Positive', value: 542, color: '#10B981' },
  { name: 'Negative', value: 318, color: '#EF4444' },
  { name: 'Neutral', value: 187, color: '#9CA3AF' },
];

const topicData = [
  { subject: 'Regulation', A: 80, fullMark: 100 },
  { subject: 'Adoption', A: 65, fullMark: 100 },
  { subject: 'Technology', A: 90, fullMark: 100 },
  { subject: 'Market', A: 45, fullMark: 100 },
  { subject: 'Security', A: 30, fullMark: 100 },
];

const sourceData = [
  { name: 'Bloomberg', pos: 85, neg: 15, neu: 0 },
  { name: 'CoinDesk', pos: 95, neg: 5, neu: 0 },
  { name: 'Reuters', pos: 70, neg: 20, neu: 10 },
  { name: 'FT', pos: 60, neg: 30, neu: 10 },
  { name: 'WSJ', pos: 75, neg: 20, neu: 5 },
];

export default function SentimentAnalysis() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">NLP & Sentiment Analysis</h2>
          <p className="text-sm text-muted">FinBERT-powered sentiment classification and entity extraction</p>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Articles Scraped</p>
              <h3 className="text-xl font-bold text-foreground">1,247</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-fuchsia-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Text Cleaned</p>
              <h3 className="text-xl font-bold text-foreground">1,198</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Sentiment Analyzed</p>
              <h3 className="text-xl font-bold text-foreground">1,047</h3>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-card-border flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Tags className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Entities Extracted</p>
              <h3 className="text-xl font-bold text-foreground">1,047</h3>
            </div>
          </div>
        </div>

        {/* Top Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[350px]">
          {/* Doughnut Chart */}
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Overall Sentiment Distribution</h3>
            <div className="flex-1 w-full h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={2500}
                    animationEasing="ease-out"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }} 
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col">
            <h3 className="text-sm font-medium text-muted mb-4">Topic Sentiment Scores</h3>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={topicData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Radar name="Sentiment" dataKey="A" stroke="#F97316" fill="#F97316" fillOpacity={0.3} isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-center text-muted mt-2">Higher scores indicate more positive sentiment</p>
          </div>
        </div>

        {/* Source Bar Chart */}
        <div className="p-6 rounded-xl bg-card border border-card-border flex flex-col h-[300px]">
          <h3 className="text-sm font-medium text-muted mb-4">Sentiment by News Source</h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1F2937" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', color: '#f8fafc' }} 
                  cursor={{ fill: '#1F2937', opacity: 0.4 }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="pos" name="Positive" stackId="a" fill="#10B981" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                <Bar dataKey="neg" name="Negative" stackId="a" fill="#EF4444" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
                <Bar dataKey="neu" name="Neutral" stackId="a" fill="#9CA3AF" isAnimationActive={true} animationDuration={2500} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Extracted Entities */}
        <div className="p-6 rounded-xl bg-card border border-card-border">
          <div className="flex items-center gap-2 mb-6">
            <Tags className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Extracted Entities (Last 24h)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h4 className="text-xs font-bold text-muted mb-3 border-b border-card-border pb-2">Cryptocurrencies</h4>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Bitcoin (853)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Ethereum (412)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Tether (218)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary"></span> BNB (120)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-muted mb-3 border-b border-card-border pb-2">Exchanges</h4>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Binance (534)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Coinbase (238)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Kraken (104)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Bitfinex (98)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-muted mb-3 border-b border-card-border pb-2">Regulators</h4>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> SEC (642)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Federal Reserve (387)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> ECB (204)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> CFTC (147)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-muted mb-3 border-b border-card-border pb-2">Key Figures</h4>
              <ul className="space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Jerome Powell (254)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Gary Gensler (156)</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Michael Saylor (148)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-card border border-primary/30 flex items-start gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <Cpu className="w-5 h-5 text-primary mt-1" />
            <div>
              <p className="text-xs font-bold text-foreground mb-1">AI Model</p>
              <h4 className="text-sm font-medium text-muted">FinBERT Transformer</h4>
              <p className="text-[10px] text-muted">Fine-tuned on Bitcoin sentiment data</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-success/30 flex items-start gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-success"></div>
            <Zap className="w-5 h-5 text-success mt-1" />
            <div>
              <p className="text-xs font-bold text-foreground mb-1">Processing Speed</p>
              <h4 className="text-sm font-medium text-muted">~420 articles/min</h4>
              <p className="text-[10px] text-muted">Batch processing enabled</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-blue-500/30 flex items-start gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <Activity className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <p className="text-xs font-bold text-foreground mb-1">Data Quality</p>
              <h4 className="text-sm font-medium text-muted">96.2% clean rate</h4>
              <p className="text-[10px] text-muted">After preprocessing pipeline</p>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
