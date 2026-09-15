"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculatePasswordStrength } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Session may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#06080B] text-[#EDF2F7] flex flex-col justify-center items-center p-6 selection:bg-curx-cyan/30 selection:text-curx-cyan">
      <div className="w-full max-w-md p-8 rounded-2xl bg-[#0C1219] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
            <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
          </div>
          <span className="font-display tracking-[0.25em] text-lg font-bold text-white">
            CURX
          </span>
        </div>

        <div className="flex flex-col mb-6">
          <span className="font-mono text-[10px] uppercase tracking-wider text-curx-cyan font-semibold mb-1">
            SECURITY PROTOCOL
          </span>
          <h1 className="font-display text-3xl font-bold text-white">Set new password</h1>
          <p className="font-sans text-xs text-slate-400 mt-1">
            Choose a strong, secure password for your clinical workspace.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3 rounded-lg bg-curx-red/10 border border-curx-red/30 text-xs font-sans text-curx-red flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-curx-cyan/10 border border-curx-cyan/30 text-xs font-sans text-slate-200 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-curx-cyan font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password updated successfully</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              Your credentials have been securely updated. Redirecting to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="new-password"
                  className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
                >
                  NEW PASSWORD
                </label>
                <span className="font-mono text-[10px] uppercase text-slate-400">
                  Strength: {strength.label}
                </span>
              </div>
              <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan transition-all">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  disabled={loading}
                  className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-mono text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 p-1 rounded text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 4-Segment Strength Meter */}
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                <div className={`h-1 rounded transition-all duration-300 ${strength.score >= 1 ? strength.color : "bg-white/[0.08]"}`} />
                <div className={`h-1 rounded transition-all duration-300 ${strength.score >= 2 ? strength.color : "bg-white/[0.08]"}`} />
                <div className={`h-1 rounded transition-all duration-300 ${strength.score >= 3 ? strength.color : "bg-white/[0.08]"}`} />
                <div className={`h-1 rounded transition-all duration-300 ${strength.score >= 4 ? strength.color : "bg-white/[0.08]"}`} />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-new-password"
                className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
              >
                CONFIRM NEW PASSWORD
              </label>
              <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan transition-all">
                <input
                  id="confirm-new-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  disabled={loading}
                  className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-mono text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full mt-2 rounded-lg bg-curx-cyan text-graphite font-display text-sm font-bold flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "UPDATING PASSWORD..." : "UPDATE PASSWORD"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs">
          <Link href="/login" className="font-mono text-slate-400 hover:text-curx-cyan transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
