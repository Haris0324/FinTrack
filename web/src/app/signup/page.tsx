"use client";

import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import { Eye, EyeOff, Mail, User, Lock } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUp() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Sign in the user automatically
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.message || "An error occurred");
      }
    } catch (err) {
      setError("Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
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

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Create a password" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm your password" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="terms" className="w-4 h-4 rounded border-card-border bg-background accent-primary" />
            <label htmlFor="terms" className="text-xs text-muted">
              I agree to Fintrack's <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 mt-4 transition-colors"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-8 relative flex items-center justify-center">
          <div className="absolute w-full border-t border-card-border"></div>
          <span className="relative bg-card px-4 text-xs text-muted">Or sign up with</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button type="button" onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className="flex items-center justify-center gap-2 py-2.5 border border-card-border rounded-lg hover:bg-card-border transition-colors text-sm font-medium">
            Google
          </button>
          <button type="button" onClick={() => signIn("github", { callbackUrl: "/dashboard" })} className="flex items-center justify-center gap-2 py-2.5 border border-card-border rounded-lg hover:bg-card-border transition-colors text-sm font-medium">
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
