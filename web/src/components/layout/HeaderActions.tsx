"use client";

import { Bell, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HeaderActions() {
  const { data: session } = useSession();

  return (
    <div className="flex items-center gap-4">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-card-border text-xs font-medium hover:bg-card-border transition-colors">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        Live Updates
      </button>
      <button className="p-2 rounded-full hover:bg-card transition-colors relative">
        <Bell className="w-5 h-5 text-muted" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"></span>
      </button>
      <Link href="/dashboard/settings" className="w-9 h-9 rounded-full bg-card border border-card-border flex items-center justify-center hover:bg-card-border transition-colors overflow-hidden">
        {session?.user?.image ? (
            <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
        ) : (
            <UserIcon className="w-5 h-5 text-muted" />
        )}
      </Link>
    </div>
  );
}
