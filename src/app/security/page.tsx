"use client";

import React, { useEffect, useState } from "react";
import { Shield, Trash2, ArrowLeft, Laptop, Smartphone, Globe, Loader2 } from "lucide-react";
import "../globals.css";

type Session = {
  id: string;
  ip_address: string;
  device_info: string;
  created_at: string;
};

export default function SecurityPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Get current session ID from cookie if possible, but cookies might be httpOnly
    // We will just show all sessions and the user can delete any they want
    fetchSessions();
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
      return { icon: <Smartphone size={20} />, text: "Mobile Device" };
    }
    return { icon: <Laptop size={20} />, text: "Desktop Computer" };
  };

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--page)" }}>
      <div className="max-w-3xl mx-auto">
        <a href="/" className="inline-flex items-center gap-2 mb-8 text-sm font-semibold transition-colors" style={{ color: "var(--text-soft)" }}>
          <ArrowLeft size={16} /> Back to Library
        </a>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--blue-light)", color: "var(--blue)" }}>
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.5px" }}>Security & Devices</h1>
            <p className="text-sm" style={{ color: "var(--text-soft)" }}>Manage your active sessions and remote logouts</p>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--line)", background: "var(--surface-muted)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Active Sessions</h2>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-2" size={24} />
              <span className="text-sm">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm">No active sessions found.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {sessions.map((session) => {
                const device = parseDevice(session.device_info);
                return (
                  <div key={session.id} className="p-6 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="p-3 rounded-lg mt-1" style={{ background: "var(--surface-muted)", color: "var(--text-soft)" }}>
                        {device.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
                          {device.text}
                        </h3>
                        <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="flex items-center gap-1.5"><Globe size={12} /> {session.ip_address}</span>
                          <span>•</span>
                          <span>{new Date(session.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-xs truncate max-w-xs" style={{ color: "var(--text-muted)", opacity: 0.7 }} title={session.device_info}>
                          {session.device_info}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleLogout(session.id)}
                      className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      style={{ border: "1px solid var(--line)", color: "var(--text-soft)" }}
                    >
                      <Trash2 size={16} />
                      Revoke
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
