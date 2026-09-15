"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedNodeProps {
  label: string;
  category?: string;
  active?: boolean;
  color?: "cyan" | "amber" | "orange" | "slate";
  icon?: React.ReactNode;
  positionClasses?: string;
  onClick?: () => void;
  className?: string;
}

export const AnimatedNode: React.FC<AnimatedNodeProps> = ({
  label,
  category,
  active = false,
  color = "cyan",
  icon,
  positionClasses = "",
  onClick,
  className,
}) => {
  const colorStyles = {
    cyan: {
      border: "border-curx-cyan/40 hover:border-curx-cyan",
      bg: "bg-[#061118]/80 hover:bg-[#091a24]",
      glow: "shadow-[0_0_25px_rgba(0,240,208,0.2)]",
      text: "text-curx-cyan",
      dot: "bg-curx-cyan",
    },
    amber: {
      border: "border-curx-amber/40 hover:border-curx-amber",
      bg: "bg-[#181206]/80 hover:bg-[#241c09]",
      glow: "shadow-[0_0_25px_rgba(255,176,32,0.2)]",
      text: "text-curx-amber",
      dot: "bg-curx-amber",
    },
    orange: {
      border: "border-curx-orange/40 hover:border-curx-orange",
      bg: "bg-[#180d06]/80 hover:bg-[#26150a]",
      glow: "shadow-[0_0_25px_rgba(255,107,0,0.2)]",
      text: "text-curx-orange",
      dot: "bg-curx-orange",
    },
    slate: {
      border: "border-white/10 hover:border-white/30",
      bg: "bg-white/[0.03] hover:bg-white/[0.06]",
      glow: "shadow-none",
      text: "text-slate-300",
      dot: "bg-slate-400",
    },
  }[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl p-3.5 border backdrop-blur-xl transition-all duration-300 cursor-pointer select-none",
        colorStyles.border,
        colorStyles.bg,
        active ? colorStyles.glow : "",
        positionClasses,
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {icon && <div className={cn("shrink-0", colorStyles.text)}>{icon}</div>}
        <div className="flex flex-col">
          {category && (
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
              {category}
            </span>
          )}
          <span className="text-xs sm:text-sm font-mono font-semibold text-white tracking-wide">
            {label}
          </span>
        </div>
        <span
          className={cn(
            "w-2 h-2 rounded-full shrink-0 ml-auto",
            colorStyles.dot,
            active ? "animate-pulse" : "opacity-40"
          )}
        />
      </div>
    </div>
  );
};
