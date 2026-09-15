"use client";

import React from "react";
import { GlowText } from "@/components/ui/GlowText";
import { ShieldAlert, AlertOctagon, PhoneCall, HeartCrack } from "lucide-react";

export const SafetySection: React.FC = () => {
  return (
    <section
      id="safety"
      className="relative py-36 px-6 lg:px-14 border-b border-white/[0.06] bg-[#040507] overflow-hidden text-center"
    >
      {/* Background Calm Stillness Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-curx-red/[0.03] rounded-full blur-[160px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        {/* Safety Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-curx-red/10 border border-curx-red/30 text-curx-red font-mono text-xs tracking-widest uppercase mb-8">
          <AlertOctagon className="w-4 h-4" />
          <span>SECTION 08 // EMERGENCY OVERRIDE PROTOCOL</span>
        </div>

        {/* Quiet Editorial Headline */}
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
          WHEN IT MATTERS, <br />
          <GlowText variant="white">CURX KNOWS WHEN TO STOP.</GlowText>
        </h2>

        <p className="text-base sm:text-lg text-slate-400 font-sans leading-relaxed max-w-2xl mb-12">
          If symptoms, physiological markers, or drug cascades indicate an acute life-threatening emergency, Curx pauses non-urgent decision support and prioritizes immediate human emergency intervention.
        </p>

        {/* Quiet Emergency Card */}
        <div className="w-full max-w-2xl glass-panel rounded-2xl p-8 sm:p-10 border border-curx-red/40 bg-[#0C0607]/80 backdrop-blur-2xl shadow-[0_0_50px_rgba(230,57,70,0.1)] text-left flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-2.5 text-curx-red font-mono text-xs font-bold tracking-wider uppercase">
              <ShieldAlert className="w-5 h-5" />
              <span>SAFETY CIRCUIT ENGAGED</span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-curx-red/15 text-curx-red font-mono text-[10px] uppercase font-semibold">
              CRITICAL THRESHOLD
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="font-display text-xl sm:text-2xl font-bold text-white">
              Potential emergency pattern detected.
            </h4>
            <p className="text-sm text-slate-300 font-sans leading-relaxed">
              Reported symptoms (acute crushing substernal chest discomfort + diaphoresis) meet criteria for immediate emergency medical evaluation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-curx-red/10 border border-curx-red/30 flex items-center justify-between text-xs font-mono text-white">
            <span className="font-semibold tracking-wider uppercase text-curx-red">
              ACTION: SEEK IMMEDIATE EMERGENCY CARE
            </span>
            <span className="text-[11px] text-slate-400">DO NOT DELAY</span>
          </div>

          <p className="text-[11px] font-mono text-slate-400 leading-relaxed pt-2 border-t border-white/[0.06]">
            Curx adheres to strict clinical safety boundaries: it does not prescribe, does not replace emergency medical services, and halts algorithmic exploration during critical events.
          </p>
        </div>
      </div>
    </section>
  );
};
