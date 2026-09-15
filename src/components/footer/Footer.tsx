import React from "react";
import { ShieldCheck, ArrowUp, Info } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="relative bg-[#040608] border-t border-white/[0.08] pt-16 pb-12 px-6 lg:px-14 text-slate-400 font-sans z-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand & Purpose */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
                <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_10px_#00F0D0]" />
              </div>
              <span className="font-display tracking-[0.25em] text-lg font-bold text-white flex items-center gap-1.5">
                CURX
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-curx-cyan" />
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Clinical decision-support & medication intelligence infrastructure that connects symptoms, genetics, active regimens, and clinical guidelines into a traceable understanding of risk.
            </p>

            <div className="flex items-center gap-2 text-[11px] font-mono text-curx-cyan mt-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Deterministic Safety Rules • Traceable Evidence</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
              Platform Architecture
            </span>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <a href="#hero-track" className="hover:text-curx-cyan transition-colors">
                  240-Frame Synthesis
                </a>
              </li>
              <li>
                <a href="#disconnect" className="hover:text-curx-cyan transition-colors">
                  The Disconnect
                </a>
              </li>
              <li>
                <a href="#network" className="hover:text-curx-cyan transition-colors">
                  Unified Network
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-curx-cyan transition-colors">
                  Dual-Plane Engine
                </a>
              </li>
              <li>
                <a href="#medication" className="hover:text-curx-cyan transition-colors">
                  Medication Intelligence
                </a>
              </li>
            </ul>
          </div>

          {/* Safety & Compliance Links */}
          <div className="md:col-span-4 flex flex-col gap-3">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-white">
              Clinical Governance
            </span>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <a href="#safety" className="hover:text-curx-cyan transition-colors">
                  Emergency Override Protocol
                </a>
              </li>
              <li>
                <a href="#explainability" className="hover:text-curx-cyan transition-colors">
                  CPIC Evidence Guidelines
                </a>
              </li>
              <li>
                <a href="#trust" className="hover:text-curx-cyan transition-colors">
                  Deterministic Safety Standards
                </a>
              </li>
              <li>
                <a href="#care" className="hover:text-curx-cyan transition-colors">
                  Facility Referral Continuity
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Clinical Disclaimer Callout */}
        <div className="my-8 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 leading-relaxed flex items-start gap-3">
          <Info className="w-4 h-4 text-curx-cyan shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Clinical Decision Support Notice:</strong> Curx is an informational clinical decision-support and medication intelligence tool. It does not provide medical diagnoses, prescribe medications, or recommend specific dosages. All computed risk vectors and evidence citations are intended to assist qualified healthcare professionals in clinical evaluation. In medical emergencies, contact local emergency services immediately.
          </p>
        </div>

        {/* Bottom copyright & back to top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-400 pt-4 border-t border-white/[0.04]">
          <div>
            © {new Date().getFullYear()} CURX Clinical Intelligence. All rights reserved.
          </div>
          <a
            href="#hero-track"
            className="flex items-center gap-1.5 text-slate-400 hover:text-curx-cyan transition-colors"
          >
            <span>BACK TO TOP</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
