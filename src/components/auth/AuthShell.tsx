"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CurxIntelligenceField } from "./CurxIntelligenceField";
import { AuthTabs } from "./AuthTabs";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { TrustDisclaimer } from "./TrustDisclaimer";

interface AuthShellProps {
  initialMode: "login" | "signup";
}

export const AuthShell: React.FC<AuthShellProps> = ({ initialMode }) => {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [activeField, setActiveField] = useState<"email" | "password" | "name" | "role" | null>(null);

  return (
    <div className="relative w-full min-h-screen bg-[#06080B] text-[#EDF2F7] flex flex-col justify-between overflow-x-hidden selection:bg-curx-cyan/30 selection:text-curx-cyan">
      {/* Top Global Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-6 lg:px-14 flex items-center justify-between bg-[#06080B]/85 backdrop-blur-xl border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
            <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
            <span className="absolute inset-0 rounded-md border border-curx-cyan/30 animate-ping opacity-25" />
          </div>
          <div className="flex items-center">
            <span className="font-display tracking-[0.25em] text-lg font-bold text-white group-hover:text-curx-cyan transition-colors">
              CURX
            </span>
            <span className="hidden sm:inline-block text-slate-400 font-mono text-[10px] uppercase tracking-widest pl-2 border-l border-white/20 ml-2">
              DECISION TELEMETRY
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-curx-cyan/40 text-slate-300 hover:text-white transition-all font-mono text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-curx-cyan group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Curx</span>
        </Link>
      </header>

      {/* Main Split Grid */}
      <main className="relative z-10 w-full pt-16 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
          {/* ==================== LEFT PANEL (45% — CURX INTELLIGENCE FIELD) ==================== */}
          <section className="lg:col-span-5 relative z-10 hidden md:flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08]">
            <CurxIntelligenceField activeField={activeField} mode={mode} />
          </section>

          {/* Mobile Compact Intelligence Header (visible on mobile only) */}
          <section className="block md:hidden p-6 bg-[#070A0E] border-b border-white/[0.08] text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] tracking-widest uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
              <span>CURX INTELLIGENCE ACCESS</span>
            </div>
            <h2 className="font-display text-xl font-bold text-white">SEE THE WHOLE PICTURE.</h2>
          </section>

          {/* ==================== RIGHT PANEL (55% — AUTHENTICATION INTERFACE) ==================== */}
          <section className="lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14 relative z-10 bg-[#0B0F14]/90 backdrop-blur-xl">
            <div className="w-full max-w-[460px] flex flex-col">
              {/* Sliding Tab Switcher */}
              <AuthTabs
                currentMode={mode}
                onTabChange={(newMode) => setMode(newMode)}
              />

              {/* Form Render based on active mode with smooth fade */}
              <div className="transition-all duration-300">
                <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-xs font-mono text-slate-500">INITIALIZING SECURE FIELD...</div>}>
                  {mode === "login" ? (
                    <LoginForm
                      onFieldFocus={(f) => setActiveField(f)}
                      onFieldBlur={() => setActiveField(null)}
                      onModeSwitch={() => setMode("signup")}
                    />
                  ) : (
                    <SignupForm
                      onFieldFocus={(f) => setActiveField(f)}
                      onFieldBlur={() => setActiveField(null)}
                      onModeSwitch={() => setMode("login")}
                    />
                  )}
                </React.Suspense>
              </div>

              {/* Clinical Trust Disclaimer */}
              <TrustDisclaimer />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
