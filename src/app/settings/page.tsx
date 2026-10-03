"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, Trash2, ArrowLeft, Laptop, Smartphone, Globe, Loader2, HardDrive, LogOut } from "lucide-react";
import "../globals.css";

type Session = {
  id: string;
  ip_address: string;
  device_info: string;
  created_at: string;
};

export default function SettingsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState<string>("Calculating...");

  useEffect(() => {
    fetchSessions();
    fetchStorage();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorage = async () => {
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      if (data.success && data.notes) {
        let totalBytes = 0;
        data.notes.forEach((note: any) => {
          if (!note.file_size) return;
          const match = note.file_size.match(/([\d.]+)\s*(KB|MB|GB|B)/i);
          if (match) {
            const val = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            if (unit === 'KB') totalBytes += val * 1024;
            else if (unit === 'MB') totalBytes += val * 1024 * 1024;
            else if (unit === 'GB') totalBytes += val * 1024 * 1024 * 1024;
            else if (unit === 'B') totalBytes += val;
          }
        });
        
        if (totalBytes > 1024 * 1024 * 1024) {
          setStorageUsed((totalBytes / (1024 * 1024 * 1024)).toFixed(2) + " GB");
        } else {
          setStorageUsed((totalBytes / (1024 * 1024)).toFixed(2) + " MB");
        }
      }
    } catch (err) {
      setStorageUsed("Unknown");
    }
  };

  const handleLogout = async (id: string) => {
    if (!confirm("Are you sure you want to log out this device?")) return;
    
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      alert("Failed to logout device");
    }
  };

  const parseDevice = (userAgent: string) => {
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return { icon: <Smartphone size={24} />, text: "Mobile Device" };
    }
    return { icon: <Laptop size={24} />, text: "Desktop Computer" };
  };

  return (
    <div className="min-h-screen p-12" style={{ background: "var(--page)" }}>
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 mb-12 text-lg font-semibold transition-colors" style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={20} /> Back to Library
        </a>

        <div className="flex items-center gap-5 mb-12">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
            <Settings size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text)", letterSpacing: "-0.5px" }}>Settings</h1>
            <p className="text-base" style={{ color: "var(--text-soft)" }}>Manage your storage and security devices</p>
          </div>
        </div>

        <div className="mb-8 rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="px-8 py-5 border-b" style={{ borderColor: "var(--line)", background: "var(--surface-muted)" }}>
            <h2 className="font-semibold text-lg flex items-center gap-3" style={{ color: "var(--text)" }}>
              <HardDrive size={20} className="text-blue-500" />
              Storage Usage
            </h2>
          </div>
          <div className="p-8 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-soft)" }}>Total Uploaded to Telegram</p>
              <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{storageUsed}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-soft)" }}>Maximum Capacity</p>
              <p className="text-xl font-bold text-green-600">∞ Unlimited</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="px-8 py-5 border-b" style={{ borderColor: "var(--line)", background: "var(--surface-muted)" }}>
            <h2 className="font-semibold text-lg flex items-center gap-3" style={{ color: "var(--text)" }}>
              <Shield size={20} className="text-purple-500" />
              Active Sessions
            </h2>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-3" size={28} />
              <span className="text-base">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-16 text-center text-gray-500 text-base">No active sessions found.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {sessions.map((session) => {
                const device = parseDevice(session.device_info);
                return (
                  <div key={session.id} className="p-8 flex items-center justify-between gap-6">
                    <div className="flex items-start gap-5 min-w-0">
                      <div className="p-4 rounded-xl mt-1" style={{ background: "var(--surface-muted)", color: "var(--text-soft)" }}>
                        {device.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg truncate" style={{ color: "var(--text)" }}>
                          {device.text}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                          <span className="flex items-center gap-2"><Globe size={16} /> {session.ip_address}</span>
                          <span>•</span>
                          <span>{new Date(session.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 text-xs truncate max-w-md" style={{ color: "var(--text-muted)", opacity: 0.7 }} title={session.device_info}>
                          {session.device_info}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleLogout(session.id)}
                      className="shrink-0 px-5 py-3 rounded-xl text-base font-bold flex items-center gap-2 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      style={{ border: "1px solid var(--line)", color: "var(--text-soft)" }}
                    >
                      <Trash2 size={20} />
                      Revoke Access
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        <div className="mt-8 rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="px-8 py-5 border-b" style={{ borderColor: "var(--line)", background: "var(--surface-muted)" }}>
            <h2 className="font-semibold text-lg flex items-center gap-3" style={{ color: "var(--text)" }}>
              <LogOut size={20} style={{ color: "#ef4444" }} />
              Logout
            </h2>
          </div>
          <div className="p-8">
            <p className="text-base mb-6" style={{ color: "var(--text-soft)" }}>Log out from this device. You will be redirected to the login page.</p>
            <button
              onClick={() => { document.cookie = "edunote_auth=; Max-Age=0; path=/;"; window.location.href = "/login"; }}
              className="px-6 py-3 rounded-xl text-base font-bold flex items-center gap-3 transition-colors"
              style={{ border: "1px solid #fecaca", color: "#b91c1c", background: "#fff5f5" }}
            >
              <LogOut size={20} />
              Log out of this device
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
