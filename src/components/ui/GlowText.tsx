import React from "react";
import { cn } from "@/lib/utils";

interface GlowTextProps {
  children: React.ReactNode;
  variant?: "cyan" | "amber" | "orange" | "white";
  className?: string;
}

export const GlowText: React.FC<GlowTextProps> = ({
  children,
  variant = "cyan",
  className,
}) => {
  const glowClasses = {
    cyan: "text-transparent bg-clip-text bg-gradient-to-r from-curx-cyan via-teal-200 to-white drop-shadow-[0_0_20px_rgba(0,240,208,0.4)]",
    amber: "text-transparent bg-clip-text bg-gradient-to-r from-curx-amber via-yellow-200 to-white drop-shadow-[0_0_20px_rgba(255,176,32,0.4)]",
    orange: "text-transparent bg-clip-text bg-gradient-to-r from-curx-orange via-amber-300 to-white drop-shadow-[0_0_20px_rgba(255,107,0,0.4)]",
    white: "text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400",
  }[variant];

  return <span className={cn(glowClasses, className)}>{children}</span>;
};
