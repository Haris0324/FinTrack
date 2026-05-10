"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { User, Lock, Bell, Activity, Camera, LogOut, ShieldAlert, Monitor, Smartphone, AlertTriangle, Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  
  // Profile State
  const [profile, setProfile] = useState<any>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Modal States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showForgotPwdModal, setShowForgotPwdModal] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [forgotPwdState, setForgotPwdState] = useState({ code: '', newPassword: '', loading: false });

  // Logs & Sessions State
  const [activities, setActivities] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activitiesLimit, setActivitiesLimit] = useState(5);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity' || activeTab === 'security') {
      fetchLogsData();
    }
  }, [activeTab, activitiesLimit]);

  const fetchProfileData = async () => {
    try {
      const res = await fetch('/api/profile/me');
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        setTwoFactorEnabled(data.user.twoFactorEnabled || false);
      }
    } catch (e) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsData = async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/activity?limit=${activitiesLimit}`);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
        
        const uniqueSessions: any[] = [];
        const seen = new Set();
        for (const sess of (data.sessions || [])) {
          const key = `${sess.ip}-${sess.device}-${sess.browser}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSessions.push(sess);
          }
        }
        setSessions(uniqueSessions);
      }
    } catch (e) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          company: profile.company,
          position: profile.position,
        }),
      });
      if (res.ok) {
        toast.success('Profile updated successfully');
        await updateSession();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setProfile({ ...profile, profilePicture: base64String });
      
      try {
        const res = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profilePicture: base64String }),
        });
        if (res.ok) {
          toast.success('Profile photo updated');
          await updateSession();
        }
      } catch (e) {
        toast.error('Failed to upload photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = async () => {
    setProfile({ ...profile, profilePicture: '' });
    try {
      await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePicture: '' }),
      });
      toast.success('Profile photo removed');
      await updateSession();
    } catch (e) {
      toast.error('Failed to remove photo');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/profile/delete', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Account deleted successfully');
        signOut({ callbackUrl: '/signin' });
      } else {
        toast.error('Failed to delete account');
      }
    } catch (e) {
      toast.error('An error occurred');
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        toast.error(data.error || 'Failed to update password');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setSavingPassword(false);
    }
  };

  const toggle2FA = async () => {
    if (twoFactorEnabled) {
      // Disabling 2FA
      try {
        const res = await fetch('/api/2fa/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enable: false }),
        });
        const data = await res.json();
        if (res.ok) {
          setTwoFactorEnabled(false);
          toast.success(data.message);
        } else {
          toast.error(data.error || 'Failed to toggle 2FA');
        }
      } catch (e) {
        toast.error('An error occurred');
      }
    } else {
      // Enabling 2FA - Start Setup Flow
      try {
        const res = await fetch('/api/2fa/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: profile.email, purpose: 'setup' }),
        });
        if (res.ok) {
          setShow2FAModal(true);
        } else {
          toast.error('Failed to send verification code');
        }
      } catch (e) {
        toast.error('An error occurred');
      }
    }
  };

  const handleVerify2FASetup = async () => {
    if (!twoFactorSetupCode || twoFactorSetupCode.length < 6) return;
    setVerifying2FA(true);
    try {
      const res = await fetch('/api/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: twoFactorSetupCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setTwoFactorEnabled(true);
        setShow2FAModal(false);
        setTwoFactorSetupCode("");
      } else {
        toast.error(data.error || 'Invalid code');
      }
    } catch (e) {
      toast.error('An error occurred');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await fetch('/api/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        toast.success('Session revoked successfully');
        // Remove the session from state immediately
        setSessions(prev => prev.filter(s => s._id !== sessionId));
      } else {
        toast.error('Failed to revoke session');
      }
    } catch (e) {
      toast.error('An error occurred');
    }
  };

  const handleForgotPassword = async () => {
    try {
      const res = await fetch('/api/2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email, purpose: 'setup' }), // Using setup to bypass 2FA check
      });
      if (res.ok) {
        setShowForgotPwdModal(true);
        toast.success('Password reset code sent to your email');
      } else {
        toast.error('Failed to send reset code');
      }
    } catch (e) {
      toast.error('An error occurred');
    }
  };

  const handleResetPassword = async () => {
    if (forgotPwdState.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setForgotPwdState({ ...forgotPwdState, loading: true });
    try {
      const res = await fetch('/api/profile/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: forgotPwdState.code, newPassword: forgotPwdState.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setShowForgotPwdModal(false);
        setForgotPwdState({ code: '', newPassword: '', loading: false });
      } else {
        toast.error(data.error || 'Failed to reset password');
        setForgotPwdState({ ...forgotPwdState, loading: false });
      }
    } catch (e) {
      toast.error('An error occurred');
      setForgotPwdState({ ...forgotPwdState, loading: false });
    }
  };

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
                  {profile?.profilePicture ? (
                    <img src={profile.profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-card-border" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-white">
                      {profile?.name ? profile.name.substring(0, 2).toUpperCase() : 'JD'}
                    </div>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-card border border-card-border text-muted hover:text-foreground hover:border-primary transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1">Profile Photo</h4>
                  <p className="text-xs text-muted mb-3">JPG, PNG or GIF. Max size 2MB</p>
                  <div className="flex gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary-hover transition-colors">
                      Upload Photo
                    </button>
                    <button onClick={handlePhotoRemove} className="px-4 py-1.5 bg-transparent text-muted text-xs font-medium rounded-md hover:text-foreground transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Full Name</label>
                  <input type="text" value={profile?.name || ''} onChange={(e) => setProfile({...profile, name: e.target.value})} placeholder="John Doe" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Email Address</label>
                  <input type="email" value={profile?.email || ''} disabled className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground opacity-50 cursor-not-allowed transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Phone Number</label>
                  <input type="tel" value={profile?.phone || ''} onChange={(e) => setProfile({...profile, phone: e.target.value})} placeholder="+92 1234567890" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Company</label>
                  <input type="text" value={profile?.company || ''} onChange={(e) => setProfile({...profile, company: e.target.value})} placeholder="Crypto Trading Inc." className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted mb-2">Role/Position</label>
                  <input type="text" value={profile?.position || ''} onChange={(e) => setProfile({...profile, position: e.target.value})} placeholder="Senior Trader" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t border-card-border pt-6">
                <button onClick={() => fetchProfileData()} className="px-5 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
                  Cancel
                </button>
                <button disabled={savingProfile} onClick={handleProfileSave} className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-danger/30 bg-danger/5">
              <h3 className="text-lg font-bold text-danger mb-1">Danger Zone</h3>
              <p className="text-sm text-muted mb-6">Once you delete your account, there is no going back. Please be certain.</p>
              <button onClick={() => setShowDeleteModal(true)} className="px-5 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2">
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
                  <div className="flex justify-between mb-2">
                    <label className="block text-xs font-medium text-muted">Current Password</label>
                    <button onClick={handleForgotPassword} className="text-[10px] font-semibold text-primary hover:underline">Forgot Password?</button>
                  </div>
                  <input type="password" value={passwords.current} onChange={(e) => setPasswords({...passwords, current: e.target.value})} placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">New Password</label>
                  <input type="password" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})} placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Confirm New Password</label>
                  <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} placeholder="••••••••" className="w-full bg-background border border-card-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors" />
                </div>
              </div>

              <div className="p-5 rounded-lg border border-card-border bg-background flex items-center justify-between mb-8">
                <div className="flex items-start gap-3">
                  <ShieldAlert className={`w-5 h-5 ${twoFactorEnabled ? 'text-success' : 'text-muted'} mt-0.5`} />
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Two-Factor Authentication</h4>
                    <p className="text-xs text-muted mb-2">Add an extra layer of security to your account with Email OTPs</p>
                    {twoFactorEnabled ? (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-success"></span> Enabled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted"></span> Disabled
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={toggle2FA} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${twoFactorEnabled ? 'text-danger hover:bg-danger/10' : 'text-primary bg-primary/10 hover:bg-primary/20'}`}>
                  {twoFactorEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              <h4 className="text-sm font-bold text-foreground mb-4">Active Sessions</h4>
              <div className="space-y-3 mb-8">
                {sessions.length > 0 ? sessions.map((sess, i) => (
                  <div key={i} className="p-4 rounded-lg border border-card-border bg-background flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      {sess.device.includes('Mobile') ? <Smartphone className="w-5 h-5 text-muted mt-0.5" /> : <Monitor className="w-5 h-5 text-muted mt-0.5" />}
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">{sess.browser} on {sess.device}</h4>
                        <p className="text-xs text-muted">IP: {sess.ip || 'Unknown'} • {new Date(sess.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {i === 0 && <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-sm">Current</span>}
                      {i !== 0 && (
                        <button onClick={() => handleRevokeSession(sess._id)} className="text-[10px] font-bold text-danger hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-muted">No recent sessions found.</p>
                )}
              </div>

              <div className="flex justify-end border-t border-card-border pt-6">
                <button disabled={savingPassword} onClick={handlePasswordUpdate} className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors">
                  {savingPassword ? 'Updating...' : 'Update Password'}
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
                {loadingActivities ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted" />
                  </div>
                ) : activities.length > 0 ? activities.map((log, i) => (
                  <div key={i} className="p-4 rounded-lg border border-card-border bg-background flex items-center justify-between hover:bg-card-border/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Activity className={`w-4 h-4 mt-0.5 ${log.type === 'success' ? 'text-primary' : log.type === 'warning' ? 'text-orange-500' : 'text-danger'}`} />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">{log.action}</h4>
                        <p className="text-xs text-muted">{new Date(log.createdAt).toLocaleString()} • IP: {log.ip || 'Unknown'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase ${
                      log.type === 'success' ? 'bg-success/10 text-success' : log.type === 'warning' ? 'bg-orange-500/10 text-orange-500' : 'bg-danger/10 text-danger'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                )) : (
                  <p className="text-xs text-muted">No activities found.</p>
                )}
              </div>

              <div className="flex justify-center border-t border-card-border pt-6">
                <button onClick={() => setActivitiesLimit(activitiesLimit + 5)} className="text-xs font-medium text-muted hover:text-foreground transition-colors">
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-6"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1"><span className="text-gradient">Account Settings</span></h2>
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

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-card-border p-6 rounded-xl shadow-2xl max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" />
                Delete Account
              </h3>
              <p className="text-sm text-muted mb-6">
                Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-card-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 2FA Setup Modal */}
        {show2FAModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-card-border p-6 rounded-xl shadow-2xl max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-foreground mb-2">Verify 2FA Setup</h3>
              <p className="text-sm text-muted mb-6">
                We've sent a 6-digit verification code to your email. Enter it below to enable Two-Factor Authentication.
              </p>
              <input 
                type="text" 
                maxLength={6}
                value={twoFactorSetupCode}
                onChange={(e) => setTwoFactorSetupCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456" 
                className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground focus:outline-none focus:border-primary transition-colors mb-6"
              />
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setShow2FAModal(false); setTwoFactorSetupCode(""); }}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-card-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleVerify2FASetup}
                  disabled={twoFactorSetupCode.length !== 6 || verifying2FA}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {verifying2FA ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPwdModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-card-border p-6 rounded-xl shadow-2xl max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-foreground mb-2">Reset Password</h3>
              <p className="text-sm text-muted mb-6">
                Enter the 6-digit code sent to your email and your new password.
              </p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">Verification Code</label>
                  <input 
                    type="text" 
                    maxLength={6}
                    value={forgotPwdState.code}
                    onChange={(e) => setForgotPwdState({...forgotPwdState, code: e.target.value.replace(/[^0-9]/g, '')})}
                    placeholder="123456" 
                    className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-center text-xl font-bold tracking-widest text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">New Password</label>
                  <input 
                    type="password" 
                    value={forgotPwdState.newPassword}
                    onChange={(e) => setForgotPwdState({...forgotPwdState, newPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="w-full bg-background border border-card-border rounded-lg px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => { setShowForgotPwdModal(false); setForgotPwdState({ code: '', newPassword: '', loading: false }); }}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-card-border rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={forgotPwdState.code.length !== 6 || forgotPwdState.newPassword.length < 6 || forgotPwdState.loading}
                  className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {forgotPwdState.loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </motion.div>
    </DashboardLayout>
  );
}
