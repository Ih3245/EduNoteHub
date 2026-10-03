"use client";

import React, { useState } from "react";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import "../globals.css";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "Incorrect PIN");
        setPin("");
      }
    } catch (err) {
      setError("Failed to verify PIN. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--page)" }}>
      <div 
        className="w-full max-w-[400px] p-8 text-center" 
        style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}
      >
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--blue-light)", color: "var(--blue)" }}
        >
          <Lock size={28} />
        </div>
        
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)", letterSpacing: "-0.5px" }}>Secure Access</h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-soft)" }}>Enter your security PIN to access EduNote Hub.</p>

        {error && (
          <div className="mb-6 p-3 rounded-lg text-sm font-medium flex items-center gap-2 text-left" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}>
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="• • • • •"
            className="w-full p-4 text-center text-xl font-bold tracking-[0.5em] outline-none rounded-lg transition-colors"
            style={{ border: "1px solid var(--line)", color: "var(--text)", background: "var(--surface-muted)" }}
            disabled={isLoading || error.includes("10 minutes")}
            autoFocus
          />
          
          <button
            type="submit"
            disabled={isLoading || !pin || error.includes("10 minutes")}
            className="w-full py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Unlock Archive"}
          </button>
        </form>
      </div>
    </div>
  );
}
