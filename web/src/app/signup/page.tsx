"use client";

import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import { Eye, Mail, User, Lock } from "lucide-react";
import { signIn } from "next-auth/react";

export default function SignUp() {
  const features = [
    {
      title: "Real-time News Analysis",
      description: "Monitor 124+ sources with AI sentiment detection",
    },
    {
      title: "ML-Powered Predictions",
      description: "87% accuracy in price movement predictions",
    },
    {
      title: "Instant Alerts",
      description: "Get notified before major market movements",
    },
    {
      title: "Historical Pattern Matching",
      description: "Learn from 5 years of market data",
    },
  ];

  return (
    <AuthLayout
      title="Start Your Journey to Smarter Trading"
      subtitle="Join thousands of traders using AI-powered sentiment analysis to make informed Bitcoin investment decisions."
      features={features}
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Create your Fintrack account</h2>
        <p className="text-sm text-muted mb-8">Start tracking Bitcoin sentiment today</p>

        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                placeholder="Enter your full name" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="password" 
                placeholder="Create a password" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted cursor-pointer hover:text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="password" 
                placeholder="Confirm your password" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted cursor-pointer hover:text-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="terms" className="w-4 h-4 rounded border-card-border bg-background accent-primary" />
            <label htmlFor="terms" className="text-xs text-muted">
              I agree to Fintrack's <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
            </label>
          </div>

          <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-medium rounded-lg py-3 mt-4 transition-colors">
            Create Account
          </button>
        </form>

        <div className="mt-8 relative flex items-center justify-center">
          <div className="absolute w-full border-t border-card-border"></div>
          <span className="relative bg-card px-4 text-xs text-muted">Or sign up with</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button onClick={() => signIn("google")} className="flex items-center justify-center gap-2 py-2.5 border border-card-border rounded-lg hover:bg-card-border transition-colors text-sm font-medium">
            Google
          </button>
          <button onClick={() => signIn("github")} className="flex items-center justify-center gap-2 py-2.5 border border-card-border rounded-lg hover:bg-card-border transition-colors text-sm font-medium">
            GitHub
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Already have an account? <Link href="/signin" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
