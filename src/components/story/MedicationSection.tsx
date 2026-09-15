"use client";

import React, { useState, useEffect } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Pill, Dna, AlertTriangle, ShieldCheck, ArrowRight, HelpCircle, Layers, Activity } from "lucide-react";

interface MedicationFactor {
  id: string;
  type: string;
  title: string;
  severity: "low" | "moderate" | "high" | "severe";
  mechanisms: string;
  guideline: string;
  level: string;
}

export const MedicationSection: React.FC = () => {
  const [selectedFactor, setSelectedFactor] = useState<string>("gene-drug");
  const [factors, setFactors] = useState<MedicationFactor[]>([
    {
      id: "gene-drug",
      type: "GENE–DRUG INTERACTION",
      title: "CYP2C9 *1/*3 + WARFARIN",
      severity: "severe",
      mechanisms: "Intermediate metabolizer (*1/*3) genotype reduces S-warfarin clearance by ~70%, substantially elevating international normalized ratio (INR) and major bleeding risk.",
      guideline: "CPIC Guideline for Pharmacogenetics-Guided Warfarin Dosing (Level 1A)",
      level: "Level 1A CPIC Guideline",
    },
    {
      id: "drug-drug",
      type: "DRUG–DRUG INTERACTION",
      title: "IBUPROFEN + WARFARIN",
      severity: "severe",
      mechanisms: "Pharmacodynamic and pharmacokinetic synergism: COX-1 platelet inhibition combined with competitive plasma protein displacement causes acute gastrointestinal bleeding.",
      guideline: "FDA Boxed Warning & Validated DDI Interaction Registry",
      level: "Established Clinical Contraindication",
    },
    {
      id: "condition-drug",
      type: "CONDITION–DRUG FACTOR",
      title: "PEPTIC ULCER DISEASE + IBUPROFEN",
      severity: "severe",
      mechanisms: "Suppression of protective gastric mucosal prostaglandin synthesis (PGE2/PGI2) triggers acute ulcer perforation and severe hemorrhage.",
      guideline: "CURX Curated Condition-Drug Contraindication Rule CDR_PUD_IBU_01",
      level: "Absolute Clinical Contraindication",
    },
  ]);

  const [activeMedication, setActiveMedication] = useState<string>("Warfarin 5mg + Ibuprofen 400mg");
  const [computedRisk, setComputedRisk] = useState<"low" | "moderate" | "high" | "severe">("severe");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadLiveData() {
      try {
        setLoading(true);
        const res = await fetch("/api/risk/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (res.ok) {
          const data = await res.json();
          const evaluation = data.evaluation;
          if (evaluation && evaluation.factors && evaluation.factors.length > 0) {
            setComputedRisk(evaluation.overallRisk.toLowerCase() as any);
            const liveFactors: MedicationFactor[] = evaluation.factors.map((f: any) => ({
              id: f.id,
              type: f.category.replace("_", "–"),
              title: f.title,
              severity: f.severity.toLowerCase() as any,
              mechanisms: f.mechanism,
              guideline: f.evidenceSource?.title || f.recommendation,
              level: `${f.severity} Evidence Tier`,
            }));
            setFactors(liveFactors);
            setSelectedFactor(liveFactors[0].id);
          }
        }
      } catch (err) {
        console.error("Live risk evaluation fetch notice:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveData();
  }, []);

  const current = factors.find((f) => f.id === selectedFactor) || factors[0];

  return (
    <section id="medication" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-[#07090D]">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 05 // MULTIMODAL MEDICATION RISK"
          badgeColor="amber"
          title={
            <>
              Know exactly what is <br />
              <GlowText variant="amber">influencing the risk.</GlowText>
            </>
          }
          subtitle="Curx doesn't just return a generic risk score. It isolates the contributing genetic alleles, drug-drug inhibitors, and physiological factors with traceable clinical pathways."
        />

        {/* Medication Deep Dive Card */}
        <div className="glass-panel rounded-2xl p-6 sm:p-10 border border-white/10 relative overflow-hidden my-12">
          {/* Top Banner: Medication in Focus */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-curx-amber/10 border border-curx-amber/30 flex items-center justify-center text-curx-amber">
                <Pill className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
                  REAL PRODUCTION REGIMEN IN FOCUS
                </span>
                <h3 className="font-display text-2xl font-bold text-white tracking-wide">
                  {activeMedication}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">DETERMINISTIC RISK:</span>
              <RiskBadge level={computedRisk} label={`${computedRisk.toUpperCase()} CLINICAL RISK`} size="lg" />
            </div>
          </div>

          {/* Interactive Factor Selector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
            {/* Left factor list buttons */}
            <div className="lg:col-span-5 space-y-3">
              <span className="text-xs font-mono tracking-widest text-slate-400 uppercase block mb-2">
                CONTRIBUTING FACTORS (EVALUATED LIVE → WHY?)
              </span>

              {factors.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFactor(f.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 cursor-pointer ${
                    selectedFactor === f.id
                      ? "bg-[#141A22] border-curx-cyan shadow-[0_0_20px_rgba(0,240,208,0.15)]"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/20 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider font-semibold text-curx-cyan uppercase">
                      {f.type}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        f.severity === "severe"
                          ? "bg-curx-red animate-ping"
                          : f.severity === "high"
                          ? "bg-curx-orange"
                          : "bg-curx-amber"
                      }`}
                    />
                  </div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white">
                    {f.title}
                  </span>
                </button>
              ))}
            </div>

            {/* Right detailed mechanism inspector */}
            <div className="lg:col-span-7 rounded-xl bg-black/40 border border-white/[0.08] p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                  <span className="text-xs font-mono text-curx-amber font-semibold tracking-wider uppercase">
                    {current.type} MECHANISM
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-slate-300 font-mono text-[10px] uppercase">
                    {current.level}
                  </span>
                </div>

                <div className="my-5">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block mb-1.5">
                    Biochemical Cascade Explanation
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    {current.mechanisms}
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-curx-cyan/[0.03] border border-curx-cyan/20">
                  <span className="text-[10px] font-mono tracking-widest text-curx-cyan uppercase block mb-1">
                    CPIC / Evidence Guideline Source
                  </span>
                  <p className="text-xs text-slate-300 font-sans">
                    {current.guideline}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-curx-cyan">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Traceable back to primary literature</span>
                </span>
                <span className="text-[10px] uppercase text-curx-cyan font-semibold">
                  Supabase Live Rules
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

