import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required to create a profile." }, { status: 401 });
    }

    const body = await request.json();
    const {
      fullName,
      age,
      gender,
      city,
      clinicalNotes,
      medications = [],
      variants = [],
      conditions = [],
      symptoms = [],
    } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Preferred full name is required." }, { status: 400 });
    }

    // Check if patient already exists for this user
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let patientId = existingPatient?.id;

    if (patientId) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("patients")
        .update({
          full_name: fullName.trim(),
          age: age ? parseInt(age, 10) : 35,
          gender: gender || "Unspecified",
          city: city || "San Francisco",
          clinical_notes: clinicalNotes || "User-configured clinical profile",
          profile_complete: true,
        })
        .eq("id", patientId);

      if (updateError) throw updateError;
    } else {
      // Create new patient record
      const { data: newPatient, error: insertError } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          full_name: fullName.trim(),
          age: age ? parseInt(age, 10) : 35,
          gender: gender || "Unspecified",
          city: city || "San Francisco",
          clinical_notes: clinicalNotes || "User-configured clinical profile",
          is_demo: false,
          profile_complete: true,
        })
        .select("id")
        .single();

      if (insertError || !newPatient) throw insertError || new Error("Failed to insert patient record.");
      patientId = newPatient.id;
    }

    // Clean existing relational records if re-saving
    await Promise.all([
      supabase.from("patient_medications").delete().eq("patient_id", patientId),
      supabase.from("patient_variants").delete().eq("patient_id", patientId),
      supabase.from("patient_conditions").delete().eq("patient_id", patientId),
      supabase.from("patient_symptoms").delete().eq("patient_id", patientId),
    ]);

    // Insert Medications
    if (medications.length > 0) {
      const medRows = medications.map((m: any) => ({
        patient_id: patientId,
        medication_id: m.medicationId || m.id,
        dosage: m.dosage || "Standard dose",
        frequency: m.frequency || "Once daily",
        prescribed_at: new Date().toISOString(),
      }));
      const { error: medError } = await supabase.from("patient_medications").insert(medRows);
      if (medError) console.warn("Error inserting patient medications:", medError);
    }

    // Insert Genetic Variants
    if (variants.length > 0) {
      const varRows = variants.map((v: any) => ({
        patient_id: patientId,
        gene_id: v.geneId,
        variant_id: v.variantId || null,
        diplotype: v.diplotype || "*1/*1",
        phenotype: v.phenotype || "Normal Metabolizer",
      }));
      const { error: varError } = await supabase.from("patient_variants").insert(varRows);
      if (varError) console.warn("Error inserting patient variants:", varError);
    }

    // Insert Conditions
    if (conditions.length > 0) {
      const condRows = conditions.map((c: any) => ({
        patient_id: patientId,
        condition_id: c.conditionId || c.id,
        diagnosed_at: new Date().toISOString(),
      }));
      const { error: condError } = await supabase.from("patient_conditions").insert(condRows);
      if (condError) console.warn("Error inserting patient conditions:", condError);
    }

    // Insert Symptoms
    if (symptoms.length > 0) {
      const symRows = symptoms.map((s: any) => ({
        patient_id: patientId,
        symptom_id: s.symptomId || s.id,
        reported_at: new Date().toISOString(),
      }));
      const { error: symError } = await supabase.from("patient_symptoms").insert(symRows);
      if (symError) console.warn("Error inserting patient symptoms:", symError);
    }

    return NextResponse.json({
      success: true,
      patientId,
      message: "Personalized clinical profile saved successfully.",
    });
  } catch (err: any) {
    console.error("Save profile API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
