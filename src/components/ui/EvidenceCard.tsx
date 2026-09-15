import React from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, ShieldCheck, Database, FileText } from "lucide-react";

interface EvidenceCardProps {
  guideline: string;
  source: string;
  evidenceLevel: "1A" | "1B" | "2A" | "FDA Boxed" | "Clinical Rule";
  finding: string;
  recommendation: string;
  className?: string;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  guideline,
  source,
  evidenceLevel,
  finding,
  recommendation,
  className,
}) => {
  return (
    <div
      className={cn(
        "glass-panel rounded-xl p-5 border border-white/10 hover:border-curx-cyan/40 transition-all duration-300 relative group overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-curx-cyan shrink-0" />
          <span className="font-mono text-xs text-white font-medium">{guideline}</span>
        </div>
        <span className="px-2.5 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] tracking-wider uppercase font-semibold">
          Level {evidenceLevel}
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block mb-1">
            Deterministic Finding
          </span>
          <p className="text-slate-200 leading-relaxed font-sans">{finding}</p>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-mono tracking-widest text-curx-amber uppercase block mb-1">
            Clinical Consideration
          </span>
          <p className="text-slate-300 leading-relaxed font-sans">{recommendation}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-curx-cyan" />
          <span>Source: {source}</span>
        </span>
        <span className="text-[10px] text-slate-400 uppercase">Grounded Rule</span>
      </div>
    </div>
  );
};
