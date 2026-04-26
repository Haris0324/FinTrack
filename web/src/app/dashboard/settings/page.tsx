"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { User, Lock, Bell, Activity, Camera, LogOut, ShieldAlert, Monitor, Smartphone, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-xl bg-card border border-card-border">
              <h3 className="text-lg font-bold text-foreground mb-1">Profile Information</h3>
              <p className="text-sm text-muted mb-8">Update your account profile information and email address</p>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white">
                    JD
                  </div>
                  <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-card border border-card-border text-muted hover:text-foreground hover:border-primary transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Profile Photo</h4>
                  <p className="text-xs text-muted mb-3">JPG, PNG or GIF. Max size 2MB</p>
                  <div className="flex gap-3">
                    <button className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors">
                      Upload Photo
                    </button>
                    <button className="px-4 py-1.5 bg-transparent text-muted text-xs font-medium rounded-md hover:text-foreground transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Full Name</label>
                  <input type="text" defaultValue="John Doe" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Email Address</label>
                  <input type="email" defaultValue="john.doe@example.com" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Phone Number</label>
                  <input type="tel" defaultValue="+1 (555) 123-4567" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Company</label>
                  <input type="text" defaultValue="Crypto Trading Inc." className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted mb-2">Role/Position</label>
                  <input type="text" defaultValue="Senior Trader" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-card-border pt-6">
                <button className="px-5 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  Save Changes
                </button>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-danger/30 bg-danger/5">
              <h3 className="text-lg font-bold text-danger mb-1">Danger Zone</h3>
              <p className="text-sm text-muted mb-6">Once you delete your account, there is no going back. Please be certain.</p>
              <button className="px-5 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        );
      case "security":
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-xl bg-card border border-card-border">
              <h3 className="text-lg font-bold text-foreground mb-1">Security & Password</h3>
              <p className="text-sm text-muted mb-8">Manage your password and security settings</p>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Current Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Confirm New Password</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div className="p-5 rounded-lg border border-card-border bg-background flex items-center justify-between mb-8">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted mb-2">Add an extra layer of security to your account</p>
                    <span className="flex items-center gap-1 text-xs text-success font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Enabled
                    </span>
                  </div>
                </div>
                <button className="px-4 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 rounded-md transition-colors">
                  Disable
                </button>
              </div>

              <h4 className="text-sm font-bold text-foreground mb-4">Active Sessions</h4>
              <div className="space-y-3 mb-8">
                <div className="p-4 rounded-lg border border-card-border bg-background flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Monitor className="w-5 h-5 text-muted mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Current Session</h4>
                      <p className="text-xs text-muted">Chrome on Windows • New York, USA</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-success">Active Now</span>
                </div>
                <div className="p-4 rounded-lg border border-card-border bg-background flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-muted mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">Mobile App</h4>
                      <p className="text-xs text-muted">iOS App • Last active 2 hours ago</p>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-danger hover:underline">Revoke</button>
                </div>
              </div>

              <div className="flex justify-end border-t border-card-border pt-6">
                <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  Update Password
                </button>
              </div>
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-xl bg-card border border-card-border">
              <h3 className="text-lg font-bold text-foreground mb-1">Notification Preferences</h3>
              <p className="text-sm text-muted mb-8">Manage how you receive notifications from Fintrack</p>
              
              <div className="space-y-4 mb-8">
                {[
                  { title: "Email Alerts", desc: "Receive high-impact news alerts via email", checked: true },
                  { title: "Push Notifications", desc: "Browser push notifications for urgent alerts", checked: true },
                  { title: "Weekly Report", desc: "Summary of market sentiment and predictions", checked: true },
                  { title: "Price Alerts", desc: "Notifications for significant price movements", checked: true },
                  { title: "News Digest", desc: "Daily digest of top crypto news", checked: false },
                  { title: "System Updates", desc: "Updates about new features and improvements", checked: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-card-border hover:bg-card-border/30 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-1">{item.title}</h4>
                      <p className="text-xs text-muted">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={item.checked} />
                      <div className="w-9 h-5 bg-card-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-card-border pt-6">
                <button className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        );
      case "activity":
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-xl bg-card border border-card-border">
              <h3 className="text-lg font-bold text-foreground mb-1">Activity Log</h3>
              <p className="text-sm text-muted mb-8">Recent activity and login history</p>
              
              <div className="space-y-4 mb-8">
                {[
                  { action: "Logged in", time: "2 minutes ago", ip: "192.168.1.1", status: "Success", type: "success" },
                  { action: "Updated alert settings", time: "1 hour ago", ip: "192.168.1.1", status: "Success", type: "success" },
                  { action: "Changed password", time: "2 days ago", ip: "192.168.1.1", status: "Success", type: "success" },
                  { action: "Failed login attempt", time: "3 days ago", ip: "192.168.1.50", status: "Warning", type: "warning" },
                  { action: "Downloaded report", time: "5 days ago", ip: "192.168.1.1", status: "Success", type: "success" },
                ].map((log, i) => (
                  <div key={i} className="p-4 rounded-lg border border-card-border bg-background flex items-center justify-between hover:bg-card-border/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Activity className={`w-4 h-4 mt-0.5 ${log.type === 'success' ? 'text-primary' : 'text-orange-500'}`} />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">{log.action}</h4>
                        <p className="text-xs text-muted">{log.time} • IP: {log.ip}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                      log.type === 'success' ? 'bg-success/10 text-success' : 'bg-orange-500/10 text-orange-500'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-center border-t border-card-border pt-6">
                <button className="text-xs font-medium text-muted hover:text-foreground transition-colors">
                  Load More Activities
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Account Settings</h2>
            <p className="text-sm text-muted">Manage your Fintrack account and preferences</p>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-card-border text-danger text-sm font-medium rounded-lg hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Inner Sidebar */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2 p-4 rounded-xl bg-card border border-card-border">
            <button 
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "profile" 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <User className="w-4 h-4" />
              Profile Information
            </button>
            <button 
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "security" 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Lock className="w-4 h-4" />
              Security & Password
            </button>
            <button 
              onClick={() => setActiveTab("notifications")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "notifications" 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Bell className="w-4 h-4" />
              Notifications
            </button>
            <button 
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === "activity" 
                  ? "bg-primary text-white" 
                  : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <Activity className="w-4 h-4" />
              Activity Log
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 w-full">
            {renderContent()}
          </div>
          
        </div>

      </div>
    </DashboardLayout>
  );
}
