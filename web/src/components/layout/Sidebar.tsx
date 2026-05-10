"use client";

import Link from "next/link";
import { LayoutDashboard, History, Bell, Settings, User as UserIcon, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Sidebar({ isOpen, setIsOpen }: { isOpen?: boolean, setIsOpen?: (v: boolean) => void }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/dashboard" },
    { icon: <Settings className="w-5 h-5" />, label: "Sentiment Analysis", href: "/dashboard/sentiment" },
    { icon: <History className="w-5 h-5" />, label: "Historical Patterns", href: "/dashboard/history" },
    { icon: <Bell className="w-5 h-5" />, label: "Predictions & Alerts", href: "/dashboard/alerts" },
  ];

  if (session?.user && (session.user as any).role === "admin") {
    navItems.push({ icon: <Settings className="w-5 h-5" />, label: "Admin Panel", href: "/admin" });
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
          onClick={() => setIsOpen?.(false)} 
        />
      )}

      <aside className={`w-64 h-screen border-r border-card-border bg-background flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 mb-10 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-orange-500 to-danger flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 transition-transform group-hover:scale-105 duration-300">
            F
          </div>
          <div className="transition-all duration-300 group-hover:translate-x-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground leading-none">Fintrack</h1>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">AI News Analysis</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {navItems.map((item, i) => {
            // For dashboard, we only want exact match to avoid matching /dashboard/history too.
            // For others, we can match startsWith or exact.
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);

            return (
              <Link
                key={i}
                href={item.href}
                onClick={() => setIsOpen?.(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary text-white" 
                    : "text-muted hover:bg-card hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-card border border-card-border flex items-center justify-center overflow-hidden">
            <img 
              src={`/api/profile/avatar?t=${Date.now()}`} 
              alt="User" 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || 'Guest')}&background=random`;
              }}
            />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{session?.user?.name || "Guest"}</p>
            <p className="text-xs text-muted truncate">{session?.user?.email || "Not logged in"}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
