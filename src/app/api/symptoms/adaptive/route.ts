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

    // Load conditions, symptoms, and linkages from Supabase
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

    const formattedConditions = (conditionsData || []).map((c: any) => ({
      id: c.id,
      name: c.canonical_name,
      description: c.description,
      precautions: [c.precaution_1, c.precaution_2, c.precaution_3, c.precaution_4].filter(Boolean),
    }));

    const formattedSymptoms = (symptomsData || []).map((s: any) => ({
      id: s.id,
      name: s.canonical_name,
      weight: s.clinical_weight || 1,
    }));

    const formattedLinkages = (linkagesData || []).map((l: any) => ({
      conditionId: l.condition_id,
      symptomId: l.symptom_id,
    }));

    // Evaluate deterministic adaptive symptoms
    const response = evaluateAdaptiveSymptoms(reportedSymptoms, {
      conditions: formattedConditions,
      symptoms: formattedSymptoms,
      linkages: formattedLinkages,
    });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("Error evaluating adaptive symptoms:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
