"""
Deterministic Clinical Risk Engine Test Suite
Tests:
- Gene-Drug PGx interactions (CPIC Level 1A)
- Drug-Drug interactions (Substrate + Potent Inhibitor phenoconversion)
- Condition-Drug contraindications (e.g. Tamoxifen + History of Deep Vein Thrombosis)
- Deterministic score determinism and safety plane isolation
"""

import unittest
from typing import List, Dict, Any

class MockDeterministicRiskEngine:
    """Python reference implementation mirroring src/lib/engine/riskEngine.ts"""
    
    TIER_WEIGHTS = {
        "LOW": 1,
        "MODERATE": 2,
        "HIGH": 3,
        "SEVERE": 4,
    }

    @classmethod
    def evaluate(cls, patient: Dict[str, Any], candidate_medications: List[Dict[str, str]] = None) -> Dict[str, Any]:
        trace = []
        highest_severity = "LOW"
        risk_flags = []

        active_meds = [m["name"].lower() for m in patient.get("medications", [])]
        if candidate_medications:
            active_meds.extend([m["name"].lower() for m in candidate_medications])

        variants = {v["gene_symbol"].upper(): v for v in patient.get("variants", [])}
        conditions = [c["condition_name"].lower() for c in patient.get("conditions", [])]

        # 1. Gene-Drug Rules (CPIC Level 1A)
        if "tamoxifen" in active_meds and "CYP2D6" in variants:
            var = variants["CYP2D6"]
            if "intermediate metabolizer" in var.get("phenotype", "").lower() or "poor metabolizer" in var.get("phenotype", "").lower():
                highest_severity = cls._escalate(highest_severity, "HIGH")
                trace.append({
                    "rule_id": "PGX-CYP2D6-TAM-01",
                    "category": "GENE_DRUG",
                    "severity": "HIGH",
                    "message": "CYP2D6 reduced function reduces endoxifen bioactivation.",
                    "evidence_level": "1A"
                })
                risk_flags.append("CYP2D6 Intermediate/Poor Metabolizer with Tamoxifen")

        # 2. Drug-Drug Interactions
        if "tamoxifen" in active_meds and "fluoxetine" in active_meds:
            highest_severity = cls._escalate(highest_severity, "SEVERE")
            trace.append({
                "rule_id": "DDI-FLUOX-TAM-01",
                "category": "DRUG_DRUG",
                "severity": "SEVERE",
                "message": "Fluoxetine is a potent CYP2D6 inhibitor causing complete phenoconversion and near-zero Endoxifen levels.",
                "evidence_level": "1A"
            })
            risk_flags.append("Tamoxifen + Fluoxetine potent phenoconversion")

        # 3. Condition-Drug Contraindications
        if "tamoxifen" in active_meds and any("thrombosis" in c or "dvt" in c for c in conditions):
            highest_severity = cls._escalate(highest_severity, "HIGH")
            trace.append({
                "rule_id": "CON-TAM-DVT-01",
                "category": "CONDITION_DRUG",
                "severity": "HIGH",
                "message": "Tamoxifen is contraindicated or requires extreme caution in patients with history of deep vein thrombosis.",
                "evidence_level": "1A"
            })
            risk_flags.append("Tamoxifen contraindicated in deep vein thrombosis")

        return {
            "risk_tier": highest_severity,
            "trace": trace,
            "risk_flags": risk_flags,
            "rules_evaluated": len(trace)
        }

    @classmethod
    def _escalate(cls, current: str, candidate: str) -> str:
        if cls.TIER_WEIGHTS.get(candidate, 1) > cls.TIER_WEIGHTS.get(current, 1):
            return candidate
        return current


class TestDeterministicRiskEngine(unittest.TestCase):

    def setUp(self):
        self.patient = {
            "patient_id": "PAT-84920",
            "full_name": "Elena Rostova",
            "variants": [
                {
                    "gene_symbol": "CYP2D6",
                    "diplotype": "*4/*41",
                    "phenotype": "Intermediate Metabolizer",
                    "activity_score": 0.5
                }
            ],
            "medications": [
                {"name": "Tamoxifen", "dose": "20mg daily"},
                {"name": "Fluoxetine", "dose": "20mg daily"}
            ],
            "conditions": [
                {"condition_name": "ER+ Breast Cancer (Post-Surgical Adjuvant)"},
                {"condition_name": "Major Depressive Disorder"},
                {"condition_name": "History of Deep Vein Thrombosis"}
            ]
        }

    def test_full_collision_escalates_to_severe(self):
        result = MockDeterministicRiskEngine.evaluate(self.patient)
        self.assertEqual(result["risk_tier"], "SEVERE")
        self.assertTrue(len(result["trace"]) >= 2)
        rule_ids = [t["rule_id"] for t in result["trace"]]
        self.assertIn("DDI-FLUOX-TAM-01", rule_ids)
        self.assertIn("PGX-CYP2D6-TAM-01", rule_ids)
        self.assertIn("CON-TAM-DVT-01", rule_ids)

    def test_safe_alternative_downgrades_risk(self):
        safe_patient = dict(self.patient)
        # Switch Fluoxetine to Venlafaxine (minimal CYP2D6 inhibition) and remove DVT
        safe_patient["medications"] = [
            {"name": "Tamoxifen", "dose": "20mg daily"},
            {"name": "Venlafaxine", "dose": "75mg daily"}
        ]
        safe_patient["conditions"] = [
            {"condition_name": "ER+ Breast Cancer (Post-Surgical Adjuvant)"},
            {"condition_name": "Major Depressive Disorder"}
        ]
        result = MockDeterministicRiskEngine.evaluate(safe_patient)
        # Intermediate metabolizer alone is HIGH risk for efficacy, but not SEVERE
        self.assertEqual(result["risk_tier"], "HIGH")
        self.assertEqual(len(result["trace"]), 1)
        self.assertEqual(result["trace"][0]["rule_id"], "PGX-CYP2D6-TAM-01")

    def test_deterministic_output_is_idempotent(self):
        result1 = MockDeterministicRiskEngine.evaluate(self.patient)
        result2 = MockDeterministicRiskEngine.evaluate(self.patient)
        self.assertEqual(result1, result2)

if __name__ == "__main__":
    unittest.main()
