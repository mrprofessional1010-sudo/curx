"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Pill,
  Dna,
  HeartPulse,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Shield,
  Loader2,
  MapPin,
  FileCheck,
} from "lucide-react";

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface SelectedMedication {
  id: string;
  name: string;
  activeIngredient?: string;
  dosage: string;
  frequency: string;
}

interface SelectedVariant {
  geneId: string;
  geneSymbol: string;
  geneName?: string;
  variantId?: string;
  diplotype: string;
  phenotype: string;
}

interface SelectedCondition {
  id: string;
  name: string;
  description?: string;
}

interface SelectedSymptom {
  id: string;
  name: string;
  weight?: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Step 1: Personal Profile ---
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">(42);
  const [gender, setGender] = useState("Male");
  const [city, setCity] = useState("Boston");

  // --- Step 2: Medications ---
  const [medSearchQuery, setMedSearchQuery] = useState("");
  const [medSearchResults, setMedSearchResults] = useState<any[]>([]);
  const [medSearching, setMedSearching] = useState(false);
  const [selectedMeds, setSelectedMeds] = useState<SelectedMedication[]>([]);

  // --- Step 3: Genetic Variants ---
  const [geneSearchQuery, setGeneSearchQuery] = useState("");
  const [geneSearchResults, setGeneSearchResults] = useState<any[]>([]);
  const [geneSearching, setGeneSearching] = useState(false);
  const [selectedGeneForVariant, setSelectedGeneForVariant] = useState<any | null>(null);
  const [geneVariantsList, setGeneVariantsList] = useState<any[]>([]);
  const [customDiplotype, setCustomDiplotype] = useState("*2/*2");
  const [customPhenotype, setCustomPhenotype] = useState("Poor Metabolizer");
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);

  // --- Step 4: Conditions ---
  const [condSearchQuery, setCondSearchQuery] = useState("");
  const [condSearchResults, setCondSearchResults] = useState<any[]>([]);
  const [condSearching, setCondSearching] = useState(false);
  const [selectedConditions, setSelectedConditions] = useState<SelectedCondition[]>([]);

  // --- Step 5: Symptoms ---
  const [symSearchQuery, setSymSearchQuery] = useState("");
  const [symSearchResults, setSymSearchResults] = useState<any[]>([]);
  const [symSearching, setSymSearching] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SelectedSymptom[]>([]);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/onboarding");
    } else if (user) {
      if (profile?.full_name && !fullName) {
        setFullName(profile.full_name);
      }
    }
  }, [user, authLoading, profile, router, fullName]);

  // Catalog Searches
  useEffect(() => {
    if (step === 2 && medSearchQuery.length >= 2) {
      const delay = setTimeout(async () => {
        setMedSearching(true);
        try {
          const res = await fetch(`/api/catalog/search?type=medications&q=${encodeURIComponent(medSearchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setMedSearchResults(data.results || []);
          }
        } catch (e) {
          console.warn("Med search error:", e);
        } finally {
          setMedSearching(false);
        }
      }, 250);
      return () => clearTimeout(delay);
    } else {
      setMedSearchResults([]);
    }
  }, [medSearchQuery, step]);

  useEffect(() => {
    if (step === 3 && geneSearchQuery.length >= 2) {
      const delay = setTimeout(async () => {
        setGeneSearching(true);
        try {
          const res = await fetch(`/api/catalog/search?type=genes&q=${encodeURIComponent(geneSearchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setGeneSearchResults(data.results || []);
          }
        } catch (e) {
          console.warn("Gene search error:", e);
        } finally {
          setGeneSearching(false);
        }
      }, 250);
      return () => clearTimeout(delay);
    } else {
      setGeneSearchResults([]);
    }
  }, [geneSearchQuery, step]);

  useEffect(() => {
    if (step === 4 && condSearchQuery.length >= 2) {
      const delay = setTimeout(async () => {
        setCondSearching(true);
        try {
          const res = await fetch(`/api/catalog/search?type=conditions&q=${encodeURIComponent(condSearchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setCondSearchResults(data.results || []);
          }
        } catch (e) {
          console.warn("Cond search error:", e);
        } finally {
          setCondSearching(false);
        }
      }, 250);
      return () => clearTimeout(delay);
    } else {
      setCondSearchResults([]);
    }
  }, [condSearchQuery, step]);

  useEffect(() => {
    if (step === 5 && symSearchQuery.length >= 2) {
      const delay = setTimeout(async () => {
        setSymSearching(true);
        try {
          const res = await fetch(`/api/catalog/search?type=symptoms&q=${encodeURIComponent(symSearchQuery)}`);
          if (res.ok) {
            const data = await res.json();
            setSymSearchResults(data.results || []);
          }
        } catch (e) {
          console.warn("Sym search error:", e);
        } finally {
          setSymSearching(false);
        }
      }, 250);
      return () => clearTimeout(delay);
    } else {
      setSymSearchResults([]);
    }
  }, [symSearchQuery, step]);

  // Load Variants for selected Gene
  const handleSelectGene = async (gene: any) => {
    setSelectedGeneForVariant(gene);
    setGeneSearchQuery(gene.symbol);
    setGeneSearchResults([]);
    try {
      const res = await fetch(`/api/catalog/search?type=variants&geneId=${gene.id}`);
      if (res.ok) {
        const data = await res.json();
        setGeneVariantsList(data.results || []);
      }
    } catch (e) {
      console.warn("Error fetching variants for gene:", e);
    }
  };

  const handleAddVariant = () => {
    if (!selectedGeneForVariant) return;
    const exists = selectedVariants.some((v) => v.geneId === selectedGeneForVariant.id);
    if (exists) return;

    setSelectedVariants([
      ...selectedVariants,
      {
        geneId: selectedGeneForVariant.id,
        geneSymbol: selectedGeneForVariant.symbol,
        geneName: selectedGeneForVariant.name,
        diplotype: customDiplotype.trim() || "*1/*1",
        phenotype: customPhenotype.trim() || "Normal Metabolizer",
      },
    ]);
    setSelectedGeneForVariant(null);
    setGeneSearchQuery("");
  };

  // Submit Profile
  const handleSubmitProfile = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        fullName: fullName.trim() || "Clinical User",
        age: typeof age === "number" ? age : 40,
        gender,
        city: city.trim() || "San Francisco",
        medications: selectedMeds.map((m) => ({
          medicationId: m.id,
          dosage: m.dosage,
          frequency: m.frequency,
        })),
        variants: selectedVariants.map((v) => ({
          geneId: v.geneId,
          variantId: v.variantId,
          diplotype: v.diplotype,
          phenotype: v.phenotype,
        })),
        conditions: selectedConditions.map((c) => ({
          conditionId: c.id,
        })),
        symptoms: selectedSymptoms.map((s) => ({
          symptomId: s.id,
        })),
      };

      const res = await fetch("/api/patient/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to persist clinical profile.");
      }

      // Success -> Redirect to Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Profile creation error:", err);
      setErrorMessage(err.message || "An error occurred while saving your clinical profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06080B] text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-curx-cyan animate-spin mb-4" />
        <p className="font-mono text-xs text-curx-cyan tracking-widest uppercase">INITIALIZING CURX WORKSPACE...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080B] text-[#EDF2F7] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#06080B]/90 backdrop-blur-xl px-6 lg:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#0C1219] border border-curx-cyan/40">
            <span className="w-2 h-2 rounded-full bg-curx-cyan shadow-[0_0_8px_#00F0D0]" />
          </div>
          <span className="font-display tracking-[0.25em] text-lg font-bold text-white">CURX</span>
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-wider text-curx-cyan font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-curx-cyan animate-pulse" />
          CLINICAL ONBOARDING
        </span>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 lg:p-10 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Header Title & Description */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-widest text-curx-cyan uppercase font-bold">
                STEP {step} OF 6
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">BUILD YOUR CURX PROFILE</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">
              Add the health information you want CURX to use for personalized medication and symptom intelligence.
            </p>
          </div>

          {/* Step Navigation Progress Pills */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { idx: 1, label: "Profile" },
              { idx: 2, label: "Medications" },
              { idx: 3, label: "Genetics" },
              { idx: 4, label: "Conditions" },
              { idx: 5, label: "Symptoms" },
              { idx: 6, label: "Review" },
            ].map((s) => (
              <div
                key={s.idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= s.idx ? "bg-curx-cyan shadow-[0_0_8px_rgba(0,240,208,0.5)]" : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {errorMessage && (
            <div className="p-4 rounded-xl bg-curx-red/15 border border-curx-red/40 flex items-center gap-3 text-curx-red text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: PERSONAL PROFILE ================= */}
          {step === 1 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Personal Profile</h3>
                  <p className="text-xs font-mono text-slate-400">User-provided baseline clinical identifiers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Preferred Full Name *
                  </label>
                  <input
                    id="input-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Jordan Hayes"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#090D13] border border-white/15 focus:border-curx-cyan outline-none text-white text-sm font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">Age</label>
                  <input
                    id="input-age"
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : "")}
                    placeholder="e.g. 42"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#090D13] border border-white/15 focus:border-curx-cyan outline-none text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                    Biological Sex
                  </label>
                  <select
                    id="input-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg bg-[#090D13] border border-white/15 focus:border-curx-cyan outline-none text-white text-sm font-sans"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Non-Binary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-curx-cyan" />
                    <span>Location / City (Care Finder)</span>
                  </label>
                  <input
                    id="input-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Boston or San Francisco"
                    className="w-full h-11 px-3.5 rounded-lg bg-[#090D13] border border-white/15 focus:border-curx-cyan outline-none text-white text-sm font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CURRENT MEDICATIONS ================= */}
          {step === 2 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Current Medications</h3>
                  <p className="text-xs font-mono text-slate-400">Search and record therapies you currently take</p>
                </div>
              </div>

              {/* Medication Search Input */}
              <div className="relative">
                <div className="relative flex items-center rounded-lg border border-white/15 bg-[#090D13] focus-within:border-curx-cyan">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="input-med-search"
                    type="text"
                    value={medSearchQuery}
                    onChange={(e) => setMedSearchQuery(e.target.value)}
                    placeholder="Type medication name (e.g. Clopidogrel, Warfarin, Omeprazole)..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-transparent text-white text-sm font-sans placeholder:text-slate-500 outline-none"
                  />
                  {medSearching && <Loader2 className="absolute right-3.5 w-4 h-4 text-curx-cyan animate-spin" />}
                </div>

                {/* Autocomplete Dropdown */}
                {medSearchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 z-30 bg-[#0C1219] border border-white/15 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
                    {medSearchResults.map((med) => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => {
                          if (!selectedMeds.some((m) => m.id === med.id)) {
                            setSelectedMeds([
                              ...selectedMeds,
                              {
                                id: med.id,
                                name: med.canonical_name,
                                activeIngredient: med.active_ingredient,
                                dosage: "Standard dose",
                                frequency: "Once daily",
                              },
                            ]);
                          }
                          setMedSearchQuery("");
                          setMedSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-curx-cyan/[0.08] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-white">{med.canonical_name}</div>
                          {med.active_ingredient && (
                            <div className="text-[10px] font-mono text-slate-400">Active: {med.active_ingredient}</div>
                          )}
                        </div>
                        <Plus className="w-4 h-4 text-curx-cyan" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Medications List */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  SELECTED REGIMEN ({selectedMeds.length})
                </span>
                {selectedMeds.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic p-4 rounded-xl bg-black/20 border border-white/[0.04]">
                    No medications added yet. Search above to add active therapies.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMeds.map((m) => (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-xl bg-[#090D13] border border-white/10 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-white">{m.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {m.dosage} • {m.frequency}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedMeds(selectedMeds.filter((x) => x.id !== m.id))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-curx-red hover:bg-curx-red/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: KNOWN GENETIC VARIANTS ================= */}
          {step === 3 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-amber/10 border border-curx-amber/30 text-curx-amber">
                  <Dna className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Add a Known Genetic Result</h3>
                  <p className="text-xs font-mono text-slate-400">
                    Record lab-verified pharmacogenomic alleles (e.g. CYP2C19, CYP2C9, VKORC1)
                  </p>
                </div>
              </div>

              {/* Gene Search */}
              <div className="space-y-4">
                <div className="relative flex items-center rounded-lg border border-white/15 bg-[#090D13] focus-within:border-curx-amber">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="input-gene-search"
                    type="text"
                    value={geneSearchQuery}
                    onChange={(e) => setGeneSearchQuery(e.target.value)}
                    placeholder="Search gene symbol (e.g. CYP2C19, CYP2C9, CYP2D6, VKORC1)..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-transparent text-white text-sm font-sans placeholder:text-slate-500 outline-none"
                  />
                  {geneSearching && <Loader2 className="absolute right-3.5 w-4 h-4 text-curx-amber animate-spin" />}
                </div>

                {geneSearchResults.length > 0 && (
                  <div className="bg-[#0C1219] border border-white/15 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y divide-white/[0.06]">
                    {geneSearchResults.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handleSelectGene(g)}
                        className="w-full p-3 text-left hover:bg-curx-amber/[0.08] transition-colors flex items-center justify-between font-mono text-xs"
                      >
                        <div>
                          <span className="font-bold text-curx-amber">{g.symbol}</span>
                          <span className="text-slate-400 ml-2 text-[11px]">{g.name}</span>
                        </div>
                        <Plus className="w-4 h-4 text-curx-amber" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Form to specify Diplotype / Phenotype for chosen Gene */}
                {selectedGeneForVariant && (
                  <div className="p-4 rounded-xl bg-curx-amber/[0.04] border border-curx-amber/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-curx-amber">
                        Configuring: {selectedGeneForVariant.symbol}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedGeneForVariant(null)}
                        className="text-[10px] font-mono text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Diplotype / Star Allele
                        </label>
                        <input
                          id="input-diplotype"
                          type="text"
                          value={customDiplotype}
                          onChange={(e) => setCustomDiplotype(e.target.value)}
                          placeholder="e.g. *2/*2, *1/*3, G/A"
                          className="w-full h-9 px-3 rounded-lg bg-[#090D13] border border-white/15 text-white font-mono text-xs outline-none focus:border-curx-amber"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                          Predicted Phenotype
                        </label>
                        <input
                          id="input-phenotype"
                          type="text"
                          value={customPhenotype}
                          onChange={(e) => setCustomPhenotype(e.target.value)}
                          placeholder="e.g. Poor Metabolizer, Intermediate Metabolizer"
                          className="w-full h-9 px-3 rounded-lg bg-[#090D13] border border-white/15 text-white font-mono text-xs outline-none focus:border-curx-amber"
                        />
                      </div>
                    </div>

                    <button
                      id="btn-add-variant"
                      type="button"
                      onClick={handleAddVariant}
                      className="px-4 py-2 rounded-lg bg-curx-amber text-graphite font-mono text-xs font-bold hover:bg-white transition-colors"
                    >
                      Add Genetic Result
                    </button>
                  </div>
                )}
              </div>

              {/* Selected Variants List */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  KNOWN GENETIC RESULTS ({selectedVariants.length})
                </span>
                {selectedVariants.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic p-4 rounded-xl bg-black/20 border border-white/[0.04]">
                    No known genetic results added. (Optional if no lab testing has been performed).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedVariants.map((v) => (
                      <div
                        key={v.geneId}
                        className="p-3.5 rounded-xl bg-[#090D13] border border-curx-amber/20 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-curx-amber">
                            {v.geneSymbol} {v.diplotype}
                          </div>
                          <div className="text-[10px] font-mono text-slate-300">{v.phenotype}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedVariants(selectedVariants.filter((x) => x.geneId !== v.geneId))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-curx-red hover:bg-curx-red/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: KNOWN CONDITIONS ================= */}
          {step === 4 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-orange/10 border border-curx-orange/30 text-curx-orange">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Known Conditions</h3>
                  <p className="text-xs font-mono text-slate-400">
                    Select existing diagnosed conditions to identify contraindications
                  </p>
                </div>
              </div>

              {/* Condition Search */}
              <div className="relative">
                <div className="relative flex items-center rounded-lg border border-white/15 bg-[#090D13] focus-within:border-curx-orange">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="input-condition-search"
                    type="text"
                    value={condSearchQuery}
                    onChange={(e) => setCondSearchQuery(e.target.value)}
                    placeholder="Search condition (e.g. Hypertension, Peptic ulcer diseae, GERD, Asthma)..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-transparent text-white text-sm font-sans placeholder:text-slate-500 outline-none"
                  />
                  {condSearching && <Loader2 className="absolute right-3.5 w-4 h-4 text-curx-orange animate-spin" />}
                </div>

                {condSearchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 z-30 bg-[#0C1219] border border-white/15 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
                    {condSearchResults.map((cond) => (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => {
                          if (!selectedConditions.some((c) => c.id === cond.id)) {
                            setSelectedConditions([
                              ...selectedConditions,
                              {
                                id: cond.id,
                                name: cond.canonical_name,
                                description: cond.description,
                              },
                            ]);
                          }
                          setCondSearchQuery("");
                          setCondSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-curx-orange/[0.08] transition-colors flex items-center justify-between"
                      >
                        <span className="font-mono text-xs text-white">{cond.canonical_name}</span>
                        <Plus className="w-4 h-4 text-curx-orange" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Conditions List */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  SELECTED CONDITIONS ({selectedConditions.length})
                </span>
                {selectedConditions.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic p-4 rounded-xl bg-black/20 border border-white/[0.04]">
                    No known conditions added yet. Search above to add active diagnoses.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedConditions.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-[#090D13] border border-white/10 flex items-center justify-between"
                      >
                        <div className="font-mono font-bold text-xs text-white">{c.name}</div>
                        <button
                          type="button"
                          onClick={() => setSelectedConditions(selectedConditions.filter((x) => x.id !== c.id))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-curx-red hover:bg-curx-red/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 5: OPTIONAL CURRENT SYMPTOMS ================= */}
          {step === 5 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-cyan/10 border border-curx-cyan/30 text-curx-cyan">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">Current Symptoms (Optional)</h3>
                  <p className="text-xs font-mono text-slate-400">
                    Report any active complaints to feed the deterministic symptom engine
                  </p>
                </div>
              </div>

              {/* Quick Picks for Common Non-Emergency Symptoms */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  COMMON SYMPTOMS
                </span>
                <div className="flex flex-wrap gap-2">
                  {["Headache", "Nausea", "Fatigue", "Itching", "Dizziness"].map((sName) => (
                    <button
                      key={sName}
                      type="button"
                      onClick={() => {
                        const exists = selectedSymptoms.some((s) => s.name.toLowerCase() === sName.toLowerCase());
                        if (!exists) {
                          setSelectedSymptoms([
                            ...selectedSymptoms,
                            { id: `sym_${sName.toLowerCase()}`, name: sName },
                          ]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-curx-cyan text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3 text-curx-cyan" />
                      <span>{sName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Symptom Search */}
              <div className="relative">
                <div className="relative flex items-center rounded-lg border border-white/15 bg-[#090D13] focus-within:border-curx-cyan">
                  <Search className="absolute left-3.5 w-4 h-4 text-slate-400" />
                  <input
                    id="input-symptom-search"
                    type="text"
                    value={symSearchQuery}
                    onChange={(e) => setSymSearchQuery(e.target.value)}
                    placeholder="Search catalog symptoms..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg bg-transparent text-white text-sm font-sans placeholder:text-slate-500 outline-none"
                  />
                  {symSearching && <Loader2 className="absolute right-3.5 w-4 h-4 text-curx-cyan animate-spin" />}
                </div>

                {symSearchResults.length > 0 && (
                  <div className="absolute top-12 left-0 right-0 z-30 bg-[#0C1219] border border-white/15 rounded-xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-white/[0.06]">
                    {symSearchResults.map((sym) => (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => {
                          if (!selectedSymptoms.some((s) => s.id === sym.id)) {
                            setSelectedSymptoms([
                              ...selectedSymptoms,
                              { id: sym.id, name: sym.canonical_name, weight: sym.clinical_weight },
                            ]);
                          }
                          setSymSearchQuery("");
                          setSymSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-curx-cyan/[0.08] transition-colors flex items-center justify-between font-mono text-xs"
                      >
                        <span className="text-white">{sym.canonical_name}</span>
                        <Plus className="w-4 h-4 text-curx-cyan" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Symptoms List */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                  REPORTED SYMPTOMS ({selectedSymptoms.length})
                </span>
                {selectedSymptoms.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic p-4 rounded-xl bg-black/20 border border-white/[0.04]">
                    No symptoms added yet. (Optional).
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedSymptoms.map((s) => (
                      <div
                        key={s.id}
                        className="px-3 py-1.5 rounded-lg bg-[#090D13] border border-curx-cyan/30 text-xs font-mono text-curx-cyan flex items-center gap-2"
                      >
                        <span>{s.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSymptoms(selectedSymptoms.filter((x) => x.id !== s.id))}
                          className="hover:text-curx-red transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 6: PROFILE SUMMARY & CONFIRMATION ================= */}
          {step === 6 && (
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-curx-cyan/40 bg-curx-cyan/[0.02] space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.08]">
                <div className="p-2.5 rounded-xl bg-curx-cyan/15 border border-curx-cyan/30 text-curx-cyan">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">PROFILE READY</h3>
                  <p className="text-xs font-mono text-slate-400">
                    Review your clinical profile details before launching the workspace
                  </p>
                </div>
              </div>

              {/* Profile Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">PATIENT IDENTITY</span>
                  <div className="font-display font-bold text-white text-base">{fullName || "Clinical User"}</div>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    Age: {age} • {gender} • {city}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">MEDICATIONS</span>
                  <div className="font-mono font-bold text-curx-cyan text-lg">{selectedMeds.length} Active</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {selectedMeds.map((m) => m.name).join(", ") || "None"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">KNOWN GENETICS</span>
                  <div className="font-mono font-bold text-curx-amber text-lg">{selectedVariants.length} Results</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {selectedVariants.map((v) => `${v.geneSymbol} ${v.diplotype}`).join(", ") || "None"}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">CONDITIONS</span>
                  <div className="font-mono font-bold text-curx-orange text-lg">{selectedConditions.length} Diagnoses</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {selectedConditions.map((c) => c.name).join(", ") || "None"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-slate-300">
                <span className="text-curx-cyan font-bold block mb-1">DETERMINISTIC CLINICAL INTELLIGENCE</span>
                Upon confirmation, CURX will evaluate multi-axis pharmacogenomic collisions, contraindications, and
                symptom differentials in real-time.
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 border-t border-white/[0.08] mt-8">
          {step > 1 ? (
            <button
              id="btn-onboarding-back"
              type="button"
              onClick={() => setStep((step - 1) as OnboardingStep)}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg border border-white/15 text-slate-300 font-mono text-xs hover:border-white/40 hover:text-white transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              id="btn-onboarding-next"
              type="button"
              onClick={() => setStep((step + 1) as OnboardingStep)}
              className="px-6 py-2.5 rounded-lg bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,208,0.25)] cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="btn-onboarding-submit"
              type="button"
              onClick={handleSubmitProfile}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-lg bg-curx-cyan text-graphite font-display text-sm font-bold hover:bg-white transition-all shadow-[0_0_30px_rgba(0,240,208,0.35)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>INITIALIZING WORKSPACE...</span>
                </>
              ) : (
                <>
                  <span>CONTINUE TO CURX</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
