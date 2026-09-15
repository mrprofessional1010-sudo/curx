/**
 * CURX Deterministic Adaptive Symptom Reasoning Engine
 *
 * Core Principles:
 * 1. Deterministic symptom–condition matching using the disease–symptom matrix.
 * 2. Adaptive question selection chooses the single most discriminating unanswered symptom among current candidates.
 * 3. Qualitative categorization: HIGHER RELATIVE MATCH, MODERATE RELATIVE MATCH, LOWER RELATIVE MATCH.
 * 4. Never displays fabricated probability percentages.
 * 5. Never called a medical diagnosis.
 * 6. Emergency red-flag symptoms trigger immediate clinical safety override.
 */

export interface CandidateCondition {
  id: string;
  name: string;
  description?: string;
  matchedSymptomsCount: number;
  totalConditionSymptomsCount: number;
  matchTier: "HIGHER RELATIVE MATCH" | "MODERATE RELATIVE MATCH" | "LOWER RELATIVE MATCH";
  precautions: string[];
}

export interface AdaptiveSymptomResponse {
  candidates: CandidateCondition[];
  nextQuestion: {
    symptomId: string;
    symptomName: string;
    questionText: string;
    discriminatingPower: number;
  } | null;
  isEmergency: boolean;
  emergencyAlert: string | null;
  totalReportedSymptoms: number;
  evaluatedAt: string;
}

// Red-flag emergency symptoms that mandate immediate emergency override
const EMERGENCY_RED_FLAGS = new Set([
  "chest pain",
  "severe chest pain",
  "breathlessness",
  "shortness of breath",
  "loss of consciousness",
  "altered mental state",
  "sudden paralysis",
  "coma",
  "massive bleeding"
]);

