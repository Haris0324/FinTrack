import React from "react";
import Sidebar from "./Sidebar";
import { Bell } from "lucide-react";
import HeaderActions from "./HeaderActions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <header className="h-16 border-b border-card-border bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-sm font-medium text-muted">Overview</h2>
          <HeaderActions />
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
