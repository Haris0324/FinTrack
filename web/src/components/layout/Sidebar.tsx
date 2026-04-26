"use client";

import Link from "next/link";
import { LayoutDashboard, History, Bell, Settings, User as UserIcon } from "lucide-react";
import { useSession } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();

  const navItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", href: "/dashboard", active: true },
    { icon: <History className="w-5 h-5" />, label: "Historical Patterns", href: "/dashboard/history" },
    { icon: <Bell className="w-5 h-5" />, label: "Predictions & Alerts", href: "/dashboard/alerts" },
  ];

  if (session?.user && (session.user as any).role === "admin") {
    navItems.push({ icon: <Settings className="w-5 h-5" />, label: "Admin Panel", href: "/admin", active: false });
  }

  return (
    <aside className="w-64 h-screen border-r border-card-border bg-background flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
            B
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Fintrack</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider text-muted">AI News Analysis</p>
          </div>
        </Link>

        <nav className="space-y-2">
          {navItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                item.active 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-card hover:text-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-card-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-card border border-card-border flex items-center justify-center overflow-hidden">
            {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
            ) : (
                <UserIcon className="w-5 h-5 text-muted" />
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{session?.user?.name || "Guest"}</p>
            <p className="text-xs text-muted truncate">{session?.user?.email ? ((session.user as any).role === 'admin' ? 'Administrator' : 'Free account') : "Not logged in"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
