"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import HeaderActions from "./HeaderActions";
import SessionTimeout from "../auth/SessionTimeout";
import { Menu, Loader2 } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isBitcoinTradingPage = pathname?.startsWith("/dashboard/trade") || pathname?.startsWith("/dashboard/bitcoin-quote");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
    if ((session as any)?.error === "SessionRevoked") {
      signOut({ callbackUrl: '/signin' });
    }
  }, [session, status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SessionTimeout />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-card-border bg-background/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 -ml-2 text-muted hover:text-foreground transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className={isBitcoinTradingPage ? "flex items-center gap-2 text-sm font-semibold text-foreground" : "hidden text-sm font-medium text-muted sm:block"}>
              {isBitcoinTradingPage ? (
                <>
                  <span className="text-primary">FinTrack</span>
                  <span className="text-muted">/</span>
                  <span>Bitcoin Trading</span>
                </>
              ) : "Overview"}
            </h2>
          </div>
          <HeaderActions />
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
