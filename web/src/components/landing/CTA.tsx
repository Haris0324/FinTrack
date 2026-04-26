import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 px-6 max-w-5xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-b from-card to-background p-12 md:p-20 text-center">
        {/* Abstract background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-primary/5 blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-8">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Stay Ahead of the Market?
          </h2>
          
          <p className="text-muted text-lg mb-10 max-w-2xl">
            Join traders using AI-powered sentiment analysis to make informed decisions
          </p>
          
          <Link 
            href="/signup" 
            className="px-8 py-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium flex items-center justify-center gap-2 transition-colors"
          >
            Start Analyzing Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
