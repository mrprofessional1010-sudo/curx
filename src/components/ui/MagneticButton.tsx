"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  href,
  className,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!buttonRef.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = buttonRef.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variantClasses = {
    primary:
      "bg-curx-cyan text-graphite font-semibold hover:bg-white hover:shadow-[0_0_30px_rgba(0,240,208,0.5)] border border-transparent",
    secondary:
      "bg-white/[0.04] text-slate-200 hover:bg-white/[0.08] hover:text-white border border-white/10 hover:border-white/20",
    outline:
      "bg-curx-cyan/10 text-curx-cyan border border-curx-cyan/40 hover:bg-curx-cyan/20 hover:border-curx-cyan/60 shadow-[0_0_20px_rgba(0,240,208,0.15)]",
    ghost: "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent",
  }[variant];

  const sizeClasses = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-6 py-3 text-xs tracking-wider",
    lg: "px-8 py-4 text-sm tracking-widest font-semibold",
  }[size];

  const baseClasses = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-lg font-mono uppercase transition-all duration-200 cursor-pointer overflow-hidden select-none active:scale-[0.98]",
    variantClasses,
    sizeClasses,
    className
  );

  const style = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: position.x === 0 && position.y === 0 ? "transform 0.4s ease" : "none",
  };

  if (href) {
    return (
      <a
        ref={buttonRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        onMouseMove={handleMouseMove}
        onMouseLeave={reset}
        style={style}
        className={baseClasses}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={style}
      className={baseClasses}
      {...props}
    >
      {children}
    </button>
  );
};
