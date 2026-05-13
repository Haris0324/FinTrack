"use client";

import Link from "next/link";
import AuthLayout from "@/components/layout/AuthLayout";
import { Eye, EyeOff, Mail, Lock, TrendingUp, Globe, ShieldAlert, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [resending, setResending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

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
        twoFactorCode: requires2FA ? twoFactorCode : undefined,
      });

      if (result?.error) {
        if (result.error === "2FA_REQUIRED") {
          setRequires2FA(true);
          toast.success("2FA code sent to your email!");
          // Trigger the email sending API
          await fetch('/api/2fa/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
        } else if (result.error === "ACCOUNT_NOT_VERIFIED") {
          setUnverifiedEmail(email);
          toast.error("Account not verified. Please check your email.");
        } else {
          toast.error(result.error === "Invalid or expired 2FA code" ? result.error : "Invalid email or password.");
        }
      } else {
        toast.success("Signed in successfully!");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email && !unverifiedEmail) {
      toast.error("Please enter your email address first.");
      return;
    }
    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email || unverifiedEmail }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("Verification link sent! Check your inbox.");
      } else {
        toast.error(data.message || "Failed to resend link.");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };
  const features = [
    {
      icon: <TrendingUp className="w-5 h-5 text-success" />,
      title: "80% Prediction Accuracy",
      description: "AI-powered market analysis",
    },
    {
      icon: <Globe className="w-5 h-5 text-primary" />,
      title: "10+ News Sources",
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

        {error === "SessionExpired" && (
          <div className="mb-6 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert className="w-5 h-5 text-danger" />
            <div>
              <p className="text-sm font-bold text-danger">Session Expired</p>
              <p className="text-[10px] text-danger/80">Your session has timed out due to inactivity. Please sign in again.</p>
            </div>
          </div>
        )}

        {unverifiedEmail && (
          <div className="mb-6 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-bold text-orange-500">Verify Your Account</p>
                <p className="text-[10px] text-orange-500/80">You haven't activated your account yet. Please check your email or click below to resend the link.</p>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="text-[10px] font-bold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 py-1.5 rounded-md transition-colors shadow-sm"
            >
              {resending ? "Sending..." : "Resend Activation Email"}
            </button>
          </div>
        )}

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
                disabled={requires2FA}
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
                disabled={requires2FA}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground focus:outline-none z-10 p-2"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={requires2FA}
              >
                {showPassword ? <EyeOff className="w-4 h-4 pointer-events-none" /> : <Eye className="w-4 h-4 pointer-events-none" />}
              </button>
            </div>
          </div>

          {requires2FA && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2 pt-2"
            >
              <label className="text-xs font-medium text-foreground">2-Factor Authentication Code</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  placeholder="Enter 6-digit code from email"
                  autoComplete="one-time-code"
                  className="w-full bg-background border border-primary/50 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                  maxLength={6}
                />
              </div>
            </motion.div>
          )}

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
            {loading ? "Signing In..." : requires2FA ? "Verify Code & Sign In" : "Sign In"}
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

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
