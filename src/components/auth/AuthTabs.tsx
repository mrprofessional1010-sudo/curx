"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AuthTabsProps {
  currentMode: "login" | "signup";
  onTabChange?: (mode: "login" | "signup") => void;
}

export const AuthTabs: React.FC<AuthTabsProps> = ({ currentMode, onTabChange }) => {
  const isLogin = currentMode === "login";

  return (
    <div className="relative flex items-center justify-between mb-8 p-1 rounded-xl bg-[#090D13] border border-white/10 select-none">
      {/* Sliding Indicator Pill */}
      <div
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-[#141B24] border border-white/15 shadow-sm transition-transform duration-300 pointer-events-none ${
          isLogin ? "translate-x-0" : "translate-x-full"
        }`}
      />

      <Link
        href="/login"
        onClick={(e) => {
          if (onTabChange) {
            e.preventDefault();
            onTabChange("login");
          }
        }}
        className={`relative z-10 flex-1 py-2.5 px-4 text-center font-display text-sm font-semibold transition-colors duration-200 focus:outline-none ${
          isLogin ? "text-curx-cyan" : "text-slate-400 hover:text-white"
        }`}
      >
        Sign In
      </Link>

      <Link
        href="/signup"
        onClick={(e) => {
          if (onTabChange) {
            e.preventDefault();
            onTabChange("signup");
          }
        }}
        className={`relative z-10 flex-1 py-2.5 px-4 text-center font-display text-sm font-medium transition-colors duration-200 focus:outline-none ${
          !isLogin ? "text-curx-cyan font-semibold" : "text-slate-400 hover:text-white"
        }`}
      >
        Create Account
      </Link>
    </div>
  );
};
