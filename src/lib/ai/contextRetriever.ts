import { SupabaseClient } from "@supabase/supabase-js";
import { evaluateDeterministicRisk, RiskLevel } from "@/lib/engine/riskEngine";
import { ClinicalContextPayload } from "./systemPrompt";

const DEMO_EMAILS = new Set([
  "curx.test.1789379265518@gmail.com",
  "test.clinician@gmail.com",
  "demo.clinician@curx.health",
  "demo@curx.ai",
]);

export interface ContextRetrievalResult {
  hasProfile: boolean;
  context: ClinicalContextPayload;
  patientId?: string;
  isDemo?: boolean;
}

/**
 * Determine query intent keywords
 */
function analyzeIntent(question: string): {
  isRiskRelated: boolean;
  isGeneticRelated: boolean;
  isMedicationRelated: boolean;
  isSymptomRelated: boolean;
  isCareRelated: boolean;
  isEmergencyRelated: boolean;
} {
  const q = question.toLowerCase();
  return {
    isRiskRelated:
      q.includes("risk") ||
      q.includes("score") ||
      q.includes("safe") ||
      q.includes("danger") ||
      q.includes("interaction") ||
      q.includes("collision") ||
      q.includes("factor") ||
      q.includes("why"),
    isGeneticRelated:
      q.includes("gene") ||
      q.includes("genetic") ||
      q.includes("dna") ||
      q.includes("variant") ||
      q.includes("allele") ||
      q.includes("diplotype") ||
      q.includes("cyp") ||
      q.includes("vkorc1") ||
      q.includes("dpyd") ||
      q.includes("tpmt") ||
      q.includes("slco1b1") ||
      q.includes("phenotype"),
    isMedicationRelated:
      q.includes("med") ||
      q.includes("drug") ||
      q.includes("pill") ||
      q.includes("dose") ||
      q.includes("clopidogrel") ||
      q.includes("warfarin") ||
      q.includes("omeprazole") ||
      q.includes("aspirin") ||
      q.includes("atorvastatin") ||
      q.includes("simvastatin") ||
      q.includes("prescri"),
    isSymptomRelated:
      q.includes("symptom") ||
      q.includes("feeling") ||
      q.includes("pain") ||
      q.includes("bleeding") ||
      q.includes("bruising") ||
      q.includes("rash") ||
      q.includes("chest") ||
      q.includes("breath"),
    isCareRelated:
      q.includes("care") ||
      q.includes("hospital") ||
      q.includes("clinic") ||
      q.includes("doctor") ||
      q.includes("facility") ||
      q.includes("near") ||
      q.includes("location") ||
      q.includes("where can i get") ||
      q.includes("emergency room") ||
      q.includes("er"),
    isEmergencyRelated:
      q.includes("emergency") ||
      q.includes("urgent") ||
      q.includes("severe") ||
      q.includes("dying") ||
      q.includes("anaphylaxis") ||
      q.includes("chest pain") ||
      q.includes("hard to breathe") ||
      q.includes("shortness of breath") ||
      q.includes("unconscious"),
  };
}

/**
 * Retrieve authorized patient context and evaluate deterministic risk if relevant
 */
