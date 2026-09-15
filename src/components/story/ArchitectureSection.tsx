"use client";

import React, { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { Shield, Cpu, ArrowRight, CheckCircle2, Lock, Sparkles, Database, FileCheck } from "lucide-react";

export const ArchitectureSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(3);

  const safetySteps = [
    { title: "DATA INGESTION", desc: "Structured EHR, PGx VCF files, patient reports." },
    { title: "VALIDATION & NORMALIZATION", desc: "RxNorm, HGVS allele mapping, LOINC terms." },
    { title: "DETERMINISTIC RULES", desc: "CPIC Level 1A guidelines, FDA label contraindications." },
    { title: "RISK ENVELOPE COMPUTATION", desc: "Strict algorithmic decision boundary output." },
    { title: "EVIDENCE ATTACHMENT", desc: "Immutable citations linked to deterministic result." },
  ];

  const languageSteps = [
    { title: "RISK TRACE INGESTION", desc: "Consumes already-computed risk vector and rule IDs." },
    { title: "EVIDENCE GROUNDING", desc: "Constrains synthesis strictly within verified literature." },
    { title: "CLINICAL ARTICULATION", desc: "Translates complex pharmacological paths into clear clinician notes." },
  ];

  return (
    <section id="architecture" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-graphite">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 04 // DUAL-PLANE ARCHITECTURE"
          badgeColor="cyan"
          title={
            <>
              How Curx Thinks: <br />
              <GlowText variant="cyan">The rules decide. The model explains.</GlowText>
            </>
          }
          subtitle="Curx strictly separates mathematical risk computation from natural language articulation. Clinical safety is never left to generative speculation."
        />

        {/* Dual Plane Comparative Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-12">
          {/* PLANE 01: DETERMINISTIC SAFETY PLANE */}
          <div className="glass-panel rounded-2xl p-7 sm:p-8 border border-curx-cyan/30 relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_rgba(0,240,208,0.06)]">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-curx-cyan/15 border-b border-l border-curx-cyan/30 text-curx-cyan font-mono text-[10px] font-bold tracking-widest uppercase rounded-bl-xl">
              PLANE 01 // DETERMINISTIC
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-curx-cyan/15 border border-curx-cyan/40 flex items-center justify-center text-curx-cyan">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    Safety & Rules Engine
                  </h3>
                  <span className="text-xs font-mono text-curx-cyan">
                    Computes Clinical Risk Boundary
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans mb-6">
                All drug-drug, gene-drug, and condition contraindications are evaluated using deterministic boolean and threshold logic anchored in curated databases.
              </p>

              {/* Safety Steps Pipeline */}
              <div className="space-y-3 font-mono text-xs">
                {safetySteps.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-start gap-3 ${
                      activeStep === idx
                        ? "bg-curx-cyan/10 border-curx-cyan text-white shadow-[0_0_15px_rgba(0,240,208,0.15)]"
                        : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/20"
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-curx-cyan font-bold shrink-0">
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white tracking-wider">{step.title}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-curx-cyan">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero Generative Hallucination in Risk Output</span>
              </span>
              <span className="text-[10px] uppercase text-slate-400">Deterministic Boundary</span>
            </div>
          </div>

          {/* PLANE 02: LANGUAGE / EXPLANATION PLANE */}
          <div className="glass-panel rounded-2xl p-7 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-white/[0.06] border-b border-l border-white/15 text-slate-300 font-mono text-[10px] font-bold tracking-widest uppercase rounded-bl-xl">
              PLANE 02 // EXPLANATION
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/20 flex items-center justify-center text-slate-200">
                  <Sparkles className="w-5 h-5 text-curx-amber" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white tracking-wide">
                    Clinical Synthesis Plane
                  </h3>
                  <span className="text-xs font-mono text-curx-amber">
                    Articulates Grounded Explanations
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans mb-6">
                The language plane articulates why the deterministic engine flagged a risk, synthesizing contributing factors into succinct clinical summaries without inventing diagnoses.
              </p>

              {/* Language Steps Pipeline */}
              <div className="space-y-3 font-mono text-xs">
                {languageSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-white/[0.02] border-white/[0.06] text-slate-300 flex items-start gap-3"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-curx-amber font-bold shrink-0">
                      0{idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white tracking-wider">{step.title}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sample Grounded Output Box */}
              <div className="mt-5 p-4 rounded-xl bg-black/40 border border-curx-amber/30 text-xs font-sans text-slate-300">
                <span className="text-[10px] font-mono tracking-widest text-curx-amber uppercase block mb-1">
                  Synthesized Decision-Support Output (Demo)
                </span>
                <p className="italic text-slate-200 leading-relaxed">
                  "Patient possesses CYP2D6 *4/*41 (Intermediate Metabolizer phenotype). Concomitant Fluoxetine potent inhibition severely reduces Tamoxifen activation into Endoxifen. Consider oncology review for alternative aromatase inhibitor or alternative SSRI."
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-curx-amber">
                <FileCheck className="w-3.5 h-3.5" />
                <span>Strictly Evidence-Constrained Prompting</span>
              </span>
              <span className="text-[10px] uppercase text-slate-400">Clinician Context</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
