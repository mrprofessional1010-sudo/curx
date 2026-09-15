"use client";

import React, { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { AlertCircle, Dna, Pill, HeartPulse, Stethoscope, Unlink } from "lucide-react";

export const DisconnectSection: React.FC = () => {
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const domains = [
    {
      id: "symptoms",
      title: "SYMPTOMS",
      subtitle: "Phenotypic Patient Reports",
      icon: <HeartPulse className="w-5 h-5 text-curx-orange" />,
      color: "border-curx-orange/30 bg-[#180907]/60 text-curx-orange",
      description: "Logged in isolation without metabolic or genetic context.",
      isolatedData: "Tachycardia, Fatigue, Muscle Cramps",
    },
    {
      id: "genetics",
      title: "GENETICS",
      subtitle: "Pharmacogenomic Alleles",
      icon: <Dna className="w-5 h-5 text-curx-cyan" />,
      color: "border-curx-cyan/30 bg-[#071118]/60 text-curx-cyan",
      description: "Buried in PDF lab reports, rarely checked at the point of prescribing.",
      isolatedData: "CYP2D6 *4/*41, CYP2C19 *2/*2",
    },
    {
      id: "medications",
      title: "MEDICATIONS",
      subtitle: "Active Multi-Drug Regimens",
      icon: <Pill className="w-5 h-5 text-curx-amber" />,
      color: "border-curx-amber/30 bg-[#181107]/60 text-curx-amber",
      description: "Checked only with 1-to-1 alert databases that cause alert fatigue.",
      isolatedData: "Tamoxifen 20mg + Fluoxetine 20mg",
    },
    {
      id: "conditions",
      title: "CONDITIONS",
      subtitle: "Comorbidities & Organ Status",
      icon: <Stethoscope className="w-5 h-5 text-slate-300" />,
      color: "border-white/10 bg-white/[0.03] text-slate-300",
      description: "Scattered across siloed EHR records and outdated clinic notes.",
      isolatedData: "CKD Stage 2, Long QT History",
    },
  ];

  return (
    <section id="disconnect" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-graphite">
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <SectionHeading
          badge="SECTION 02 // THE PROBLEM"
          badgeColor="orange"
          title={
            <>
              Healthcare information is connected. <br />
              <GlowText variant="orange">Your tools aren't.</GlowText>
            </>
          }
          subtitle="Clinical data lives in silos. When genetic variants, drug regimens, phenotypic symptoms, and organ status are analyzed separately, critical drug-gene and drug-drug risks remain invisible."
        />

        {/* Spatial Disconnect Interactive Diagram */}
        <div className="relative glass-panel rounded-2xl p-8 sm:p-12 border border-white/10 overflow-hidden my-12">
          {/* Background broken circuit lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <line x1="20%" y1="20%" x2="45%" y2="45%" stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="6 6" />
              <line x1="80%" y1="20%" x2="55%" y2="45%" stroke="#00F0D0" strokeWidth="1.5" strokeDasharray="6 6" />
              <line x1="20%" y1="80%" x2="45%" y2="55%" stroke="#FFB020" strokeWidth="1.5" strokeDasharray="6 6" />
              <line x1="80%" y1="80%" x2="55%" y2="55%" stroke="#8E9BAE" strokeWidth="1.5" strokeDasharray="6 6" />
            </svg>
          </div>

          {/* 4 Isolated Domain Clusters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
            {domains.map((d) => (
              <div
                key={d.id}
                onMouseEnter={() => setActiveDomain(d.id)}
                onMouseLeave={() => setActiveDomain(null)}
                className={`p-6 rounded-xl border backdrop-blur-md transition-all duration-300 cursor-pointer ${d.color} ${
                  activeDomain === d.id ? "scale-[1.02] shadow-[0_0_30px_rgba(255,255,255,0.06)]" : "opacity-90"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {d.icon}
                    <span className="font-mono text-xs font-bold tracking-widest uppercase text-white">
                      {d.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                    SILO 0{domains.indexOf(d) + 1}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
                  {d.description}
                </p>

                <div className="p-2.5 rounded bg-black/40 border border-white/[0.06] text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span>Isolated Value:</span>
                  <span className="text-white font-semibold">{d.isolatedData}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Center Disconnect Gap & Warning */}
          <div className="mt-10 pt-8 border-t border-white/[0.08] text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-curx-orange/15 border border-curx-orange/40 text-curx-orange font-mono text-xs font-semibold tracking-wider mb-4">
              <Unlink className="w-4 h-4" />
              <span>THE INFORMATION EXISTS. THE CONNECTION IS MISSING.</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl font-normal leading-relaxed">
              Standard clinical alerts check only one drug against another. They miss the cascade when a poor metabolizer genotype (CYP2D6 *4/*41) encounters an inhibitor drug (Fluoxetine) simultaneously with a prodrug (Tamoxifen).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