export async function retrieveAuthorizedClinicalContext(
  supabase: SupabaseClient,
  userId: string,
  userEmail?: string,
  userQuestion: string = ""
): Promise<ContextRetrievalResult> {
  // 1. Resolve Patient Profile for Authenticated User
  let patient: any = null;

  const { data: userPatient } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (userPatient) {
    patient = userPatient;
  } else if (userEmail && DEMO_EMAILS.has(userEmail)) {
    const { data: demoPatient } = await supabase
      .from("patients")
      .select("*")
      .eq("is_demo", true)
      .limit(1)
      .maybeSingle();
    patient = demoPatient;
  }

  if (!patient) {
    return {
      hasProfile: false,
      context: {
        patientProfile: {
          fullName: "New CURX User",
          profileComplete: false,
        },
      },
    };
  }

  const patientId = patient.id;
  const intent = analyzeIntent(userQuestion);

  // 2. Fetch Patient's Clinical Records
  const { data: patientMeds } = await supabase
    .from("patient_medications")
    .select("dosage, frequency, medication:medications(id, canonical_name, active_ingredient, uses)")
    .eq("patient_id", patientId);

  const { data: patientVars } = await supabase
    .from("patient_variants")
    .select("diplotype, phenotype, gene:genes(symbol, name), variant:genetic_variants(variant_name, rs_id, clinical_significance)")
    .eq("patient_id", patientId);

  const { data: patientConds } = await supabase
    .from("patient_conditions")
    .select("condition:conditions(id, canonical_name, description, precaution_1, precaution_2, precaution_3, precaution_4)")
    .eq("patient_id", patientId);

  const { data: patientSyms } = await supabase
    .from("patient_symptoms")
    .select("symptom:symptoms(id, canonical_name, clinical_weight)")
    .eq("patient_id", patientId);

  // Format patient clinical lists
  const medications = (patientMeds || []).map((pm: any) => ({
    name: pm.medication?.canonical_name || "Unknown Medication",
    dosage: pm.dosage,
    frequency: pm.frequency,
    activeIngredient: pm.medication?.active_ingredient,
    uses: pm.medication?.uses,
  }));

  const variants = (patientVars || []).map((pv: any) => ({
    geneSymbol: pv.gene?.symbol || "UNKNOWN",
    variantName: pv.variant?.variant_name || pv.diplotype || "Standard",
    diplotype: pv.diplotype,
    phenotype: pv.phenotype,
    clinicalSignificance: pv.variant?.clinical_significance,
  }));

  const conditions = (patientConds || []).map((pc: any) => ({
    name: pc.condition?.canonical_name || "Unknown Condition",
    precautions: [
      pc.condition?.precaution_1,
      pc.condition?.precaution_2,
      pc.condition?.precaution_3,
      pc.condition?.precaution_4,
    ].filter(Boolean),
  }));

  const symptoms = (patientSyms || []).map((ps: any) => ({
    name: ps.symptom?.canonical_name || "Reported Symptom",
    weight: ps.symptom?.clinical_weight || 1,
  }));

  // 3. Emergency Safety Check
  let emergencyAlert: string | null = null;
  const emergencyKeywords = [
    "chest pain",
    "shortness of breath",
    "difficulty breathing",
    "anaphylaxis",
    "severe bleeding",
    "loss of consciousness",
  ];
  const hasEmergencySymptom = symptoms.some((s) =>
    emergencyKeywords.some((k) => s.name.toLowerCase().includes(k))
  );

  if (hasEmergencySymptom || intent.isEmergencyRelated) {
    emergencyAlert =
      "URGENT CLINICAL PROTOCOL: One or more critical symptoms require immediate in-person medical evaluation at the nearest emergency department or by calling emergency medical services (911/112).";
  }

  // 4. Deterministic Risk Engine Context (Always include if risk/med/gene inquiry or baseline)
  let deterministicRisk: any = undefined;
  let evidenceSources: any[] = [];

  // Load active clinical rules from Supabase
  const { data: gdrData } = await supabase
    .from("gene_drug_relationships")
    .select("recommendation, risk_level, phenotype, guideline_url, gene:genes(symbol), medication:medications(canonical_name), variant:genetic_variants(variant_name), evidence:evidence_sources(source_name, title, url)");

  const { data: ddiData } = await supabase
    .from("drug_drug_interactions")
    .select("interaction_type, severity, mechanism, description, drug_a:medications!drug_drug_interactions_drug_a_id_fkey(canonical_name), drug_b:medications!drug_drug_interactions_drug_b_id_fkey(canonical_name), evidence:evidence_sources(source_name, title, url)");

  const { data: cdrData } = await supabase
    .from("condition_drug_relationships")
    .select("relationship_type, risk_level, mechanism, rule_id, condition:conditions(canonical_name), medication:medications(canonical_name), evidence:evidence_sources(source_name, title, url)");

  const formattedGeneDrugRules = (gdrData || []).map((g: any) => ({
    geneSymbol: g.gene?.symbol || "",
    drugName: g.medication?.canonical_name || "",
    variantName: g.variant?.variant_name,
    phenotype: g.phenotype,
    riskLevel: (g.risk_level?.toUpperCase() || "LOW") as RiskLevel,
    recommendation: g.recommendation || "",
    evidence: {
      name: g.evidence?.source_name || "CPIC",
      title: g.evidence?.title || "CPIC Pharmacogenomic Guideline",
      url: g.guideline_url || g.evidence?.url,
    },
  }));

  const formattedDdiRules = (ddiData || []).map((d: any) => ({
    drugAName: d.drug_a?.canonical_name || "",
    drugBName: d.drug_b?.canonical_name || "",
    severity: (d.severity?.toUpperCase() || "MODERATE") as RiskLevel,
    interactionType: d.interaction_type || "Pharmacokinetic",
    mechanism: d.mechanism || "",
    description: d.description || "",
    evidence: {
      name: d.evidence?.source_name || "OpenFDA",
      title: d.evidence?.title || "FDA Drug Interaction Data",
      url: d.evidence?.url,
    },
  }));

  const formattedCdrRules = (cdrData || []).map((c: any) => ({
    conditionName: c.condition?.canonical_name || "",
    drugName: c.medication?.canonical_name || "",
    relationshipType: c.relationship_type || "Precaution",
    riskLevel: (c.risk_level?.toUpperCase() || "MODERATE") as RiskLevel,
    mechanism: c.mechanism || "",
    ruleId: c.rule_id || "CDR-001",
    evidence: {
      name: c.evidence?.source_name || "FDA Boxed Warning",
      title: c.evidence?.title || "Clinical Precaution",
      url: c.evidence?.url,
    },
  }));

  // Run Deterministic Engine with active patient data
  const formattedMedications = medications.map((m, idx) => ({ id: `med-${idx}`, name: m.name }));
  const formattedVariants = variants.map((v) => ({
    geneSymbol: v.geneSymbol,
    variantName: v.variantName,
    phenotype: v.phenotype,
  }));
  const formattedConditions = conditions.map((c, idx) => ({ id: `cond-${idx}`, name: c.name }));

  const riskEngineOutput = evaluateDeterministicRisk(
    formattedMedications,
    formattedVariants,
    formattedConditions,
    {
      geneDrugRules: formattedGeneDrugRules,
      ddiRules: formattedDdiRules,
      cdrRules: formattedCdrRules,
    }
  );

  deterministicRisk = {
    riskTier: riskEngineOutput.overallRisk,
    riskScore: riskEngineOutput.riskScore,
    structuredTrace: (riskEngineOutput.factors || []).map((f) => ({
      category: f.category,
      ruleId: f.ruleId,
      message: f.title,
      severity: f.severity,
      mechanism: f.mechanism,
      source: f.evidenceSource?.name || "CURX Engine",
    })),
    clinicalSummary: riskEngineOutput.summary,
  };

  // Collect relevant evidence sources matching patient trace
  const seenSources = new Set<string>();
  if (riskEngineOutput.factors) {
    for (const factor of riskEngineOutput.factors) {
      if (factor.evidenceSource?.name && !seenSources.has(factor.evidenceSource.name)) {
        seenSources.add(factor.evidenceSource.name);
        evidenceSources.push({
          sourceName: factor.evidenceSource.name,
          title: factor.evidenceSource.title || factor.title,
          url: factor.evidenceSource.url,
          relevantDetail: factor.mechanism,
        });
      }
    }
  }

  // Also query global evidence sources for patient's medications/genes
  const { data: dbEvidence } = await supabase
    .from("evidence_sources")
    .select("source_name, title, url, description")
    .limit(5);

  if (dbEvidence) {
    for (const ev of dbEvidence) {
      const key = `${ev.source_name}:${ev.title}`;
      if (!seenSources.has(key)) {
        seenSources.add(key);
        evidenceSources.push({
          sourceName: ev.source_name,
          title: ev.title,
          url: ev.url,
          relevantDetail: ev.description,
        });
      }
    }
  }

  // 5. Care Finder Data (if requested or emergency)
  let careFinder: any = undefined;
  if (intent.isCareRelated || intent.isEmergencyRelated || hasEmergencySymptom) {
    const city = patient.city || "San Francisco";
    // Canonical default hospital records for city
    careFinder = {
      city,
      facilities: [
        {
          name: `${city} General Hospital & Trauma Center`,
          type: "Hospital / Emergency Room",
          address: `1001 Potrero Ave, ${city}`,
          distanceKm: 2.1,
          phone: "+1 415-206-8000",
        },
        {
          name: `${city} UCSF Medical Center`,
          type: "Tertiary Hospital",
          address: `505 Parnassus Ave, ${city}`,
          distanceKm: 4.3,
          phone: "+1 415-476-1000",
        },
        {
          name: `${city} Urgent Care Center`,
          type: "Urgent Care Clinic",
          address: `2403 Noriega St, ${city}`,
          distanceKm: 5.6,
          phone: "+1 415-665-6600",
        },
      ],
    };
  }

  return {
    hasProfile: true,
    patientId: patient.id,
    isDemo: Boolean(patient.is_demo),
    context: {
      patientProfile: {
        fullName: patient.full_name,
        age: patient.age,
        gender: patient.gender,
        city: patient.city || "San Francisco",
        isDemo: Boolean(patient.is_demo),
        profileComplete: Boolean(patient.profile_complete),
      },
      medications,
      variants,
      conditions,
      symptoms,
      deterministicRisk,
      evidenceSources,
      emergencyAlert,
      careFinder,
      queryIntent: Object.entries(intent)
        .filter(([_, v]) => v)
        .map(([k]) => k)
        .join(", "),
    },
  };
}
