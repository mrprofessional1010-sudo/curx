/**
 * CURX Deterministic Clinical Risk Engine
 * Implements Plane 01 (Deterministic Safety Plane) evaluation for multi-axis clinical decision support:
 * - Gene-Drug (CPIC/ClinPGx pharmacogenomic guidelines)
 * - Drug-Drug (Pairwise pharmacological interactions)
 * - Condition-Drug (Curated clinical contraindications)
 *
 * SAFETY INVARIANT: Risk scores and tiers are computed exclusively via deterministic rules.
 * The LLM never computes, alters, or overrides risk tiers.
 */

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export interface RiskFactor {
  id: string;
  category: "GENE_DRUG" | "DRUG_DRUG" | "CONDITION_DRUG";
  title: string;
  severity: RiskLevel;
  mechanism: string;
  recommendation: string;
  ruleId?: string;
  evidenceSource?: {
    name: string;
    title: string;
    url?: string;
  };
}

export interface RiskEvaluationTrace {
  overallRisk: RiskLevel;
  riskScore: number; // 0 - 100 deterministic index
  activeMedicationsCount: number;
  geneticVariantsCount: number;
  conditionsCount: number;
  factors: RiskFactor[];
  summary: string;
  evaluatedAt: string;
}

const SEVERITY_WEIGHTS: Record<RiskLevel, number> = {
  LOW: 10,
  MODERATE: 30,
  HIGH: 65,
  SEVERE: 95,
};

