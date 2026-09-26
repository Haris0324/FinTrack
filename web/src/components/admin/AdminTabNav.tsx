"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Rss, Brain, Activity, Lock } from 'lucide-react';

const tabs = [
  { label: 'Overview',   href: '/admin',            icon: LayoutDashboard },
  { label: 'Users',      href: '/admin/users',       icon: Users },
  { label: 'Sources',    href: '/admin/sources',     icon: Rss },
  { label: 'ML Models',  href: '/admin/models',      icon: Brain },
  { label: 'Monitoring', href: '/admin/monitoring',  icon: Activity },
  { label: 'Settings',   href: '/admin/settings',    icon: Lock },
];

export default function AdminTabNav() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 p-1 bg-card border border-card-border rounded-xl mb-6 overflow-x-auto">
      {tabs.map(tab => {
        const isActive = tab.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-muted hover:text-foreground hover:bg-card-border/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
