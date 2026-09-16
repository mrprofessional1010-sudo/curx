import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateAdaptiveSymptoms } from "@/lib/engine/symptomEngine";

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    const body = await request.json().catch(() => ({}));
    let reportedSymptoms: string[] = body.symptoms || body.reportedSymptoms || [];

    // If no symptoms provided, default to demo patient symptoms or sample symptoms
    if (!reportedSymptoms || reportedSymptoms.length === 0) {
      reportedSymptoms = ["chest pain", "nausea", "fatigue"];
    }

    // Load conditions, symptoms, and linkages from Supabase safely
    let formattedConditions: any[] = [];
    let formattedSymptoms: any[] = [];
    let formattedLinkages: any[] = [];

    try {
      const { data: conditionsData } = await supabase
        .from("conditions")
        .select("id, canonical_name, description, precaution_1, precaution_2, precaution_3, precaution_4")
        .limit(100);

      const { data: symptomsData } = await supabase
        .from("symptoms")
        .select("id, canonical_name, clinical_weight")
        .limit(300);

      const { data: linkagesData } = await supabase
        .from("disease_symptoms")
        .select("condition_id, symptom_id")
        .limit(2000);

      formattedConditions = (conditionsData || []).map((c: any) => ({
        id: c.id,
        name: c.canonical_name,
        description: c.description,
        precautions: [c.precaution_1, c.precaution_2, c.precaution_3, c.precaution_4].filter(Boolean),
      }));

      formattedSymptoms = (symptomsData || []).map((s: any) => ({
        id: s.id,
        name: s.canonical_name,
        weight: s.clinical_weight || 1,
      }));

      formattedLinkages = (linkagesData || []).map((l: any) => ({
        conditionId: l.condition_id,
        symptomId: l.symptom_id,
      }));
    } catch {
      // Fallback matrix will be utilized automatically
    }

    // Default curated clinical matrix fallback
    const defaultConditions = [
      { id: "c-mi", name: "Acute Myocardial Infarction", description: "Acute coronary artery occlusion.", precautions: ["Emergency cardiac triage", "Aspirin protocol"] },
      { id: "c-gerd", name: "Gastroesophageal Reflux Disease (GERD)", description: "Gastric acid mucosal irritation.", precautions: ["Avoid NSAIDs", "Elevate head of bed"] },
      { id: "c-ulcer", name: "Peptic Ulcer Disease", description: "Gastric or duodenal mucosal ulceration.", precautions: ["Discontinue aspirin/NSAIDs", "Gastroprotection"] },
      { id: "c-drug-reaction", name: "Adverse Drug Reaction", description: "Pharmacological hypersensitivity or toxicity.", precautions: ["Clinical regimen review", "Pharmacogenomic testing"] },
      { id: "c-asthma", name: "Bronchial Asthma Attack", description: "Acute airway hyperresponsiveness.", precautions: ["Inhaled bronchodilator", "Oxygen therapy"] },
      { id: "c-dengue", name: "Dengue Hemorrhagic Fever", description: "Acute viral infection with thrombocytopenia risk.", precautions: ["Hydration", "Avoid NSAIDs/Aspirin"] }
    ];

    const defaultSymptoms = [
      { id: "s-chest-pain", name: "chest pain", weight: 8 },
      { id: "s-breathlessness", name: "breathlessness", weight: 7 },
      { id: "s-nausea", name: "nausea", weight: 4 },
      { id: "s-fatigue", name: "fatigue", weight: 3 },
      { id: "s-itching", name: "itching", weight: 2 },
      { id: "s-skin-rash", name: "skin rash", weight: 3 },
      { id: "s-stomach-pain", name: "stomach pain", weight: 5 },
      { id: "s-dizziness", name: "dizziness", weight: 4 },
      { id: "s-high-fever", name: "high fever", weight: 6 },
      { id: "s-joint-pain", name: "joint pain", weight: 3 }
    ];

    const defaultLinkages = [
      { conditionId: "c-mi", symptomId: "s-chest-pain" },
      { conditionId: "c-mi", symptomId: "s-breathlessness" },
      { conditionId: "c-mi", symptomId: "s-nausea" },
      { conditionId: "c-mi", symptomId: "s-dizziness" },
      { conditionId: "c-gerd", symptomId: "s-chest-pain" },
      { conditionId: "c-gerd", symptomId: "s-nausea" },
      { conditionId: "c-ulcer", symptomId: "s-stomach-pain" },
      { conditionId: "c-ulcer", symptomId: "s-nausea" },
      { conditionId: "c-drug-reaction", symptomId: "s-itching" },
      { conditionId: "c-drug-reaction", symptomId: "s-skin-rash" },
      { conditionId: "c-asthma", symptomId: "s-breathlessness" },
      { conditionId: "c-dengue", symptomId: "s-high-fever" },
      { conditionId: "c-dengue", symptomId: "s-joint-pain" }
    ];

    const finalConditions = (formattedConditions.length > 0) ? formattedConditions : defaultConditions;
    const finalSymptoms = (formattedSymptoms.length > 0) ? formattedSymptoms : defaultSymptoms;
    const finalLinkages = (formattedLinkages.length > 0) ? formattedLinkages : defaultLinkages;

    // Evaluate deterministic adaptive symptoms
    const response = evaluateAdaptiveSymptoms(reportedSymptoms, {
      conditions: finalConditions,
      symptoms: finalSymptoms,
      linkages: finalLinkages,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error evaluating adaptive symptoms:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
