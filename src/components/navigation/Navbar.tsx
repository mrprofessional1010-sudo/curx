"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Clinician";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 py-3.5 px-6 lg:px-14 flex items-center justify-between border-b",
        scrolled
          ? "bg-[#06080B]/85 backdrop-blur-xl border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
          : "bg-transparent border-transparent"
      )}
    >
      {/* Brand */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
          <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
          <span className="absolute inset-0 rounded-md border border-curx-cyan/30 animate-ping opacity-25" />
        </div>
        <div className="flex flex-col">
          <span className="font-display tracking-[0.28em] text-lg font-bold text-white group-hover:text-curx-cyan transition-colors flex items-center gap-1.5">
            CURX
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-curx-cyan" />
          </span>
        </div>
      </Link>

      {/* Center Navigation Links */}
      <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-widest text-slate-400">
        <a href="#disconnect" className="hover:text-curx-cyan transition-colors">
          PRODUCT
        </a>
        <a href="#network" className="hover:text-curx-cyan transition-colors">
          NETWORK
        </a>
        <a href="#architecture" className="hover:text-curx-cyan transition-colors">
          HOW IT WORKS
        </a>
        <a href="#safety" className="hover:text-curx-cyan transition-colors">
          SAFETY
        </a>
        <a href="#trust" className="hover:text-curx-cyan transition-colors">
          ABOUT
        </a>
      </nav>

      {/* Right CTAs / User Auth State */}
      <div className="flex items-center gap-3">
        {!loading && user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="h-8 px-3 rounded-md bg-curx-cyan/15 hover:bg-curx-cyan/25 border border-curx-cyan/40 text-curx-cyan font-mono text-xs font-bold flex items-center gap-1.5 transition-all duration-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
              <span>DASHBOARD</span>
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.04] border border-white/10">
              <div className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_8px_#00F0D0]" />
              <span className="text-xs font-mono text-slate-300 max-w-[150px] truncate">
                {displayName}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              className="h-8 px-3 rounded-md border border-white/10 hover:border-curx-red/40 hover:bg-curx-red/10 text-slate-300 hover:text-curx-red font-mono text-xs flex items-center gap-1.5 transition-all duration-200 cursor-pointer"
              title="Sign out of CURX"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN OUT</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-xs font-mono text-slate-300 hover:text-white transition-colors tracking-wider px-2 py-1"
            >
              SIGN IN
            </Link>
            <Link
              href="/signup"
              className="relative group overflow-hidden px-4 py-2 rounded-md bg-curx-cyan text-graphite font-mono text-xs font-bold tracking-wider hover:bg-white hover:shadow-[0_0_25px_rgba(0,240,208,0.5)] transition-all duration-300 flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-graphite animate-pulse" />
              <span>GET STARTED</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
