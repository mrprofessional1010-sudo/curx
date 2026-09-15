"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !validateEmail(email)) {
      setError("Please enter a valid institutional email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: any) {
      // To prevent account-enumeration leaks per Step 18, log and show consistent messaging
      console.error("Password reset error:", err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-[#0C1219] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col mb-5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-curx-cyan font-semibold mb-1">
            CURX / ACCOUNT RECOVERY
          </span>
          <h3 className="font-display text-2xl font-bold text-white">Reset your password</h3>
          <p className="font-sans text-xs text-slate-400 mt-1 leading-relaxed">
            Enter your institutional email address and we'll send a secure password reset link to your inbox.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-curx-red/10 border border-curx-red/30 text-xs font-sans text-curx-red flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-4 rounded-xl bg-curx-cyan/10 border border-curx-cyan/30 text-xs font-sans text-slate-200 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-curx-cyan font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password reset link dispatched</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              If an account exists for <strong className="text-white">{email}</strong>, a password reset email has been sent. Please check your inbox and spam folder.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-2.5 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
            >
              RETURN TO SIGN IN
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reset-email"
                className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
              >
                INSTITUTIONAL EMAIL
              </label>
              <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan transition-all">
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.org"
                  disabled={loading}
                  className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-sans text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
                />
                <Mail className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full mt-1 rounded-lg bg-curx-cyan text-graphite font-display text-sm font-bold flex items-center justify-center gap-2 hover:bg-white transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{loading ? "SENDING LINK..." : "SEND RESET LINK"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
