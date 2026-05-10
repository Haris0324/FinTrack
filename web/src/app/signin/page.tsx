"use client";

import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import { Eye, EyeOff, Mail, Lock, TrendingUp, Globe } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function SignIn() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("fintrack_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (rememberMe) {
      localStorage.setItem("fintrack_remembered_email", email);
    } else {
      localStorage.removeItem("fintrack_remembered_email");
    }

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.success("Signed in successfully!");
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };
  const features = [
    {
      icon: <TrendingUp className="w-5 h-5 text-success" />,
      title: "87% Prediction Accuracy",
      description: "AI-powered market analysis",
    },
    {
      icon: <Globe className="w-5 h-5 text-primary" />,
      title: "124+ News Sources",
      description: "Real-time monitoring",
    },
  ];

  return (
    <AuthLayout
      title="Welcome Back to Smarter Trading"
      subtitle="Access real-time Bitcoin sentiment analysis, AI-powered predictions, and intelligent market insights."
      features={features}
    >
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold text-foreground mb-2">Sign in to <span className="text-gradient">Fintrack</span></h2>
        <p className="text-sm text-muted mb-8">Enter your credentials to access your account</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
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
                placeholder="Enter your password" 
                className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground focus:outline-none z-10 p-2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-card-border bg-background accent-primary" 
              />
              <label htmlFor="remember" className="text-xs text-muted">
                Remember me
              </label>
            </div>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-3 mt-4 transition-colors"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 relative flex items-center justify-center">
          <div className="absolute w-full border-t border-card-border"></div>
          <span className="relative bg-card px-4 text-xs text-muted">Or continue with</span>
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
          Don't have an account? <Link href="/signup" className="text-primary hover:underline font-medium">Sign up for free</Link>
        </p>
      </motion.div>
    </AuthLayout>
  );
}
