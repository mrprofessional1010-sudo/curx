import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { evaluateDeterministicRisk, RiskLevel } from "@/lib/engine/riskEngine";

export async function POST(request: Request) {
  const supabase = createClient();

  try {
    const body = await request.json().catch(() => ({}));
    let { medications, variants, conditions, patientId } = body;

    // If patientId is supplied and arrays are not provided, fetch from DB
    if (patientId && (!medications || medications.length === 0)) {
      const { data: patientMeds } = await supabase
        .from("patient_medications")
        .select("medication:medications(id, canonical_name)")
        .eq("patient_id", patientId);

      const { data: patientVars } = await supabase
        .from("patient_variants")
        .select("diplotype, phenotype, gene:genes(symbol), variant:genetic_variants(variant_name)")
        .eq("patient_id", patientId);

      const { data: patientConds } = await supabase
        .from("patient_conditions")
        .select("condition:conditions(id, canonical_name)")
        .eq("patient_id", patientId);

      medications = (patientMeds || []).map((pm: any) => ({
        id: pm.medication?.id,
        name: pm.medication?.canonical_name,
      }));

      variants = (patientVars || []).map((pv: any) => ({
        geneSymbol: pv.gene?.symbol,
        variantName: pv.variant?.variant_name || pv.diplotype,
        phenotype: pv.phenotype,
      }));

      conditions = (patientConds || []).map((pc: any) => ({
        id: pc.condition?.id,
        name: pc.condition?.canonical_name,
      }));
    }

    // Default fallbacks if empty (use first demo patient)
    if (!medications || medications.length === 0) {
      const { data: demoPatients } = await supabase
        .from("patients")
        .select("id")
        .eq("is_demo", true)
        .limit(1);

      if (demoPatients && demoPatients.length > 0) {
        const dId = demoPatients[0].id;
        const { data: pMeds } = await supabase
          .from("patient_medications")
          .select("medication:medications(id, canonical_name)")
          .eq("patient_id", dId);
        const { data: pVars } = await supabase
          .from("patient_variants")
          .select("diplotype, phenotype, gene:genes(symbol), variant:genetic_variants(variant_name)")
          .eq("patient_id", dId);
        const { data: pConds } = await supabase
          .from("patient_conditions")
          .select("condition:conditions(id, canonical_name)")
          .eq("patient_id", dId);

        medications = (pMeds || []).map((pm: any) => ({
          id: pm.medication?.id,
          name: pm.medication?.canonical_name,
        }));
        variants = (pVars || []).map((pv: any) => ({
          geneSymbol: pv.gene?.symbol,
          variantName: pv.variant?.variant_name || pv.diplotype,
          phenotype: pv.phenotype,
        }));
        conditions = (pConds || []).map((pc: any) => ({
          id: pc.condition?.id,
          name: pc.condition?.canonical_name,
        }));
      }
    }

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
      recommendation: g.recommendation,
      riskLevel: g.risk_level as RiskLevel,
      evidence: g.evidence ? { name: g.evidence.source_name, title: g.evidence.title, url: g.evidence.url } : undefined,
    }));

    const formattedDdiRules = (ddiData || []).map((d: any) => ({
      drugAName: d.drug_a?.canonical_name || "",
      drugBName: d.drug_b?.canonical_name || "",
      severity: d.severity as RiskLevel,
      interactionType: d.interaction_type,
      mechanism: d.mechanism,
      description: d.description,
      evidence: d.evidence ? { name: d.evidence.source_name, title: d.evidence.title, url: d.evidence.url } : undefined,
    }));

    const formattedCdrRules = (cdrData || []).map((c: any) => ({
      conditionName: c.condition?.canonical_name || "",
      drugName: c.medication?.canonical_name || "",
      relationshipType: c.relationship_type,
      riskLevel: c.risk_level as RiskLevel,
      mechanism: c.mechanism,
      ruleId: c.rule_id,
      evidence: c.evidence ? { name: c.evidence.source_name, title: c.evidence.title, url: c.evidence.url } : undefined,
    }));

    // Execute deterministic risk calculation
    const trace = evaluateDeterministicRisk(
      medications || [],
      variants || [],
      conditions || [],
      {
        geneDrugRules: formattedGeneDrugRules,
        ddiRules: formattedDdiRules,
        cdrRules: formattedCdrRules,
      }
    );

    return NextResponse.json({
      evaluation: trace,
      inputs: {
        medicationsCount: (medications || []).length,
        variantsCount: (variants || []).length,
        conditionsCount: (conditions || []).length,
      },
    });
  } catch (err: any) {
    console.error("Error executing risk evaluation:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
