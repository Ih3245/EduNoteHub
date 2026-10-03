"use client";

import React, { useState } from "react";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
        router.push("/");
        router.refresh(); // Force reload to get protected page
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f4f0ea]">
      <div className="neo-box w-full max-w-md p-8 bg-white text-center">
        <div className="w-16 h-16 bg-yellow-300 rounded-full border-2 border-gray-900 flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_#1a1a1a]">
          <Lock size={32} className="text-gray-900" />
        </div>
        
        <h1 className="text-2xl font-black text-gray-900 mb-2">Secure Access</h1>
        <p className="text-gray-600 font-medium mb-8">Enter your security PIN to access the archive.</p>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border-2 border-red-900 text-red-900 font-bold flex items-center gap-2 text-left text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN..."
            className="w-full neo-box p-4 text-center text-xl font-bold tracking-[0.5em] outline-none focus:ring-4 focus:ring-blue-300"
            disabled={isLoading || error.includes("10 minutes")}
            autoFocus
          />
          
          <button
            type="submit"
            disabled={isLoading || !pin || error.includes("10 minutes")}
            className="w-full neo-button bg-blue-400 text-white py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={24} /> : "Unlock Archive"}
          </button>
        </form>
      </div>
    </div>
  );
}
