"use client";

import React, { useState, useEffect } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlowText } from "@/components/ui/GlowText";
import { MessageSquare, ArrowDown, HelpCircle, CheckCircle, Info, Sparkles, Filter, AlertOctagon, Check } from "lucide-react";

interface CandidateCondition {
  id: string;
  name: string;
  description?: string;
  matchedSymptomsCount: number;
  totalConditionSymptomsCount: number;
  matchTier: "HIGHER RELATIVE MATCH" | "MODERATE RELATIVE MATCH" | "LOWER RELATIVE MATCH";
  precautions: string[];
}

export const SymptomSection: React.FC = () => {
  const [reportedSymptoms, setReportedSymptoms] = useState<string[]>(["itching", "skin rash", "nodal skin eruptions"]);
  const [candidates, setCandidates] = useState<CandidateCondition[]>([]);
  const [nextQuestion, setNextQuestion] = useState<{
    symptomId: string;
    symptomName: string;
    questionText: string;
    discriminatingPower: number;
  } | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdaptiveSymptoms = async (symptomsList: string[]) => {
    try {
      setLoading(true);
      const res = await fetch("/api/symptoms/adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: symptomsList }),
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        setNextQuestion(data.nextQuestion || null);
        setIsEmergency(Boolean(data.isEmergency));
        setEmergencyAlert(data.emergencyAlert || null);
      }
    } catch (err) {
      console.error("Error evaluating live symptoms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdaptiveSymptoms(reportedSymptoms);
  }, []);

  const handleAnswerQuestion = (answerYes: boolean) => {
    if (!nextQuestion) return;
    const updated = answerYes
      ? [...reportedSymptoms, nextQuestion.symptomName]
      : [...reportedSymptoms]; // if no, we don't add to positive set
    setReportedSymptoms(updated);
    fetchAdaptiveSymptoms(updated);
  };

  return (
    <section id="symptoms" className="relative py-28 px-6 lg:px-14 border-b border-white/[0.06] bg-graphite">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          badge="SECTION 06 // ADAPTIVE SYMPTOM REASONING"
          badgeColor="orange"
          title={
            <>
              Start with what you're <br />
              <GlowText variant="orange">experiencing right now.</GlowText>
            </>
          }
          subtitle="Curx uses deterministic symptom–condition matching and adaptive question selection to clarify clinical ambiguity without probabilistic guessing."
        />

        {/* Emergency Alert Banner if triggered */}
        {isEmergency && emergencyAlert && (
          <div className="my-6 p-4 rounded-xl bg-curx-red/15 border border-curx-red/40 flex items-center gap-3 text-curx-red font-mono text-xs">
            <AlertOctagon className="w-5 h-5 shrink-0 animate-pulse" />
            <span>{emergencyAlert}</span>
          </div>
        )}

        {/* Conversational & Ranking Dual UI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-12">
          {/* Left: Adaptive Questioning Flow */}
          <div className="lg:col-span-6 glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-6">
                <div className="flex items-center gap-2 text-xs font-mono text-curx-orange font-semibold">
                  <MessageSquare className="w-4 h-4" />
                  <span>DETERMINISTIC QUESTIONING FLOW</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
                  LIVE MATRIX ACTIVE
                </span>
              </div>

              <div className="space-y-4">
                {/* Step 1: Active Symptoms */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 uppercase">
                    <span className="text-slate-300 font-bold">1. REPORTED SYMPTOMS</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-black/40 text-curx-cyan">
                      {reportedSymptoms.length} ACTIVE
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reportedSymptoms.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 font-mono text-xs text-white capitalize"
                      >
                        {s.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Step 2: Live Adaptive Question */}
                {nextQuestion ? (
                  <div className="p-4 rounded-xl bg-curx-orange/[0.06] border border-curx-orange/30 shadow-[0_0_20px_rgba(255,107,0,0.08)]">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 uppercase">
                      <span className="text-curx-orange font-bold">2. ADAPTIVE DISCRIMINATING QUESTION</span>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-black/40 text-curx-amber">
                        {nextQuestion.discriminatingPower}% DISCRIMINATION
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed my-2">
                      {nextQuestion.questionText}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAnswerQuestion(true)}
                        className="px-4 py-1.5 rounded-lg bg-curx-orange text-graphite font-mono text-xs font-bold hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>YES / PRESENT</span>
                      </button>
                      <button
                        onClick={() => handleAnswerQuestion(false)}
                        className="px-4 py-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 font-mono text-xs transition-colors cursor-pointer"
                      >
                        <span>NO / ABSENT</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-curx-cyan/[0.05] border border-curx-cyan/30 text-xs font-mono text-slate-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-curx-cyan" />
                    <span>Candidate condition subset fully distinguished by matrix.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-curx-orange">
                <Filter className="w-3.5 h-3.5" />
                <span>Deterministic matrix pruning</span>
              </span>
              <span className="text-[10px] uppercase text-slate-400">
                {candidates.length} Candidate Conditions
              </span>
            </div>
          </div>

          {/* Right: Ranked Possibilities (Qualitative Tiers) */}
          <div className="lg:col-span-6 glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08] mb-6">
                <div className="flex items-center gap-2 text-xs font-mono text-curx-cyan font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>CANDIDATE CONDITIONS (QUALITATIVE MATCH)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] uppercase">
                  LIVE BENCHMARK
                </span>
              </div>

              <div className="space-y-3.5">
                {candidates.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-curx-cyan/30 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-curx-cyan/20 text-curx-cyan text-[10px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        {r.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase ${
                          r.matchTier === "HIGHER RELATIVE MATCH"
                            ? "bg-curx-cyan/15 text-curx-cyan border border-curx-cyan/30"
                            : r.matchTier === "MODERATE RELATIVE MATCH"
                            ? "bg-curx-amber/15 text-curx-amber border border-curx-amber/30"
                            : "bg-white/[0.05] text-slate-400"
                        }`}
                      >
                        {r.matchTier}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-sans leading-relaxed mt-1.5">
                      {r.description || `Symptoms overlap with ${r.matchedSymptomsCount} clinical markers.`}
                    </p>

                    {r.precautions && r.precautions.length > 0 && (
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        <span className="text-curx-amber">Precaution:</span> {r.precautions.slice(0, 2).join(" • ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mandatory Safety Callout */}
            <div className="mt-6 p-3.5 rounded-xl bg-curx-orange/[0.08] border border-curx-orange/30 text-[11px] font-mono text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-curx-orange shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="text-curx-orange">Qualitative relative match — not a medical diagnosis.</strong> Curx is a clinical decision support tool designed to guide conversation between patients and licensed healthcare professionals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