export function evaluateDeterministicRisk(
  medications: Array<{ id: string; name: string }>,
  variants: Array<{ geneSymbol: string; variantName: string; phenotype?: string }>,
  conditions: Array<{ id: string; name: string }>,
  rules: {
    geneDrugRules: Array<{
      geneSymbol: string;
      drugName: string;
      variantName?: string;
      phenotype?: string;
      recommendation: string;
      riskLevel: RiskLevel;
      evidence?: { name: string; title: string; url?: string };
    }>;
    ddiRules: Array<{
      drugAName: string;
      drugBName: string;
      severity: RiskLevel;
      interactionType: string;
      mechanism: string;
      description: string;
      evidence?: { name: string; title: string; url?: string };
    }>;
    cdrRules: Array<{
      conditionName: string;
      drugName: string;
      relationshipType: string;
      riskLevel: RiskLevel;
      mechanism: string;
      ruleId: string;
      evidence?: { name: string; title: string; url?: string };
    }>;
  }
): RiskEvaluationTrace {
  const triggeredFactors: RiskFactor[] = [];

  const medNames = medications.map((m) => m.name.toLowerCase());
  const condNames = conditions.map((c) => c.name.toLowerCase());

  // 1. Evaluate Gene-Drug Rules (CPIC / ClinPGx)
  for (const v of variants) {
    const vGene = v.geneSymbol.toUpperCase();
    const vName = v.variantName;

    for (const gdr of rules.geneDrugRules) {
      if (gdr.geneSymbol.toUpperCase() === vGene) {
        // Check if any active medication matches
        const medMatch = medNames.some((m) => m.includes(gdr.drugName.toLowerCase()) || gdr.drugName.toLowerCase().includes(m));
        if (medMatch) {
          // Check variant or phenotype match
          const variantMatches = !gdr.variantName || gdr.variantName === vName || (v.phenotype && gdr.phenotype && v.phenotype.includes(gdr.phenotype));
          if (variantMatches) {
            triggeredFactors.push({
              id: `GDR_${vGene}_${gdr.drugName}`,
              category: "GENE_DRUG",
              title: `${vGene} (${vName}) ↔ ${gdr.drugName.toUpperCase()} Altered Response`,
              severity: gdr.riskLevel,
              mechanism: gdr.phenotype || "Pharmacogenomic variant alters metabolic clearance / efficacy",
              recommendation: gdr.recommendation,
              evidenceSource: gdr.evidence || {
                name: "CPIC Guideline",
                title: `CPIC Clinical Annotation for ${vGene} and ${gdr.drugName}`,
                url: "https://cpicpgx.org"
              }
            });
          }
        }
      }
    }
  }

  // 2. Evaluate Drug-Drug Interactions (Pairwise)
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const drugA = medications[i].name.toLowerCase();
      const drugB = medications[j].name.toLowerCase();

      for (const ddi of rules.ddiRules) {
        const ruleA = ddi.drugAName.toLowerCase();
        const ruleB = ddi.drugBName.toLowerCase();

        const matchAtoB = (drugA.includes(ruleA) || ruleA.includes(drugA)) && (drugB.includes(ruleB) || ruleB.includes(drugB));
        const matchBtoA = (drugA.includes(ruleB) || ruleB.includes(drugA)) && (drugB.includes(ruleA) || ruleA.includes(drugB));

        if (matchAtoB || matchBtoA) {
          triggeredFactors.push({
            id: `DDI_${ddi.drugAName}_${ddi.drugBName}`,
            category: "DRUG_DRUG",
            title: `${ddi.drugAName} ↔ ${ddi.drugBName} Interaction`,
            severity: ddi.severity,
            mechanism: ddi.mechanism || ddi.interactionType,
            recommendation: ddi.description,
            evidenceSource: ddi.evidence || {
              name: "FDA / Validated Interaction Registry",
              title: `Clinical DDI Monograph: ${ddi.drugAName} and ${ddi.drugBName}`,
              url: "https://curx.ai/clinical-evidence/ddi"
            }
          });
        }
      }
    }
  }

  // 3. Evaluate Condition-Drug Contraindications (Curated Rules)
  for (const cond of conditions) {
    const cName = cond.name.toLowerCase();

    for (const cdr of rules.cdrRules) {
      const ruleCond = cdr.conditionName.toLowerCase();
      const ruleDrug = cdr.drugName.toLowerCase();

      const condMatches = cName.includes(ruleCond) || ruleCond.includes(cName);
      const drugMatches = medNames.some((m) => m.includes(ruleDrug) || ruleDrug.includes(m));

      if (condMatches && drugMatches) {
        triggeredFactors.push({
          id: cdr.ruleId || `CDR_${cdr.conditionName}_${cdr.drugName}`,
          category: "CONDITION_DRUG",
          title: `${cdr.conditionName} ↔ ${cdr.drugName} Contraindication`,
          severity: cdr.riskLevel,
          mechanism: cdr.mechanism,
          recommendation: `${cdr.relationshipType}: Exercise extreme clinical caution or consider therapeutic alternatives.`,
          ruleId: cdr.ruleId,
          evidenceSource: cdr.evidence || {
            name: "CURX Curated Clinical Rule",
            title: `Contraindication Reference: ${cdr.conditionName} and ${cdr.drugName}`,
            url: "https://curx.ai/clinical-evidence/cdr"
          }
        });
      }
    }
  }

  // Calculate composite deterministic risk level
  let highestTier: RiskLevel = "LOW";
  let maxWeight = 10;

  for (const factor of triggeredFactors) {
    const w = SEVERITY_WEIGHTS[factor.severity];
    if (w > maxWeight) {
      maxWeight = w;
      highestTier = factor.severity;
    }
  }

  // Composite multi-factor score
  const scoreBase = maxWeight;
  const additive = Math.min(20, Math.max(0, (triggeredFactors.length - 1) * 5));
  const finalScore = Math.min(100, scoreBase + additive);

  let summary = "No critical clinical contraindications or severe pharmacogenomic alterations detected.";
  if (highestTier === "SEVERE") {
    summary = "SEVERE clinical risk identified. Absolute contraindication or critical pharmacogenomic/DDI interaction requires immediate therapeutic modification.";
  } else if (highestTier === "HIGH") {
    summary = "HIGH risk detected across medication regimens or genetic clearance pathways. Clinical dose adjustment or alternative therapy recommended.";
  } else if (highestTier === "MODERATE") {
    summary = "MODERATE interaction factors detected. Close patient monitoring and routine INR/biomarker surveillance advised.";
  }

  return {
    overallRisk: highestTier,
    riskScore: finalScore,
    activeMedicationsCount: medications.length,
    geneticVariantsCount: variants.length,
    conditionsCount: conditions.length,
    factors: triggeredFactors,
    summary,
    evaluatedAt: new Date().toISOString()
  };
}
