"use client";

import { useState } from "react";
import AuthLayout from "@/components/layout/AuthLayout";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        toast.success("Password reset link sent!");
      } else {
        toast.error(data.message || "Failed to send reset link.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Your Password"
      subtitle="Don't worry, we'll get you back to trading in no time."
      features={[]}
    >
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">Forgot Password</h2>
        <p className="text-sm text-muted mb-8">Enter your email address to receive a password reset link.</p>

        {!submitted ? (
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
                  placeholder="Enter your registered email" 
                  className="w-full bg-background border border-card-border rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2 text-white font-medium rounded-lg py-3 mt-4 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  Send Reset Link <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-card-border p-6 rounded-lg text-center"
          >
            <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Check your inbox</h3>
            <p className="text-sm text-muted">We've sent a password reset link to <strong>{email}</strong>.</p>
          </motion.div>
        )}

        <div className="mt-8 text-center">
          <Link href="/signin" className="text-sm text-muted hover:text-primary transition-colors">
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </AuthLayout>
  );
}