export function evaluateAdaptiveSymptoms(
  reportedSymptomNames: string[],
  matrix: {
    conditions: Array<{ id: string; name: string; description?: string; precautions?: string[] }>;
    symptoms: Array<{ id: string; name: string; weight: number }>;
    linkages: Array<{ conditionId: string; symptomId: string }>;
  }
): AdaptiveSymptomResponse {
  const reportedNormalized = new Set(reportedSymptomNames.map((s) => s.toLowerCase().trim()));
  
  // 1. Check for Emergency Safety Red Flags
  let isEmergency = false;
  let emergencyAlert: string | null = null;
  Array.from(reportedNormalized).forEach((s) => {
    if (EMERGENCY_RED_FLAGS.has(s)) {
      isEmergency = true;
      emergencyAlert = `EMERGENCY SAFETY OVERRIDE: Severe acute symptom reported ("${s.toUpperCase()}"). Automated differential questioning halted. Direct immediate emergency triage and urgent care evaluation required.`;
    }
  });

  // Create fast lookup maps
  const symptomById = new Map(matrix.symptoms.map((s) => [s.id, s]));
  const symptomByName = new Map(matrix.symptoms.map((s) => [s.name.toLowerCase(), s]));

  // Build condition -> symptomIds map
  const conditionSymptomsMap = new Map<string, Set<string>>();
  for (const link of matrix.linkages) {
    if (!conditionSymptomsMap.has(link.conditionId)) {
      conditionSymptomsMap.set(link.conditionId, new Set());
    }
    conditionSymptomsMap.get(link.conditionId)!.add(link.symptomId);
  }

  // Get reported symptom IDs
  const reportedSymptomIds = new Set<string>();
  Array.from(reportedNormalized).forEach((sName) => {
    const sym = symptomByName.get(sName);
    if (sym) {
      reportedSymptomIds.add(sym.id);
    }
  });

  // 2. Score candidate conditions deterministically based on reported symptoms
  const scoredConditions: Array<{
    cond: { id: string; name: string; description?: string; precautions?: string[] };
    matchedCount: number;
    totalCount: number;
    score: number;
  }> = [];

  for (const cond of matrix.conditions) {
    const condSymIds = conditionSymptomsMap.get(cond.id) || new Set();
    if (condSymIds.size === 0) continue;

    let matchCount = 0;
    let weightedScore = 0;

    Array.from(reportedSymptomIds).forEach((symId) => {
      if (condSymIds.has(symId)) {
        matchCount++;
        const sym = symptomById.get(symId);
        const weight = sym ? sym.weight : 1;
        weightedScore += weight;
      }
    });

    if (matchCount > 0) {
      // Relative match index based on overlap ratio and clinical weights
      const coverage = matchCount / Math.max(1, condSymIds.size);
      const compositeScore = weightedScore * 10 + coverage * 20;
      scoredConditions.push({
        cond,
        matchedCount: matchCount,
        totalCount: condSymIds.size,
        score: compositeScore
      });
    }
  }

  // Sort descending by score
  scoredConditions.sort((a, b) => b.score - a.score);

  // Take top 2 to 5 candidate conditions
  const topScored = scoredConditions.slice(0, 5);

  const candidates: CandidateCondition[] = topScored.map((item, idx) => {
    let matchTier: "HIGHER RELATIVE MATCH" | "MODERATE RELATIVE MATCH" | "LOWER RELATIVE MATCH" = "LOWER RELATIVE MATCH";
    if (idx === 0) {
      matchTier = "HIGHER RELATIVE MATCH";
    } else if (idx <= 2) {
      matchTier = "MODERATE RELATIVE MATCH";
    }

    return {
      id: item.cond.id,
      name: item.cond.name,
      description: item.cond.description,
      matchedSymptomsCount: item.matchedCount,
      totalConditionSymptomsCount: item.totalCount,
      matchTier,
      precautions: item.cond.precautions || []
    };
  });

  // 3. Adaptive Question Selection: Find the most discriminating unanswered symptom
  // The most discriminating symptom is present in ~50% of top candidates, maximizing information gain
  let nextQuestion: AdaptiveSymptomResponse["nextQuestion"] = null;

  if (!isEmergency && candidates.length > 1) {
    const candidateCondIds = candidates.map((c) => c.id);
    const candidateCount = candidateCondIds.length;

    // Count frequency of each unanswered symptom across top candidates
    const unansweredSymptomFreq = new Map<string, number>();

    for (const cId of candidateCondIds) {
      const symIds = conditionSymptomsMap.get(cId) || new Set();
      Array.from(symIds).forEach((sId) => {
        if (!reportedSymptomIds.has(sId)) {
          unansweredSymptomFreq.set(sId, (unansweredSymptomFreq.get(sId) || 0) + 1);
        }
      });
    }

    // Discrimination power is highest when frequency is closest to candidateCount / 2
    let bestSymptomId: string | null = null;
    let highestDiscrimination = -1;

    Array.from(unansweredSymptomFreq.entries()).forEach(([sId, freq]) => {
      // Metric: maximizes variance among candidates
      const ratio = freq / candidateCount;
      const discrimination = 1 - Math.abs(ratio - 0.5) * 2; // 1.0 when exactly 50% split

      if (discrimination > highestDiscrimination) {
        highestDiscrimination = discrimination;
        bestSymptomId = sId;
      }
    });

    if (bestSymptomId) {
      const bestSym = symptomById.get(bestSymptomId);
      if (bestSym) {
        const formattedName = bestSym.name.replace(/_/g, " ");
        nextQuestion = {
          symptomId: bestSym.id,
          symptomName: bestSym.name,
          questionText: `Are you currently experiencing or noticing ${formattedName}?`,
          discriminatingPower: Math.round(highestDiscrimination * 100)
        };
      }
    }
  }

  return {
    candidates,
    nextQuestion,
    isEmergency,
    emergencyAlert,
    totalReportedSymptoms: reportedNormalized.size,
    evaluatedAt: new Date().toISOString()
  };
}
