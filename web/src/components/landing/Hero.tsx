import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="pt-40 pb-20 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-card-border bg-card/50 text-sm mb-8 text-muted">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
        Live & Monitoring 124 News Sources
      </div>
      
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
        Predict Bitcoin Moves <br />
        <span className="text-gradient">Before They Happen</span>
      </h1>
      
      <p className="text-lg md:text-xl text-muted max-w-3xl mb-10 leading-relaxed">
        Advanced AI system that analyzes global news sentiment and predicts
        cryptocurrency price movements with machine learning precision
      </p>
      
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
        <Link 
          href="/signup" 
          className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium flex items-center justify-center gap-2 transition-colors"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link 
          href="/dashboard" 
          className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-card border border-card-border hover:border-muted text-white font-medium flex items-center justify-center transition-colors"
        >
          View Live Predictions
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {[
          { value: "124+", label: "News Sources" },
          { value: "87%", label: "Prediction Accuracy" },
          { value: "2.4s", label: "Avg Response Time" },
          { value: "24/7", label: "Live Monitoring" },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-xl bg-card/40 border border-card-border backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
            <div className="text-xs text-muted font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
