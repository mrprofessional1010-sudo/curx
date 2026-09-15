"use client";

import React from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { ShieldCheck, FileText, CheckCircle2, Lock, Eye, AlertCircle } from "lucide-react";

export const TrustSection: React.FC = () => {
  const principles = [
    {
      id: "01",
      title: "DETERMINISTIC",
      lead: "Safety decisions are strictly driven by rules and structured clinical data.",
      detail:
        "The risk engine operates within mathematically bounded criteria. Boolean gates, CPIC dosing guidelines, and FDA contraindication tables prevent generative randomness in safety calculations.",
      icon: <Lock className="w-5 h-5 text-curx-cyan" />,
      color: "border-curx-cyan/30 text-curx-cyan",
    },
    {
      id: "02",
      title: "EXPLAINABLE",
      lead: "Every finding is traceable to contributing biological factors and evidence.",
      detail:
        "Curx avoids black-box ambiguity. Clinicians can audit the exact allele, inhibitor drug, symptom cascade, and published peer-reviewed study behind every synthesized insight.",
      icon: <Eye className="w-5 h-5 text-curx-amber" />,
      color: "border-curx-amber/30 text-curx-amber",
    },
    {
      id: "03",
      title: "RESPONSIBLE",
      lead: "Curx does not autonomously diagnose, prescribe, or replace clinicians.",
      detail:
        "We build clinical decision-support infrastructure. Final diagnostic determinations, dosage modifications, and therapeutic choices remain firmly in the hands of licensed healthcare providers.",
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      color: "border-white/20 text-white",
    },
  ];

  return (
    <section id="trust" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-[#06080B]">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 10 // CLINICAL TRUST PRINCIPLES"
          badgeColor="slate"
          title={
            <>
              Built on three foundational <br />
              <GlowText variant="white">clinical trust pillars.</GlowText>
            </>
          }
          subtitle="Precision medicine demands absolute transparency. Our engineering principles ensure safety, traceability, and ethical responsibility at every stage."
        />

        {/* 3 Large Editorial Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 my-12">
          {principles.map((p) => (
            <div
              key={p.id}
              className="glass-panel rounded-2xl p-8 border border-white/10 hover:border-white/25 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    {p.icon}
                  </div>
                  <span className="font-mono text-2xl font-bold text-white/20">
                    {p.id}
                  </span>
                </div>

                <h3 className="font-display text-2xl font-extrabold text-white tracking-wide mb-3">
                  {p.title}
                </h3>

                <p className="text-sm font-semibold text-slate-200 leading-snug mb-4 font-sans">
                  {p.lead}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed font-sans font-normal">
                  {p.detail}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-curx-cyan" />
                <span>Verified Architectural Standard</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
