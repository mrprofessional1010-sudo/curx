"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  MapPin,
  Pill,
  Dna,
  HeartPulse,
  Activity,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onProfileUpdated: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  patient,
  onProfileUpdated,
}: EditProfileModalProps) {
  const [preferredName, setPreferredName] = useState(patient?.fullName || "");
  const [age, setAge] = useState(patient?.age ? String(patient.age) : "45");
  const [sex, setSex] = useState(patient?.gender || "Female");
  const [city, setCity] = useState(patient?.city || "San Francisco");

  const [medications, setMedications] = useState<any[]>(patient?.medications || []);
  const [variants, setVariants] = useState<any[]>(patient?.variants || []);
  const [conditions, setConditions] = useState<any[]>(patient?.conditions || []);
  const [symptoms, setSymptoms] = useState<any[]>(patient?.symptoms || []);

  const [activeTab, setActiveTab] = useState<"personal" | "medications" | "genetics" | "conditions" | "symptoms">("personal");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (patient) {
      setPreferredName(patient.fullName || "");
      setAge(patient.age ? String(patient.age) : "45");
      setSex(patient.gender || "Female");
      setCity(patient.city || "San Francisco");
      setMedications(patient.medications || []);
      setVariants(patient.variants || []);
      setConditions(patient.conditions || []);
      setSymptoms(patient.symptoms || []);
    }
  }, [patient]);

  if (!isOpen) return null;

  // Search Catalog handler
  const handleSearch = async (type: string, query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/catalog/search?type=${type}&q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddMedication = (med: any) => {
    if (medications.some((m) => m.name.toLowerCase() === med.name.toLowerCase())) return;
    setMedications([...medications, { name: med.name, dosage: "Standard therapeutic dose" }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddVariant = (v: any) => {
    const geneSymbol = v.gene_symbol || v.name || "CYP2D6";
    const diplotype = v.diplotype || "*1/*4";
    const phenotype = v.phenotype || "Intermediate Metabolizer";
    if (variants.some((item) => item.geneSymbol === geneSymbol && item.diplotype === diplotype)) return;
    setVariants([...variants, { geneSymbol, diplotype, phenotype }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddCondition = (cond: any) => {
    if (conditions.some((c) => c.name.toLowerCase() === cond.name.toLowerCase())) return;
    setConditions([...conditions, { name: cond.name, icd10: cond.icd10 }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddSymptom = (sym: any) => {
    if (symptoms.some((s) => s.name.toLowerCase() === sym.name.toLowerCase())) return;
    setSymptoms([...symptoms, { name: sym.name }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        fullName: preferredName.trim() || "Authenticated User",
        age: parseInt(age, 10) || 45,
        gender: sex,
        city: city.trim() || "San Francisco",
        medications: medications.map((m) => ({ name: m.name, dosage: m.dosage || "Standard dose" })),
        variants: variants.map((v) => ({
          geneSymbol: v.geneSymbol || v.gene_symbol,
          diplotype: v.diplotype,
          phenotype: v.phenotype,
        })),
        conditions: conditions.map((c) => ({ name: c.name })),
        symptoms: symptoms.map((s) => ({ name: s.name })),
      };

      const res = await fetch("/api/patient/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update profile.");
      }

      setSuccess(true);
      setTimeout(() => {
        onProfileUpdated();
        onClose();
      }, 600);
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0A0E14] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-curx-cyan shadow-[0_0_8px_#00F0D0]" />
            <h3 className="font-display text-lg font-bold text-white tracking-wide">
              EDIT CLINICAL PROFILE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/30 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] bg-[#06090E] px-4 overflow-x-auto no-scrollbar">
          {[
            { id: "personal", label: "PERSONAL", icon: <User className="w-3.5 h-3.5" /> },
            { id: "medications", label: `MEDS (${medications.length})`, icon: <Pill className="w-3.5 h-3.5" /> },
            { id: "genetics", label: `GENETICS (${variants.length})`, icon: <Dna className="w-3.5 h-3.5" /> },
            { id: "conditions", label: `CONDITIONS (${conditions.length})`, icon: <HeartPulse className="w-3.5 h-3.5" /> },
            { id: "symptoms", label: `SYMPTOMS (${symptoms.length})`, icon: <Activity className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className={`py-3 px-3.5 font-mono text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-curx-cyan text-curx-cyan bg-curx-cyan/[0.04]"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-curx-red/10 border border-curx-red/30 flex items-center gap-2 text-curx-red text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Personal */}
          {activeTab === "personal" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                  Preferred / Display Name
                </label>
                <input
                  type="text"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-curx-cyan outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-curx-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                    Sex (Clinically Relevant)
                  </label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-curx-cyan outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other / Intersex</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase">
                  City / Location (for Care Finder)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:border-curx-cyan outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Medications */}
          {activeTab === "medications" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search canonical medications (e.g. Tamoxifen, Fluoxetine)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch("medications", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-curx-cyan outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-white/15 rounded-xl bg-[#090D13] p-1.5 space-y-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddMedication(item)}
                      className="p-2 rounded-lg hover:bg-white/[0.06] cursor-pointer flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-white">{item.name}</span>
                      <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Active Medications:</span>
                {medications.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic">No medications added yet.</p>
                ) : (
                  medications.map((m, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-bold">{m.name}</span>
                      <button
                        onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-curx-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Genetics */}
          {activeTab === "genetics" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search known genetic variants (e.g. CYP2D6, CYP2C19)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch("variants", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-curx-cyan outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-white/15 rounded-xl bg-[#090D13] p-1.5 space-y-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddVariant(item)}
                      className="p-2 rounded-lg hover:bg-white/[0.06] cursor-pointer flex items-center justify-between text-xs font-mono"
                    >
                      <div>
                        <span className="text-curx-amber font-bold">{item.gene_symbol}</span>{" "}
                        <span className="text-white">{item.diplotype}</span>
                        <span className="text-slate-400 text-[10px] block">{item.phenotype}</span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Known Genetic Variants:</span>
                {variants.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic">No known genetic results added.</p>
                ) : (
                  variants.map((v, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-curx-amber font-bold">{v.geneSymbol || v.gene_symbol}</span> {v.diplotype}
                        <span className="text-slate-400 text-[10px] block">{v.phenotype}</span>
                      </div>
                      <button
                        onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-curx-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Conditions */}
          {activeTab === "conditions" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search known conditions (e.g. Breast Cancer, Hypertension)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch("conditions", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-curx-cyan outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-white/15 rounded-xl bg-[#090D13] p-1.5 space-y-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddCondition(item)}
                      className="p-2 rounded-lg hover:bg-white/[0.06] cursor-pointer flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-white">{item.name}</span>
                      <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Known Conditions:</span>
                {conditions.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic">No known conditions added.</p>
                ) : (
                  conditions.map((c, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-white">{c.name}</span>
                      <button
                        onClick={() => setConditions(conditions.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-curx-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Symptoms */}
          {activeTab === "symptoms" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search current symptoms (e.g. Headache, Fatigue)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch("symptoms", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-xs focus:border-curx-cyan outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-white/15 rounded-xl bg-[#090D13] p-1.5 space-y-1">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleAddSymptom(item)}
                      className="p-2 rounded-lg hover:bg-white/[0.06] cursor-pointer flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-white">{item.name}</span>
                      <Plus className="w-3.5 h-3.5 text-curx-cyan" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase block">Reported Symptoms:</span>
                {symptoms.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 italic">No current symptoms reported.</p>
                ) : (
                  symptoms.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-white">{s.name}</span>
                      <button
                        onClick={() => setSymptoms(symptoms.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-curx-red"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#06090E] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/15 text-slate-300 font-mono text-xs hover:border-white/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-curx-cyan text-graphite font-mono text-xs font-bold hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-graphite" />
                <span>SAVED!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>SAVE & UPDATE DASHBOARD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
