"use client";

import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 w-full z-50 glass px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
          F
        </div>
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground truncate">Fintrack</h1>
          <p className="text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-wider text-muted truncate">AI-Powered Market Intelligence</p>
        </div>
      </Link>
      <div className="shrink-0 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-2 rounded-full hover:bg-card border border-card-border/60 text-muted hover:text-foreground transition-colors"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        <Link 
          href="/signin" 
          className="px-4 py-1.5 md:px-5 md:py-2 rounded-md bg-card border border-card-border text-sm font-medium text-foreground hover:bg-card-border transition-colors whitespace-nowrap"
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}
