"use client";

import { Globe, Brain, LineChart, Bell, Zap, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: <Globe className="w-5 h-5 text-primary" />,
    title: "Real-Time News Scraping",
    description: "Continuously collect global financial and crypto news from 120+ RSS feeds and sources"
  },
  {
    icon: <Brain className="w-5 h-5 text-primary" />,
    title: "AI Sentiment Analysis",
    description: "Advanced FinBERT model analyzes sentiment and predicts market impact with 87% accuracy"
  },
  {
    icon: <LineChart className="w-5 h-5 text-primary" />,
    title: "Historical Pattern Matching",
    description: "Compare current events with historical data to predict price movements"
  },
  {
    icon: <Bell className="w-5 h-5 text-primary" />,
    title: "Smart Alerts",
    description: "Get instant notifications for high-impact news before the market reacts"
  },
  {
    icon: <Zap className="w-5 h-5 text-primary" />,
    title: "ML Impact Prediction",
    description: "Machine learning models predict Bitcoin price impact across multiple time horizons"
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-primary" />,
    title: "Duplicate Detection",
    description: "Advanced deduplication removes overlapping articles for clean analysis"
  }
];

export default function Features() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Complete Intelligence Pipeline</h2>
        <p className="text-muted">From data collection to actionable predictions in real-time</p>
      </motion.div>
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {features.map((feature, index) => (
          <motion.div 
            key={index}
            variants={itemVariants}
            className="p-8 rounded-2xl bg-card border border-card-border hover:border-primary/50 transition-colors flex flex-col items-start text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
