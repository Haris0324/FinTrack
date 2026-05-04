"use client";

import { Bell, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function HeaderActions() {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Hardcoded recent event for demonstration
  const recentEvent = {
    title: "News Fetched",
    desc: "12 new articles processed by data pipeline",
    time: "2 mins ago"
  };

  const scrollToNews = () => {
    // We can use hash or just scrollIntoView
    const newsElement = document.getElementById('live-news');
    if (newsElement) {
      newsElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = "#live-news";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button 
        onClick={scrollToNews}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-medium hover:bg-card-border transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        Live Updates
      </button>
      
      <div className="relative">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 rounded-full hover:bg-card transition-colors relative focus:outline-none"
        >
          <Bell className="w-5 h-5 text-muted hover:text-foreground transition-colors" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger animate-pulse"></span>
        </button>

        {showNotifications && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-card border border-card-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-card-border">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="p-3 hover:bg-card-border/30 cursor-pointer transition-colors" onClick={() => setShowNotifications(false)}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-xs font-medium text-foreground">{recentEvent.title}</h4>
                  <span className="text-[10px] text-muted">{recentEvent.time}</span>
                </div>
                <p className="text-[11px] text-muted">{recentEvent.desc}</p>
              </div>
              <div className="p-2 border-t border-card-border bg-background">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-full text-center text-xs text-primary font-medium hover:underline"
                >
                  Mark all as read
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center hover:bg-card-border transition-colors overflow-hidden shrink-0">
        {session?.user?.image ? (
            <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
        ) : (
            <UserIcon className="w-5 h-5 text-muted" />
        )}
      </Link>
    </div>
  );
}
