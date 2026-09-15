import React from "react";
import { ShieldCheck } from "lucide-react";

export const TrustDisclaimer: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-center gap-2 ${className}`}>
      <ShieldCheck className="w-3.5 h-3.5 text-curx-cyan/80 shrink-0" />
      <p className="font-sans text-[11px] text-slate-400 text-center leading-relaxed">
        Curx provides informational decision support and does not diagnose or prescribe.
      </p>
    </div>
  );
};
