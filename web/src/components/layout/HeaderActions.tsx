"use client";

import { Bell, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function HeaderActions() {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await fetch('/api/activity?limit=5');
        const data = await res.json();
        if (data.success && data.activities?.length > 0) {
          setNotifications(data.activities);
          setHasUnread(true);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      }
    };
    fetchActivities();
  }, []);

  const scrollToNews = () => {
    setHasUnread(false);
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
                {notifications.length > 0 ? notifications.map((notif, i) => (
                  <div key={i} className="p-3 hover:bg-card-border/30 cursor-pointer transition-colors border-b border-card-border last:border-0" onClick={() => setShowNotifications(false)}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-xs font-medium text-foreground">{notif.action}</h4>
                      <span className="text-[10px] text-muted whitespace-nowrap ml-2">
                        {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">Status: {notif.status}</p>
                  </div>
                )) : (
                  <div className="p-4 text-center text-xs text-muted">No recent notifications</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center hover:bg-card-border transition-colors overflow-hidden shrink-0">
        {(session?.user as any)?.profilePicture || session?.user?.image ? (
            <img src={(session?.user as any)?.profilePicture || session?.user?.image!} alt="User" className="w-full h-full object-cover" />
        ) : (
            <UserIcon className="w-5 h-5 text-muted" />
        )}
      </Link>
    </div>
  );
}
