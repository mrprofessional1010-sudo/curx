import React from "react";
import { cn } from "@/lib/utils";

export type RiskLevel = "low" | "moderate" | "high" | "severe";

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  label,
  size = "md",
  className,
}) => {
  const config = {
    low: {
      text: label || "LOW RISK",
      color: "text-curx-cyan",
      border: "border-curx-cyan/30",
      bg: "bg-curx-cyan/10",
      dot: "bg-curx-cyan",
    },
    moderate: {
      text: label || "MODERATE RISK",
      color: "text-curx-amber",
      border: "border-curx-amber/30",
      bg: "bg-curx-amber/10",
      dot: "bg-curx-amber",
    },
    high: {
      text: label || "HIGH RISK",
      color: "text-curx-orange",
      border: "border-curx-orange/40",
      bg: "bg-curx-orange/15",
      dot: "bg-curx-orange",
    },
    severe: {
      text: label || "CRITICAL ALERT",
      color: "text-curx-red",
      border: "border-curx-red/40",
      bg: "bg-curx-red/15",
      dot: "bg-curx-red animate-ping",
    },
  }[level];

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
    lg: "px-4 py-1.5 text-sm gap-2 font-semibold",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-mono tracking-wider uppercase",
        config.color,
        config.border,
        config.bg,
        sizeClasses,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      <span>{config.text}</span>
    </span>
  );
};
