"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { validateEmail, calculatePasswordStrength } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

interface SignupFormProps {
  onFieldFocus?: (field: "email" | "password" | "name" | "role" | null) => void;
  onFieldBlur?: () => void;
  onModeSwitch?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({
  onFieldFocus,
  onFieldBlur,
  onModeSwitch,
}) => {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pharmacist");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const strength = calculatePasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!fullName.trim()) {
      setError("Please enter your full name and clinical title.");
      return;
    }
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid institutional email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
          },
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("user already registered")) {
          setError("An account with this email address already exists. Please sign in.");
        } else {
          setError(signUpError.message || "We couldn't create your account. Please check your information and try again.");
        }
        return;
      }

      // Check if session was created immediately or attempt direct sign in
      if (data.session) {
        setSuccessMessage("Account created successfully. Loading workspace...");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 600);
      } else if (data.user) {
        // Try sign-in with password in case auto-confirm is enabled
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInData?.session) {
          setSuccessMessage("Account created successfully. Loading workspace...");
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 600);
        } else {
          // Confirmation email sent
          setRequiresVerification(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || "We couldn't create your account. Please check your information and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setResendSuccess(true);
      }
    } catch (err: any) {
      setError("Unable to resend verification link. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (googleLoading || loading || Boolean(successMessage)) return;
    setError(null);
    setGoogleLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Google OAuth error in signup:", err);
      if (
        err?.message?.toLowerCase().includes("provider is not enabled") ||
        err?.message?.toLowerCase().includes("unsupported provider")
      ) {
        setError(
          "Google Workspace registration is undergoing institutional setup. Please register with your email."
        );
      } else {
        setError("Google registration could not be completed. Please try again.");
      }
      setGoogleLoading(false);
    }
  };

  // Dedicated email verification screen
  if (requiresVerification) {
    return (
      <div className="flex flex-col w-full animate-fade-in">
        <div className="flex flex-col mb-6">
          <span className="font-mono text-[11px] uppercase tracking-wider text-curx-cyan font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
            CURX / EMAIL VERIFICATION
          </span>
          <h1 className="font-display text-3xl sm:text-4xl text-white font-bold mt-1 tracking-tight">
            Check your email
          </h1>
          <p className="font-sans text-xs sm:text-sm text-slate-400 mt-2">
            We've sent a verification link to <span className="text-white font-medium">{email}</span>. Click the link to activate your clinical credentials.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 p-3 rounded-lg bg-curx-red/10 border border-curx-red/30 text-xs font-sans text-curx-red flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendSuccess && (
          <div
            role="status"
            className="mb-5 p-3 rounded-lg bg-curx-cyan/10 border border-curx-cyan/30 text-xs font-sans text-curx-cyan flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Verification email resent. Please check your inbox and spam folder.</span>
          </div>
        )}

        <div className="p-4 rounded-xl border border-white/10 bg-[#090D13] flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-curx-cyan/10 border border-curx-cyan/30 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-curx-cyan" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-xs text-white font-semibold">Verification link dispatched</span>
              <span className="font-sans text-xs text-slate-400">Institutional validation token expires in 24 hours</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="flex-1 h-11 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? "animate-spin" : ""}`} />
            <span>{resendLoading ? "RESENDING..." : "RESEND EMAIL"}</span>
          </button>
          <Link
            href="/login"
            className="flex-1 h-11 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white transition-all cursor-pointer shadow-[0_0_20px_rgba(0,240,208,0.2)]"
          >
            <span>RETURN TO SIGN IN</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      {/* Title & Description */}
      <div className="flex flex-col mb-6">
        <span className="font-mono text-[11px] uppercase tracking-wider text-curx-cyan font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
          CURX / CREATE ACCOUNT
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-white font-bold mt-1 tracking-tight">
          Start with the whole picture.
        </h1>
        <p className="font-sans text-xs sm:text-sm text-slate-400 mt-1">
          Create your Curx account and bring medication intelligence into one connected view.
        </p>
      </div>

      {/* Error Alert Region */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 p-3 rounded-lg bg-curx-red/10 border border-curx-red/30 text-xs font-sans text-curx-red flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notice */}
      {successMessage && (
        <div
          role="status"
          className="mb-5 p-3 rounded-lg bg-curx-cyan/10 border border-curx-cyan/30 text-xs font-sans text-curx-cyan flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-name"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
          >
            FULL NAME & CLINICAL TITLE
          </label>
          <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
            <input
              id="signup-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={() => onFieldFocus?.("name")}
              onBlur={() => onFieldBlur?.()}
              placeholder="Dr. Jordan Hayes, PharmD"
              disabled={loading || Boolean(successMessage)}
              className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-sans text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
            />
            <User className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Institutional Email */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-email"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
          >
            INSTITUTIONAL EMAIL
          </label>
          <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => onFieldFocus?.("email")}
              onBlur={() => onFieldBlur?.()}
              placeholder="name@institution.org"
              disabled={loading || Boolean(successMessage)}
              className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-sans text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
            />
            <Mail className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Clinical Role Selection */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-role"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
          >
            CLINICAL ROLE / DOMAIN
          </label>
          <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan transition-all">
            <select
              id="signup-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onFocus={() => onFieldFocus?.("role")}
              onBlur={() => onFieldBlur?.()}
              disabled={loading || Boolean(successMessage)}
              className="w-full h-11 px-3.5 pr-10 rounded-lg bg-[#090D13] text-white font-sans text-sm outline-none border-none focus:ring-0 cursor-pointer"
            >
              <option value="physician">Attending Physician / Specialist</option>
              <option value="pharmacist">Clinical Pharmacist / Pharmacogenomics</option>
              <option value="researcher">Clinical Researcher / Genomic Scientist</option>
              <option value="hospital-admin">Health System Informatics Director</option>
            </select>
          </div>
        </div>

        {/* Password with Entropy Meter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="signup-password"
              className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
            >
              MASTER PASSWORD
            </label>
            <span className="font-mono text-[10px] uppercase text-slate-400">
              Strength: {strength.label}
            </span>
          </div>
          <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => onFieldFocus?.("password")}
              onBlur={() => onFieldBlur?.()}
              placeholder="Minimum 8 characters"
              disabled={loading || Boolean(successMessage)}
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

          {/* 4-Segment Strength Meter */}
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            <div
              className={`h-1 rounded transition-all duration-300 ${
                strength.score >= 1 ? strength.color : "bg-white/[0.08]"
              }`}
            />
            <div
              className={`h-1 rounded transition-all duration-300 ${
                strength.score >= 2 ? strength.color : "bg-white/[0.08]"
              }`}
            />
            <div
              className={`h-1 rounded transition-all duration-300 ${
                strength.score >= 3 ? strength.color : "bg-white/[0.08]"
              }`}
            />
            <div
              className={`h-1 rounded transition-all duration-300 ${
                strength.score >= 4 ? strength.color : "bg-white/[0.08]"
              }`}
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-confirm-password"
            className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
          >
            CONFIRM PASSWORD
          </label>
          <div className="relative flex items-center rounded-lg border border-white/10 bg-[#090D13] focus-within:border-curx-cyan focus-within:shadow-[0_0_15px_rgba(0,240,208,0.2)] transition-all">
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => onFieldFocus?.("password")}
              onBlur={() => onFieldBlur?.()}
              placeholder="Repeat master password"
              disabled={loading || Boolean(successMessage)}
              className="w-full h-11 px-3.5 pr-10 rounded-lg bg-transparent text-white font-mono text-sm placeholder:text-slate-400 outline-none border-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              className="absolute right-3 p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || Boolean(successMessage)}
          className="relative group h-12 w-full mt-2 rounded-lg bg-curx-cyan text-graphite font-display text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(0,240,208,0.25)] hover:shadow-[0_0_36px_rgba(0,240,208,0.5)] hover:bg-white active:scale-[0.985] transition-all duration-200 overflow-hidden disabled:opacity-60 cursor-pointer"
        >
          <span>{loading ? "CREATING ACCOUNT..." : "CREATE CLINICAL ACCOUNT"}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-[1px] bg-white/[0.08]" />
        </div>
        <span className="relative px-3 bg-[#0B0F14] font-mono text-[10px] uppercase tracking-wider text-slate-400">
          OR REGISTER WITH
        </span>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={googleLoading || loading || Boolean(successMessage)}
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
        <span>{googleLoading ? "CONNECTING..." : "Register with Google Workspace"}</span>
      </button>

      {/* Switch to Login Prompt */}
      <div className="mt-5 text-center text-xs text-slate-400">
        <span>Already have an account?</span>
        <Link
          href="/login"
          onClick={(e) => {
            if (onModeSwitch) {
              e.preventDefault();
              onModeSwitch();
            }
          }}
          className="ml-1.5 font-mono text-curx-cyan font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
};

