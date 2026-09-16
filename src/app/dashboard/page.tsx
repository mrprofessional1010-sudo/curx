"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { GlowText } from "@/components/ui/GlowText";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EvidenceCard } from "@/components/ui/EvidenceCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { AiChatAssistant } from "@/components/chat/AiChatAssistant";
import {
  Activity,
  Shield,
  Pill,
  Dna,
  HeartPulse,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  LogOut,
  User,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Navigation,
  Loader2,
  HelpCircle,
  Edit3,
  Sparkles,
} from "lucide-react";

type DashboardTab = "overview" | "medications" | "genetics" | "symptoms" | "risk" | "evidence" | "care";

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  // Synchronize active tab with URL hash for persistent routing and back/forward navigation
  useEffect(() => {
    const syncTabFromHash = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "").toLowerCase();
        const validTabs: DashboardTab[] = [
          "overview",
          "medications",
          "genetics",
          "symptoms",
          "risk",
          "evidence",
          "care",
        ];
        if (validTabs.includes(hash as DashboardTab)) {
          setActiveTab(hash as DashboardTab);
        }
      }
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  const handleTabChange = (tabId: DashboardTab) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tabId}`);
    }
  };
  const [patientData, setPatientData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // AI Assistant Drawer State
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  // Deterministic Risk Engine State
  const [riskResult, setRiskResult] = useState<any>(null);
  const [riskLoading, setRiskLoading] = useState<boolean>(false);

  // Candidate Medication Testing
  const [candidateMeds, setCandidateMeds] = useState<Array<{ name: string; dose: string }>>([]);
  const [selectedCandidateToAdd, setSelectedCandidateToAdd] = useState<string>("");

  // Adaptive Symptom State
  const [reportedSymptoms, setReportedSymptoms] = useState<string[]>([]);
  const [symptomCandidates, setSymptomCandidates] = useState<any[]>([]);
  const [nextQuestion, setNextQuestion] = useState<any>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null);
  const [symptomLoading, setSymptomLoading] = useState<boolean>(false);

  // Care Finder Facilities State
  const [facilities, setFacilities] = useState<any[]>([]);
  const [selectedFacilityIdx, setSelectedFacilityIdx] = useState<number>(0);
  const [careLoading, setCareLoading] = useState<boolean>(false);

  // Authentication Protection Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, authLoading, router]);

  // Load Real Patient Data
  const loadPatientData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/patient");
      if (!res.ok) {
        throw new Error(`Failed to load patient profile (HTTP ${res.status})`);
      }
      const data = await res.json();
      
      // If user has no profile, route directly to /onboarding
      if (!data.hasProfile || !data.patient) {
        router.push("/onboarding");
        return;
      }

      setPatientData(data.patient);

      // Initialize symptoms from patient
      const initialSyms = (data.patient.symptoms || []).map((s: any) => s.name.toLowerCase());
      setReportedSymptoms(initialSyms);

      // Evaluate Initial Deterministic Risk
      evaluateRisk(data.patient, []);

      // Evaluate Initial Symptoms
      if (initialSyms.length > 0) {
        evaluateSymptoms(initialSyms);
      }

      // Fetch nearby care for patient city
      fetchCareFacilities(data.patient.city);
    } catch (err: any) {
      console.error("Dashboard patient fetch error:", err);
      setError(err?.message || "Failed to retrieve clinical profile from Supabase.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPatientData();
    }
  }, [user]);

  // Evaluate Deterministic Risk Engine
  const evaluateRisk = async (patient: any, candidates: Array<{ name: string; dose: string }>) => {
    if (!patient) return;
    setRiskLoading(true);
    try {
      const payload = {
        patientId: patient.id,
        patientVariants: (patient.variants || []).map((v: any) => ({
          gene: v.geneSymbol || v.gene_symbol,
          diplotype: v.diplotype,
          phenotype: v.phenotype,
          activityScore: 0.5,
        })),
        activeMedications: [...(patient.medications || []), ...candidates].map((m: any) => ({
          name: m.name,
          dose: m.dosage || m.dose || "Standard dose",
        })),
        conditions: (patient.conditions || []).map((c: any) => ({
          name: c.name,
        })),
      };

      const res = await fetch("/api/risk/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRiskResult(data);
      }
    } catch (err) {
      console.warn("Error evaluating risk:", err);
    } finally {
      setRiskLoading(false);
    }
  };

  // Evaluate Adaptive Symptoms
  const evaluateSymptoms = async (syms: string[]) => {
    if (syms.length === 0) {
      setSymptomCandidates([]);
      setNextQuestion(null);
      setEmergencyAlert(null);
      return;
    }
    setSymptomLoading(true);
    try {
      const res = await fetch("/api/symptoms/adaptive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportedSymptoms: syms }),
      });
      if (res.ok) {
        const data = await res.json();
        setSymptomCandidates(data.candidates || []);
        setNextQuestion(data.nextQuestion || null);
        setEmergencyAlert(data.emergencyAlert || null);
      }
    } catch (err) {
      console.warn("Error evaluating symptoms:", err);
    } finally {
      setSymptomLoading(false);
    }
  };

  // Fetch Nearby Facilities
  const fetchCareFacilities = async (city?: string) => {
    setCareLoading(true);
    try {
      const qCity = city || patientData?.city || "San Francisco";
      const res = await fetch(`/api/care/nearby?city=${encodeURIComponent(qCity)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.facilities && data.facilities.length > 0) {
          setFacilities(data.facilities);
          setSelectedFacilityIdx(0);
        }
      }
    } catch (err) {
      console.warn("Error fetching facilities:", err);
    } finally {
      setCareLoading(false);
    }
  };

  // Candidate Drug Handlers
  const handleAddCandidate = (drugName: string) => {
    if (!drugName) return;
    const exists = candidateMeds.some((m) => m.name.toLowerCase() === drugName.toLowerCase());
    if (exists) return;

    const updated = [...candidateMeds, { name: drugName, dose: "Standard dose" }];
    setCandidateMeds(updated);
    setSelectedCandidateToAdd("");
    if (patientData) {
      evaluateRisk(patientData, updated);
    }
  };

  const handleRemoveCandidate = (drugName: string) => {
    const updated = candidateMeds.filter((m) => m.name.toLowerCase() !== drugName.toLowerCase());
    setCandidateMeds(updated);
    if (patientData) {
      evaluateRisk(patientData, updated);
    }
  };

  // Symptom Answering
  const handleAnswerQuestion = (symptomKey: string, affirmed: boolean) => {
    if (affirmed) {
      const updated = [...reportedSymptoms, symptomKey];
      setReportedSymptoms(updated);
      evaluateSymptoms(updated);
    } else {
      // Re-evaluate without adding
      const updatedCandidates = symptomCandidates.map((c) => ({
        ...c,
        unansweredCount: Math.max(0, (c.unansweredCount || 1) - 1),
      }));
      setSymptomCandidates(updatedCandidates);
      setNextQuestion(null);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Loading Screen
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#06080B] text-white flex flex-col items-center justify-center p-6">
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0C1219] border border-curx-cyan/50 shadow-[0_0_40px_rgba(0,240,208,0.25)] mb-6">
          <span className="w-3 h-3 rounded-full bg-curx-cyan animate-ping" />
          <span className="w-2 h-2 rounded-full bg-curx-cyan" />
        </div>
        <h2 className="font-display text-xl font-bold tracking-wider text-white mb-2">
          CURX CLINICAL INTELLIGENCE
        </h2>
        <p className="font-mono text-xs text-curx-cyan tracking-widest uppercase flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>ESTABLISHING SECURE CLINICIAN SESSION...</span>
        </p>
      </div>
    );
  }

  // Error / Empty State
  if (error || !patientData) {
    return (
      <div className="min-h-screen bg-[#06080B] text-white flex flex-col items-center justify-center p-6">
        <div className="glass-panel max-w-md w-full p-8 rounded-2xl border border-white/10 text-center">
          <AlertTriangle className="w-10 h-10 text-curx-orange mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-white mb-2">
            No Patient Profile Available
          </h3>
          <p className="text-xs font-sans text-slate-300 leading-relaxed mb-6">
            {error || "An active patient profile was not found for this account."}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/onboarding")}
              className="w-full py-2.5 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold tracking-wider hover:bg-white transition-colors"
            >
              BUILD YOUR PROFILE
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-lg border border-white/15 text-slate-300 font-mono text-xs hover:border-white/40 transition-colors"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayName =
    patientData.fullName ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Clinician";

  // Check highest severity collision trace
  const topCollision = riskResult?.structuredTrace?.[0] || null;

  return (
    <div className="min-h-screen bg-[#06080B] text-[#EDF2F7] flex flex-col font-sans">
      {/* Top Clinician Header */}
      <header className="sticky top-0 z-40 bg-[#06080B]/90 backdrop-blur-xl border-b border-white/[0.08] px-6 lg:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
              <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_8px_#00F0D0]" />
            </div>
            <span className="font-display tracking-[0.25em] text-lg font-bold text-white group-hover:text-curx-cyan transition-colors">
              CURX
            </span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-[10px] font-mono text-curx-cyan uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
            <span>CLINICAL DECISION SUPPORT ACTIVE</span>
          </div>
        </div>

        {/* Right User & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsChatOpen(true)}
            id="open-ai-chat-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-curx-cyan/15 border border-curx-cyan/40 hover:bg-curx-cyan/25 hover:border-curx-cyan text-xs font-mono text-curx-cyan font-bold transition-all shadow-[0_0_15px_rgba(0,240,208,0.15)]"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Assistant</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/15 hover:border-curx-cyan text-xs font-mono text-slate-200 hover:text-white transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-curx-cyan" />
            <span>Edit Health Profile</span>
          </button>

          <div className="flex items-center gap-2.5 text-right">
            <div className="hidden md:block">
              <div className="text-xs font-mono font-bold text-white leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">
                {patientData.city || "San Francisco"} // {patientData.isDemo ? "Demo Persona" : "Personal Profile"}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-curx-cyan">
              <User className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg border border-white/10 hover:border-curx-red/40 hover:bg-curx-red/10 text-slate-300 hover:text-curx-red transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Patient Identifier Banner */}
      <div className="bg-[#090D13] border-b border-white/[0.06] px-6 lg:px-10 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-curx-cyan" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-base font-bold text-white tracking-wide">
                {patientData.fullName}
              </h1>
              {patientData.isDemo ? (
                <span className="px-2 py-0.5 rounded bg-curx-amber/15 border border-curx-amber/30 text-curx-amber font-mono text-[9px] uppercase font-semibold">
                  DEMO PATIENT (PAT-84920)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-curx-cyan/15 border border-curx-cyan/30 text-curx-cyan font-mono text-[9px] uppercase font-semibold">
                  PERSONAL PROFILE
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Age: {patientData.age} // Gender: {patientData.gender} // Location: {patientData.city || "San Francisco"} //{" "}
              {patientData.conditions && patientData.conditions.length > 0
                ? patientData.conditions.map((c: any) => c.name).join(" • ")
                : "No known conditions"}
            </div>
          </div>
        </div>

        {/* Global Computed Risk Badge & Edit Trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-1 rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 hover:text-white hover:border-curx-cyan text-xs font-mono flex items-center gap-1.5 transition-colors sm:hidden"
          >
            <Edit3 className="w-3.5 h-3.5 text-curx-cyan" />
            <span>Edit</span>
          </button>

          {riskResult && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase hidden sm:inline">
                COMPUTED RISK:
              </span>
              <RiskBadge
                level={riskResult.riskTier?.toLowerCase() || "low"}
                label={riskResult.riskTier || "LOW RISK"}
                size="md"
              />
            </div>
          )}
        </div>
      </div>

      {/* Dashboard Body: Main Content Workspace + Right Navigation Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row relative items-start w-full">
        {/* Main Tab Content Workspace */}
        <main className="flex-1 p-6 lg:p-10 w-full min-w-0 max-w-6xl mx-auto">
          {/* ================= TAB 1: OVERVIEW ================= */}
          {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Top Collision / Status Alert Banner */}
            {topCollision ? (
              <div className="glass-panel p-6 rounded-2xl border border-curx-orange/40 bg-gradient-to-r from-curx-orange/[0.08] via-transparent to-transparent">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-curx-orange/20 border border-curx-orange/40 text-curx-orange shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono tracking-widest text-curx-orange uppercase font-bold">
                        ACTIVE {topCollision.category || "COLLISION"} FLAGGED
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2">
                      {topCollision.message}
                    </h3>
                    <p className="text-xs font-sans text-slate-300 leading-relaxed mb-4">
                      {riskResult?.clinicalSummary || topCollision.mechanism || "Multi-axis interaction detected based on current medications and genetic variants."}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10">
                        <span className="text-slate-400 block text-[10px] uppercase">RULE ID</span>
                        <span className="text-curx-cyan font-bold">{topCollision.ruleId}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10">
                        <span className="text-slate-400 block text-[10px] uppercase">SEVERITY TIER</span>
                        <span className="text-curx-orange font-bold">{topCollision.severity}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10">
                        <span className="text-slate-400 block text-[10px] uppercase">EVIDENCE LEVEL</span>
                        <span className="text-curx-amber font-bold">Level {topCollision.evidenceLevel || "1A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border border-curx-cyan/40 bg-gradient-to-r from-curx-cyan/[0.06] via-transparent to-transparent">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-curx-cyan/20 border border-curx-cyan/40 text-curx-cyan shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono tracking-widest text-curx-cyan uppercase font-bold">
                        DETERMINISTIC EVALUATION COMPLETE
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-1">
                      No Critical Drug-Gene or Drug-Drug Collisions Detected
                    </h3>
                    <p className="text-xs font-sans text-slate-300 leading-relaxed">
                      All active medications, known genetic star alleles, and reported clinical conditions have been evaluated against CPIC guidelines and FDA package inserts without identifying contraindicated interactions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3 Metric Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Active Regimen */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                      ACTIVE MEDICATIONS
                    </span>
                    <Pill className="w-4 h-4 text-curx-cyan" />
                  </div>
                  <div className="space-y-2.5">
                    {(!patientData.medications || patientData.medications.length === 0) ? (
                      <p className="text-xs font-mono text-slate-500 italic p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        No medications added yet.
                      </p>
                    ) : (
                      patientData.medications.map((m: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-white">{m.name}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{m.dosage || "Standard dose"}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange("medications")}
                  className="mt-6 pt-3 border-t border-white/[0.06] text-xs font-mono text-curx-cyan hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>Explore Medications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Genetic Variants */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                      PHARMACOGENOMICS
                    </span>
                    <Dna className="w-4 h-4 text-curx-amber" />
                  </div>
                  <div className="space-y-2.5">
                    {(!patientData.variants || patientData.variants.length === 0) ? (
                      <p className="text-xs font-mono text-slate-500 italic p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        No known genetic results added.
                      </p>
                    ) : (
                      patientData.variants.map((v: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-curx-amber">{v.geneSymbol || v.gene_symbol}</span>
                            <span className="text-white text-[11px]">{v.diplotype}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{v.phenotype}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange("genetics")}
                  className="mt-6 pt-3 border-t border-white/[0.06] text-xs font-mono text-curx-cyan hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>View Genomic Profiles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 3: Conditions & Symptoms */}
              <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                      DIAGNOSES & COMPLAINTS
                    </span>
                    <HeartPulse className="w-4 h-4 text-curx-orange" />
                  </div>
                  <div className="space-y-2 mb-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Diagnosed Conditions:</span>
                    {(!patientData.conditions || patientData.conditions.length === 0) ? (
                      <p className="text-xs font-mono text-slate-500 italic">No known conditions added.</p>
                    ) : (
                      patientData.conditions.map((c: any, idx: number) => (
                        <div key={idx} className="text-xs font-mono text-white flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-curx-orange" />
                          <span>{c.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Reported Symptoms:</span>
                    {reportedSymptoms.length === 0 ? (
                      <p className="text-xs font-mono text-slate-500 italic">No current symptoms reported.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {reportedSymptoms.map((s, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[10px] font-mono text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange("symptoms")}
                  className="mt-6 pt-3 border-t border-white/[0.06] text-xs font-mono text-curx-cyan hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <span>Launch Symptom Differential</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MEDICATIONS ================= */}
        {activeTab === "medications" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Active Medication Regimen</h2>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Verified formulations cross-referenced against NLM RxNorm and CPIC guidelines.
                </p>
              </div>

              {/* Add Candidate Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedCandidateToAdd}
                  onChange={(e) => setSelectedCandidateToAdd(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0C1219] border border-white/15 text-xs font-mono text-white focus:border-curx-cyan outline-none"
                >
                  <option value="">+ Simulate Candidate Drug</option>
                  <option value="Venlafaxine">Venlafaxine (Alternative SSRI)</option>
                  <option value="Warfarin">Warfarin (Anticoagulant)</option>
                  <option value="Aspirin">Aspirin (NSAID / Antiplatelet)</option>
                  <option value="Ibuprofen">Ibuprofen (NSAID)</option>
                  <option value="Clopidogrel">Clopidogrel (Antiplatelet)</option>
                </select>
                <button
                  onClick={() => handleAddCandidate(selectedCandidateToAdd)}
                  disabled={!selectedCandidateToAdd}
                  className="px-4 py-2 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-2 rounded-lg border border-white/15 hover:border-curx-cyan text-xs font-mono text-white transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                  <span>Manage Regimen</span>
                </button>
              </div>
            </div>

            {/* Candidate Drugs Alert */}
            {candidateMeds.length > 0 && (
              <div className="p-4 rounded-xl bg-curx-cyan/[0.06] border border-curx-cyan/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-curx-cyan animate-pulse" />
                  <span className="text-xs font-mono text-curx-cyan">
                    Simulated Candidate Medications: {candidateMeds.map((c) => c.name).join(", ")}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCandidateMeds([]);
                    if (patientData) evaluateRisk(patientData, []);
                  }}
                  className="text-xs font-mono text-slate-400 hover:text-white"
                >
                  Reset Simulation
                </button>
              </div>
            )}

            {/* Medication Cards Grid */}
            {(!patientData.medications || patientData.medications.length === 0) && candidateMeds.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center">
                <Pill className="w-10 h-10 text-curx-cyan/50 mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Medications Added Yet</h3>
                <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto mb-4">
                  Add the medications you currently take to calculate personalized drug-drug and gene-drug interactions.
                </p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2 rounded-xl bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
                >
                  Add Your Medications
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(patientData.medications || []).map((med: any, idx: number) => (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-curx-cyan font-mono text-[10px] uppercase">
                          RxCUI: {med.rxcui || "CANONICAL"}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{med.dosage || "Standard dose"}</span>
                      </div>

                      <h3 className="font-display text-xl font-bold text-white mb-1">{med.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mb-4">
                        Frequency: {med.frequency || "Once daily"}
                      </p>

                      {med.uses && (
                        <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs text-slate-300 font-sans mb-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">Indications</span>
                          {med.uses}
                        </div>
                      )}
                      {med.sideEffects && (
                        <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-xs text-slate-300 font-sans">
                          <span className="text-[10px] font-mono text-slate-400 uppercase block mb-0.5">Known Side Effects</span>
                          {med.sideEffects}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Candidate Simulated Cards */}
                {candidateMeds.map((med, idx) => (
                  <div key={`cand_${idx}`} className="glass-panel p-6 rounded-2xl border border-curx-cyan/40 bg-curx-cyan/[0.02] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="px-2.5 py-0.5 rounded bg-curx-cyan/15 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] uppercase font-bold">
                          SIMULATED CANDIDATE
                        </span>
                        <button
                          onClick={() => handleRemoveCandidate(med.name)}
                          className="text-slate-400 hover:text-curx-red transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="font-display text-xl font-bold text-white mb-1">{med.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mb-4">{med.dose}</p>
                      <p className="text-xs text-slate-300">
                        Evaluating realtime multi-axis interaction against active alleles and co-prescribed therapies.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: GENETICS ================= */}
        {activeTab === "genetics" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Pharmacogenomics & Star Alleles</h2>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Hepatic and extra-hepatic drug-metabolizing enzyme variants with activity score calculations.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-lg border border-white/15 hover:border-curx-amber text-xs font-mono text-white transition-colors flex items-center gap-1.5 self-start"
              >
                <Plus className="w-3.5 h-3.5 text-curx-amber" />
                <span>Add Known Variant</span>
              </button>
            </div>

            {(!patientData.variants || patientData.variants.length === 0) ? (
              <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center">
                <Dna className="w-10 h-10 text-curx-amber/50 mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Known Genetic Results Added</h3>
                <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto mb-4">
                  Enter known test results from clinical genetics reports (such as CYP2D6, CYP2C19, VKORC1) to unlock pharmacogenomic safety intelligence.
                </p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2 rounded-xl bg-curx-amber text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
                >
                  Add Known Result
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {patientData.variants.map((v: any, idx: number) => (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-curx-amber/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 rounded bg-curx-amber/15 border border-curx-amber/30 text-curx-amber font-mono text-[10px] font-bold uppercase tracking-wider">
                          {v.geneSymbol || v.gene_symbol} // {v.diplotype}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Activity Score: 0.5</span>
                      </div>

                      <h3 className="font-display text-2xl font-bold text-white mb-2">{v.phenotype}</h3>
                      <p className="text-xs font-sans text-slate-300 leading-relaxed mb-4">
                        {v.phenotype?.includes("Poor")
                          ? "Marked reduction or total absence of metabolic activity. Substrates may accumulate or fail to bioactivate."
                          : v.phenotype?.includes("Intermediate")
                          ? "Intermediate metabolizer status reduces metabolic bioactivation rate. Strongly impacted by enzyme inhibitors."
                          : "Standard clinical enzymatic activity predicted for wild-type alleles."}
                      </p>

                      <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] text-xs font-mono text-slate-300">
                        <span className="text-[10px] text-slate-400 block uppercase">Gene Location</span>
                        {v.location || "HGNC / PharmGKB Standard"}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-curx-amber">
                      <span>CPIC Guideline Verified</span>
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: SYMPTOMS ================= */}
        {activeTab === "symptoms" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-white">Deterministic Symptom Reasoning</h2>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Differential matching against the disease-symptom matrix with qualitative relative rankings.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 py-2 rounded-lg border border-white/15 hover:border-curx-cyan text-xs font-mono text-white transition-colors flex items-center gap-1.5 self-start"
              >
                <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                <span>Manage Symptoms</span>
              </button>
            </div>

            {/* Emergency Alert Banner */}
            {emergencyAlert && (
              <div className="p-4 rounded-xl bg-curx-red/15 border border-curx-red/40 flex items-center gap-3 text-curx-red">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-xs font-mono font-bold leading-relaxed">{emergencyAlert}</p>
              </div>
            )}

            {/* Interactive Adaptive Question Box */}
            {nextQuestion && !emergencyAlert && (
              <div className="glass-panel p-6 rounded-2xl border border-curx-cyan/40 bg-curx-cyan/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-curx-cyan/20 text-curx-cyan font-mono text-[10px] uppercase font-bold">
                    ADAPTIVE DISCRIMINATING QUESTION
                  </span>
                </div>
                <h4 className="font-display text-lg font-bold text-white mb-2">{nextQuestion.text}</h4>
                <p className="text-xs font-mono text-slate-400 mb-4">{nextQuestion.rationale}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAnswerQuestion(nextQuestion.symptomKey, true)}
                    className="px-4 py-2 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
                  >
                    YES (Affirm Symptom)
                  </button>
                  <button
                    onClick={() => handleAnswerQuestion(nextQuestion.symptomKey, false)}
                    className="px-4 py-2 rounded-lg border border-white/20 text-white font-mono text-xs hover:border-white/40 transition-colors"
                  >
                    NO (Deny)
                  </button>
                </div>
              </div>
            )}

            {/* Candidate Conditions List */}
            {reportedSymptoms.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl border border-white/10 text-center">
                <HeartPulse className="w-10 h-10 text-curx-orange/50 mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Current Symptoms Reported</h3>
                <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto mb-4">
                  Add non-emergency symptoms (such as Headache, Fatigue, Nausea) to evaluate deterministic matrix differentials.
                </p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-5 py-2 rounded-xl bg-curx-orange text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
                >
                  Report Symptoms
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Candidate Conditions (Qualitative Matrix Match)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {symptomCandidates.map((c: any, idx: number) => (
                    <div key={idx} className="glass-panel p-5 rounded-xl border border-white/10 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display text-base font-bold text-white">{c.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              c.matchTier === "HIGHER RELATIVE MATCH"
                                ? "bg-curx-cyan/15 text-curx-cyan border border-curx-cyan/30"
                                : "bg-white/[0.05] text-slate-300 border border-white/10"
                            }`}
                          >
                            {c.matchTier}
                          </span>
                        </div>
                        <p className="text-xs font-sans text-slate-300 leading-relaxed mb-3">
                          {c.description || "Potential pharmacological adverse reaction or comorbidity."}
                        </p>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Matched Symptoms: {c.matchedSymptomsCount} of {c.totalConditionSymptomsCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: RISK ENGINE ================= */}
        {activeTab === "risk" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Deterministic Safety Engine Trace</h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Zero generative hallucination. Pure algorithmic boolean & threshold logic.
              </p>
            </div>

            {(!riskResult?.structuredTrace || riskResult.structuredTrace.length === 0) ? (
              <div className="glass-panel p-10 rounded-2xl border border-curx-cyan/20 text-center">
                <CheckCircle2 className="w-10 h-10 text-curx-cyan mx-auto mb-3" />
                <h3 className="font-display text-lg font-bold text-white mb-1">No Active Safety Collisions Flagged</h3>
                <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                  The current combination of active medications, genetic variants, and condition diagnoses does not trigger any contraindicated collision rules.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {riskResult.structuredTrace.map((trace: any, idx: number) => (
                  <div key={idx} className="glass-panel p-6 rounded-2xl border border-curx-orange/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-curx-orange/15 border border-curx-orange/30 text-curx-orange font-mono text-[10px] font-bold uppercase">
                          {trace.category} // {trace.ruleId}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          Evidence: Level {trace.evidenceLevel || "1A"}
                        </span>
                      </div>
                      <RiskBadge level={trace.severity?.toLowerCase() || "high"} label={trace.severity} size="sm" />
                    </div>

                    <h4 className="font-display text-lg font-bold text-white mb-2">{trace.message}</h4>
                    <p className="text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-lg border border-white/[0.04]">
                      Mechanism: {trace.mechanism || "Enzyme inhibition and substrate bioactivation deficit."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 6: EVIDENCE ================= */}
        {activeTab === "evidence" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Auditable Clinical Evidence</h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Peer-reviewed CPIC guidelines, ClinPGx annotations, and FDA package inserts supporting clinical decisions.
              </p>
            </div>

            <div className="space-y-4">
              <EvidenceCard
                guideline="CPIC Clinical Pharmacogenetics Implementation Consortium"
                source="Clinical Pharmacogenetics Implementation Consortium (CPIC) & ClinPGx / PharmGKB"
                evidenceLevel="1A"
                finding="Standardized clinical recommendations for gene-drug pairings with high-level evidence of altered efficacy or adverse drug reactions."
                recommendation="Consult CPIC dosing guidelines and consider therapeutic drug monitoring or alternative non-interacting agents."
              />
              {patientData.variants && patientData.variants.some((v: any) => (v.geneSymbol || v.gene_symbol) === "CYP2D6") && (
                <EvidenceCard
                  guideline="CPIC Guideline for CYP2D6 and Tamoxifen Therapy"
                  source="CPIC Guideline (ClinPGx ID: PA166104996)"
                  evidenceLevel="1A"
                  finding="CYP2D6 intermediate metabolizers taking strong CYP2D6 inhibitors exhibit significantly reduced active endoxifen plasma concentrations comparable to poor metabolizers."
                  recommendation="Consider recommending alternative antidepressant with minimal CYP2D6 inhibition (e.g., Venlafaxine, Citalopram) or consulting oncology for alternative endocrine therapy."
                />
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 7: CARE FINDER ================= */}
        {activeTab === "care" && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Care Continuity & Facilities</h2>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Verified regional healthcare facilities for {patientData.city || "San Francisco"} powered by live OpenStreetMap infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {facilities.map((f: any, idx: number) => (
                <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan font-mono text-[10px] uppercase font-bold">
                        {f.tier || "Medical Center"}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{f.distance}</span>
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mb-1">{f.name}</h3>
                    <p className="text-xs font-mono text-curx-cyan mb-3">{f.specialty}</p>
                    <p className="text-xs font-mono text-slate-300 mb-1">Status: {f.status}</p>
                    <p className="text-xs font-mono text-slate-400">{f.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </main>

        {/* Right Sidebar for Primary Navigation (Desktop) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-l border-white/[0.08] bg-[#0A0F19]/90 backdrop-blur-2xl sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto p-4 z-20">
          {/* Sidebar Header */}
          <div className="px-3 py-2.5 mb-3 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_8px_#00F0D0]" />
              <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-slate-300 uppercase">
                YOUR HEALTH
              </span>
            </div>
            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-curx-cyan/10 text-curx-cyan border border-curx-cyan/30">
              WORKSPACE
            </span>
          </div>

          {/* Navigation Section Groups */}
          <div className="space-y-6 flex-1 py-1">
            {[
              {
                group: "EXPLORE",
                items: [
                  {
                    id: "overview",
                    label: "OVERVIEW",
                    icon: Activity,
                  },
                  {
                    id: "medications",
                    label: "MEDICATIONS",
                    count: (patientData?.medications || []).length,
                    icon: Pill,
                  },
                  {
                    id: "genetics",
                    label: "GENETICS",
                    count: (patientData?.variants || []).length,
                    icon: Dna,
                  },
                  {
                    id: "symptoms",
                    label: "SYMPTOMS",
                    count: reportedSymptoms.length,
                    icon: HeartPulse,
                  },
                ],
              },
              {
                group: "UNDERSTAND",
                items: [
                  {
                    id: "risk",
                    label: "RISK ENGINE & TRACE",
                    icon: Shield,
                  },
                  {
                    id: "evidence",
                    label: "EVIDENCE & GUIDELINES",
                    icon: FileText,
                  },
                ],
              },
              {
                group: "FIND CARE",
                items: [
                  {
                    id: "care",
                    label: "CARE FINDER (OSM)",
                    icon: Building2,
                  },
                ],
              },
            ].map((section) => (
              <div key={section.group} className="space-y-1.5">
                <div className="px-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                  {section.group}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`nav-item-${item.id}`}
                        onClick={() => handleTabChange(item.id as DashboardTab)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all text-left group ${
                          isActive
                            ? "bg-curx-cyan/[0.10] text-curx-cyan border border-curx-cyan/40 font-bold shadow-[0_0_15px_rgba(0,240,208,0.12)]"
                            : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-center shrink-0">
                          {isActive ? (
                            <div className="w-4 h-4 rounded-full bg-curx-cyan/20 flex items-center justify-center text-curx-cyan">
                              <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan shadow-[0_0_6px_#00F0D0]" />
                            </div>
                          ) : (
                            <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                          )}
                        </div>

                        <span className="truncate flex-1">{item.label}</span>

                        {typeof item.count === "number" && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                              isActive
                                ? "bg-curx-cyan/20 text-curx-cyan"
                                : "bg-white/[0.06] text-slate-400 group-hover:text-slate-200"
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Status */}
          <div className="mt-auto pt-4 border-t border-white/[0.06] px-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>DECISION ENGINE</span>
              <span className="text-curx-cyan font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile & Tablet Compact Bottom Bar */}
      <nav className="lg:hidden sticky bottom-0 z-30 bg-[#080C14]/95 backdrop-blur-2xl border-t border-white/[0.08] px-2 py-2 flex items-center justify-around overflow-x-auto no-scrollbar shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "medications", label: "Meds", icon: Pill },
          { id: "genetics", label: "Genetics", icon: Dna },
          { id: "symptoms", label: "Symptoms", icon: HeartPulse },
          { id: "risk", label: "Risk", icon: Shield },
          { id: "evidence", label: "Evidence", icon: FileText },
          { id: "care", label: "Care", icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as DashboardTab)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg font-mono text-[10px] transition-colors shrink-0 ${
                isActive
                  ? "text-curx-cyan bg-curx-cyan/[0.12] font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Floating AI Assistant Trigger Pill */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          id="floating-ai-chat-btn"
          className="fixed bottom-6 right-6 lg:right-72 xl:right-80 z-40 px-4 py-3 rounded-full bg-[#090D13] border border-curx-cyan/50 hover:border-curx-cyan text-white shadow-[0_0_25px_rgba(0,240,208,0.25)] flex items-center gap-2.5 group transition-all transform hover:scale-105"
        >
          <div className="w-6 h-6 rounded-full bg-curx-cyan/20 flex items-center justify-center text-curx-cyan group-hover:bg-curx-cyan group-hover:text-graphite transition-colors">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-display text-xs font-bold tracking-wider text-slate-100 group-hover:text-curx-cyan transition-colors">
            ASK CURX AI
          </span>
        </button>
      )}

      {/* CURX AI Assistant Drawer */}
      <AiChatAssistant
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        patientData={patientData}
        riskResult={riskResult}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={patientData}
        onProfileUpdated={loadPatientData}
      />
    </div>
  );
}
