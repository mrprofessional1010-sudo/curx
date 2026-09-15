"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/auth";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

interface LoginFormProps {
  onFieldFocus?: (field: "email" | "password" | null) => void;
  onFieldBlur?: () => void;
  onModeSwitch?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onFieldFocus,
  onFieldBlur,
  onModeSwitch,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  // Catch any error passed via URL query params (e.g. from /auth/callback redirect)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid institutional email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        // Map clean user-friendly errors
        if (authError.message.toLowerCase().includes("invalid login credentials")) {
          throw new Error("Unable to sign in. Check your credentials and try again.");
        } else if (authError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error("Your email has not been verified yet. Please check your inbox for the confirmation link.");
        } else {
          throw new Error(authError.message);
        }
      }

      if (data?.session) {
        setSuccess(true);
        const targetRedirect = searchParams.get("redirect") || "/dashboard";
        setTimeout(() => {
          router.push(targetRedirect);
          router.refresh();
        }, 500);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to sign in. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (oauthLoading || loading || success) return;
    setError(null);
    setOauthLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthErr) {
        throw oauthErr;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      if (
        err?.message?.toLowerCase().includes("provider is not enabled") ||
        err?.message?.toLowerCase().includes("unsupported provider")
      ) {
        setError(
          "Google Workspace sign-in is undergoing institutional setup. Please sign in with your email and password."
        );
      } else {
        setError("Google sign-in could not be completed. Please try again.");
      }
      setOauthLoading(false);
    }
  };


  return (
    <>
      <div className="flex flex-col w-full">
        {/* Title & Description */}
        <div className="flex flex-col mb-6">
          <span className="font-mono text-[11px] uppercase tracking-wider text-curx-cyan font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
            CURX / SECURE ACCESS
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-white font-bold mt-1 tracking-tight">
            Welcome back.
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to continue to your Curx intelligence workspace.
          </p>
        </div>

        {/* Error Alert Region */}
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 p-3.5 rounded-lg bg-curx-red/10 border border-curx-red/30 text-xs font-sans text-curx-red flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Notice */}
        {success && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-lg bg-curx-cyan/10 border border-curx-cyan/30 text-xs font-sans text-curx-cyan flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Authenticated successfully. Accessing Curx workspace...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email Address */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login-email"
              className="font-mono text-[11px] uppercase tracking-wider text-slate-400 flex items-center justify-between"
            >
              <span>EMAIL ADDRESS</span>
              <span className="text-[9px] text-slate-400 lowercase">institutional credential</span>
            </label>
            <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => onFieldFocus?.("email")}
                onBlur={() => onFieldBlur?.()}
                placeholder="name@institution.org"
                disabled={loading || success}
                className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-sans text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
              />
              <Mail className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
              >
                PASSWORD
              </label>
              <span className="font-mono text-[10px] uppercase text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-curx-cyan" />
                <span>Protected</span>
              </span>
            </div>
            <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => onFieldFocus?.("password")}
                onBlur={() => onFieldBlur?.()}
                placeholder="••••••••••••"
                disabled={loading || success}
                className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-mono text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between py-1 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-curx-cyan focus:ring-curx-cyan/30"
              />
              <span>Remember session</span>
            </label>
            <button
              type="button"
              onClick={() => setForgotModalOpen(true)}
              className="font-mono text-[11px] text-curx-cyan hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || success}
            className="relative group h-12 w-full mt-2 rounded-lg bg-curx-cyan text-graphite font-display text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,240,208,0.25)] hover:shadow-[0_0_36px_rgba(0,240,208,0.5)] hover:bg-white active:scale-[0.985] transition-all duration-200 overflow-hidden disabled:opacity-60 cursor-pointer"
          >
            <span>{loading ? "AUTHENTICATING..." : "SIGN IN"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-[1px] bg-white/[0.08]" />
          </div>
          <span className="relative px-3 bg-[#0B0F14] font-mono text-[10px] uppercase tracking-wider text-slate-400">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading || oauthLoading || success}
          className="h-11 w-full rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/25 text-white font-sans text-xs sm:text-sm flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              fill="#4285F4"
            />
            <path
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              fill="#34A853"
            />
            <path
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              fill="#FBBC05"
            />
            <path
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              fill="#EA4335"
            />
          </svg>
          <span>{oauthLoading ? "CONNECTING..." : "Continue with Google Workspace"}</span>
        </button>

        {/* Switch to Signup Prompt */}
        <div className="mt-5 text-center text-xs text-slate-400">
          <span>Don't have an account?</span>
          <Link
            href="/signup"
            onClick={(e) => {
              if (onModeSwitch) {
                e.preventDefault();
                onModeSwitch();
              }
            }}
            className="ml-1.5 font-mono text-curx-cyan font-semibold hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
      />
    </>
  );
};
