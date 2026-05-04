"use client";

import { Bell, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function HeaderActions() {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Live News Connected",
      desc: "Real-time updates are flowing.",
      time: "Just now"
    },
    {
      id: 2,
      title: "Welcome Back",
      desc: "Your data has been refreshed.",
      time: "1 min ago"
    }
  ]);

  const scrollToNews = () => {
    // We can use hash or just scrollIntoView
    const newsElement = document.getElementById('live-news');
    if (newsElement) {
      newsElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = "#live-news";
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setHasUnread(false);
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
          onClick={handleOpenNotifications}
          className="p-2 rounded-full hover:bg-card transition-colors relative focus:outline-none"
        >
          <Bell className="w-5 h-5 text-muted hover:text-foreground transition-colors" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger animate-pulse"></span>
          )}
        </button>

        {showNotifications && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-card border border-card-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-card-border flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-3 hover:bg-card-border/30 cursor-pointer transition-colors border-b border-card-border last:border-0" onClick={() => setShowNotifications(false)}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xs font-medium text-foreground">{notif.title}</h4>
                      <span className="text-[10px] text-muted whitespace-nowrap ml-2">{notif.time}</span>
                    </div>
                    <p className="text-[11px] text-muted">{notif.desc}</p>
                  </div>
                ))}
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
