"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AuthLayout from "@/components/layout/AuthLayout";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok) {
          await signOut({ redirect: false });
          setStatus("success");
          setMessage("Email verified successfully! You can now sign in.");
          setTimeout(() => router.push("/signin"), 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Verification failed.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    verify();
  }, [token, router]);

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Securing your FinTrack account."
      features={[]}
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center text-center space-y-6 py-8"
      >
        {status === "loading" && (
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          >
            <Loader2 className="w-16 h-16 text-primary" />
          </motion.div>
        )}
        
        {status === "success" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <CheckCircle className="w-16 h-16 text-success" />
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          >
            <XCircle className="w-16 h-16 text-danger" />
          </motion.div>
        )}

        <h2 className="text-2xl font-bold text-foreground">{message}</h2>
        
        {status === "error" && (
          <Link href="/signup" className="text-primary hover:underline mt-4 inline-block">
            Back to Sign Up
          </Link>
        )}
        {status === "success" && (
          <p className="text-muted text-sm mt-2">Redirecting you to sign in...</p>
        )}
      </motion.div>
    </AuthLayout>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
