import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  badge?: string;
  badgeColor?: "cyan" | "amber" | "orange" | "slate";
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  badge,
  badgeColor = "cyan",
  title,
  subtitle,
  align = "center",
  className,
}) => {
  const badgeClasses = {
    cyan: "text-curx-cyan border-curx-cyan/30 bg-curx-cyan/10",
    amber: "text-curx-amber border-curx-amber/30 bg-curx-amber/10",
    orange: "text-curx-orange border-curx-orange/30 bg-curx-orange/10",
    slate: "text-slate-400 border-white/10 bg-white/[0.04]",
  }[badgeColor];

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 mb-14",
        align === "center" ? "items-center text-center max-w-3xl mx-auto" : "items-start text-left max-w-3xl",
        className
      )}
    >
      {badge && (
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-mono tracking-widest uppercase",
            badgeClasses
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{badge}</span>
        </div>
      )}

      <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
        {title}
      </h2>

      {subtitle && (
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
};
