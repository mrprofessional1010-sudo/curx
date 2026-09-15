"use client";

import React from "react";
import { GlowText } from "@/components/ui/GlowText";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { ArrowRight, Dna, Pill, HeartPulse, Stethoscope, GitMerge, FileText, Building2, CheckCircle2 } from "lucide-react";

export const FinalCtaSection: React.FC = () => {
  const pills = [
    { label: "GENETICS", icon: <Dna className="w-3.5 h-3.5 text-curx-cyan" /> },
    { label: "MEDICATIONS", icon: <Pill className="w-3.5 h-3.5 text-curx-amber" /> },
    { label: "SYMPTOMS", icon: <HeartPulse className="w-3.5 h-3.5 text-curx-orange" /> },
    { label: "CONDITIONS", icon: <Stethoscope className="w-3.5 h-3.5 text-slate-300" /> },
    { label: "INTERACTIONS", icon: <GitMerge className="w-3.5 h-3.5 text-curx-amber" /> },
    { label: "EVIDENCE", icon: <FileText className="w-3.5 h-3.5 text-curx-cyan" /> },
    { label: "CARE", icon: <Building2 className="w-3.5 h-3.5 text-white" /> },
  ];

  return (
    <section
      id="final-cta"
      className="relative py-36 px-6 lg:px-14 bg-gradient-to-b from-graphite via-[#070F16] to-[#040608] overflow-hidden text-center"
    >
      {/* Background Central Atmospheric Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[800px] h-[500px] bg-curx-cyan/[0.04] rounded-full blur-[180px]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        {/* Connected Domains Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {pills.map((p, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-slate-300 tracking-wider shadow-[0_0_15px_rgba(0,0,0,0.4)]"
            >
              {p.icon}
              <span className="font-semibold">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Final Headline */}
        <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.05] mb-6">
          SEE THE <br />
          <GlowText variant="cyan">WHOLE PICTURE.</GlowText>
        </h2>

        {/* Supporting Copy */}
        <p className="text-base sm:text-xl text-slate-300 font-sans leading-relaxed max-w-2xl mb-10 font-normal">
          Connected medication intelligence that transforms disconnected clinical data into an explainable, evidence-backed understanding of risk.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-5 mb-14">
          <MagneticButton variant="primary" size="lg" href="/signup">
            <span>EXPLORE CURX</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </MagneticButton>

          <MagneticButton variant="secondary" size="lg" href="/signup">
            <span>GET STARTED</span>
          </MagneticButton>
        </div>

        {/* Grounding Subtext */}
        <div className="pt-8 border-t border-white/[0.08] w-full max-w-xl text-center">
          <span className="text-xs font-mono text-slate-400 tracking-wider uppercase block">
            DETERMINISTIC SAFETY ENGINE • TRACEABLE PHARMACOGENOMICS • CLINICAL DECISION SUPPORT
          </span>
        </div>
      </div>
    </section>
  );
};
