import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEMO_EMAILS = new Set([
  "curx.test.1789379265518@gmail.com",
  "test.clinician@gmail.com",
  "demo.clinician@curx.health",
  "demo@curx.ai",
]);

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("id") || searchParams.get("patient_id") || searchParams.get("patientId");

  try {
    // 1. Check authenticated user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let patient: any = null;

    if (requestedId) {
      // Direct ID requested: Enforce strict authorization & ownership checks
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", requestedId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: "Access Denied: Patient record not found or forbidden." }, { status: 403 });
      }

      // Check ownership: User must own the record or be accessing demo data if demo account
      const isOwner = user && data.user_id === user.id;
      const isDemoAccountAccessingDemo = Boolean(data.is_demo && user?.email && DEMO_EMAILS.has(user.email));

      if (!isOwner && !isDemoAccountAccessingDemo) {
        return NextResponse.json(
          { error: "Forbidden: You do not have authorization to access this patient profile." },
          { status: 403 }
        );
      }

      patient = data;
    } else if (user) {
      // Authenticated user session: Resolve patient mapped to auth.users.id
      const { data: userPatient } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userPatient) {
        patient = userPatient;
      } else if (user.email && DEMO_EMAILS.has(user.email)) {
        // Fallback to active demo patient ONLY for designated demo/test accounts
        const { data: demoPatient } = await supabase
          .from("patients")
          .select("*")
          .eq("is_demo", true)
          .limit(1)
          .maybeSingle();

        patient = demoPatient;
      } else {
        // New authenticated user with no patient profile yet
        return NextResponse.json({
          patient: null,
          hasProfile: false,
          message: "No patient profile associated with this account. Complete onboarding to initialize your profile.",
        });
      }
    } else {
      // Unauthenticated request
      return NextResponse.json(
        { error: "Unauthorized. Please authenticate to access clinical intelligence records." },
        { status: 401 }
      );
    }

    if (!patient) {
      return NextResponse.json({ patient: null, hasProfile: false }, { status: 200 });
    }

    const patientId = patient.id;

    // Fetch patient medications with canonical medication fields
    const { data: patientMeds } = await supabase
      .from("patient_medications")
      .select("id, dosage, frequency, medication:medications(id, canonical_name, rxcui, active_ingredient, composition, uses, side_effects)")
      .eq("patient_id", patientId);

    // Fetch patient genetic variants with gene info
    const { data: patientVars } = await supabase
      .from("patient_variants")
      .select("id, diplotype, phenotype, gene:genes(id, symbol, name, location), variant:genetic_variants(id, variant_name, rs_id, clinical_significance)")
      .eq("patient_id", patientId);

    // Fetch patient conditions with precautions
    const { data: patientConds } = await supabase
      .from("patient_conditions")
      .select("id, diagnosed_at, condition:conditions(id, canonical_name, description, precaution_1, precaution_2, precaution_3, precaution_4)")
      .eq("patient_id", patientId);

    // Fetch patient reported symptoms
    const { data: patientSyms } = await supabase
      .from("patient_symptoms")
      .select("id, reported_at, symptom:symptoms(id, canonical_name, clinical_weight)")
      .eq("patient_id", patientId);

    return NextResponse.json({
      hasProfile: true,
      patient: {
        id: patient.id,
        fullName: patient.full_name,
        age: patient.age,
        gender: patient.gender,
        city: patient.city || "San Francisco",
        clinicalNotes: patient.clinical_notes,
        isDemo: Boolean(patient.is_demo),
        userId: patient.user_id || null,
        profileComplete: Boolean(patient.profile_complete),
        medications: (patientMeds || []).map((pm: any) => ({
          id: pm.medication?.id || pm.id,
          patientMedicationId: pm.id,
          name: pm.medication?.canonical_name || "Unknown Medication",
          rxcui: pm.medication?.rxcui,
          activeIngredient: pm.medication?.active_ingredient,
          dosage: pm.dosage,
          frequency: pm.frequency,
          uses: pm.medication?.uses,
          sideEffects: pm.medication?.side_effects,
        })),
        variants: (patientVars || []).map((pv: any) => ({
          id: pv.id,
          geneId: pv.gene?.id,
          geneSymbol: pv.gene?.symbol || "UNKNOWN",
          geneName: pv.gene?.name,
          location: pv.gene?.location,
          variantId: pv.variant?.id,
          variantName: pv.variant?.variant_name || pv.diplotype,
          rsId: pv.variant?.rs_id,
          diplotype: pv.diplotype,
          phenotype: pv.phenotype,
          clinicalSignificance: pv.variant?.clinical_significance,
        })),
        conditions: (patientConds || []).map((pc: any) => ({
          id: pc.condition?.id || pc.id,
          patientConditionId: pc.id,
          name: pc.condition?.canonical_name || "Unknown Condition",
          description: pc.condition?.description,
          precautions: [
            pc.condition?.precaution_1,
            pc.condition?.precaution_2,
            pc.condition?.precaution_3,
            pc.condition?.precaution_4,
          ].filter(Boolean),
        })),
        symptoms: (patientSyms || []).map((ps: any) => ({
          id: ps.symptom?.id || ps.id,
          patientSymptomId: ps.id,
          name: ps.symptom?.canonical_name || "Reported Symptom",
          weight: ps.symptom?.clinical_weight || 1,
        })),
      },
    });
  } catch (err: any) {
    console.error("Error retrieving patient profile:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
