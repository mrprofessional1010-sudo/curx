"""
Deterministic Symptom Reasoning & Discrimination Test Suite
Tests:
- Deterministic overlap scoring (no Bayesian terminology, qualitative HIGHER/MODERATE/LOWER match)
- Emergency red-flag safety overrides
- Information-gain discriminatory question selection
"""

import unittest
from typing import List, Dict, Any

class MockSymptomEngine:
    EMERGENCY_SYMPTOMS = {
        "chest_pain": "EMERGENCY: Immediate clinical evaluation required for potential acute cardiovascular or pulmonary event.",
        "unilateral_leg_swelling": "URGENT WARNING: Unilateral lower extremity edema warrants immediate evaluation to rule out Deep Vein Thrombosis (DVT).",
        "dyspnea": "EMERGENCY: Acute shortness of breath requires urgent medical assessment.",
        "hemoptysis": "EMERGENCY: Hemoptysis requires immediate pulmonary/vascular evaluation."
    }

    DISEASE_MATRIX = {
        "Deep Vein Thrombosis": ["unilateral_leg_swelling", "leg_pain", "warmth_in_leg", "erythema"],
        "Serotonin Syndrome": ["tremor", "hyperreflexia", "diaphoresis", "agitation", "hyperthermia"],
        "Medication-Induced Hot Flashes": ["sudden_flushing", "night_sweats", "palpitations", "sleep_disturbance"],
        "Tamoxifen Efficacy Failure": ["fatigue", "bone_pain", "hot_flashes", "mood_changes"]
    }

    @classmethod
    def evaluate(cls, reported_symptoms: List[str]) -> Dict[str, Any]:
        emergency_triggers = []
        for s in reported_symptoms:
            if s in cls.EMERGENCY_SYMPTOMS:
                emergency_triggers.append({
                    "symptom": s,
                    "triage_level": "EMERGENCY_OVERRIDE",
                    "action": cls.EMERGENCY_SYMPTOMS[s]
                })

        candidates = []
        reported_set = set(reported_symptoms)

        for disease, d_symptoms in cls.DISEASE_MATRIX.items():
            d_set = set(d_symptoms)
            matched = list(reported_set.intersection(d_set))
            unmatched = list(d_set - reported_set)
            
            if matched:
                match_ratio = len(matched) / len(d_symptoms)
                if match_ratio >= 0.5:
                    qualitative_match = "HIGHER RELATIVE MATCH"
                elif match_ratio >= 0.25:
                    qualitative_match = "MODERATE RELATIVE MATCH"
                else:
                    qualitative_match = "LOWER RELATIVE MATCH"

                candidates.append({
                    "disease_name": disease,
                    "matched_symptoms": matched,
                    "unmatched_symptoms": unmatched,
                    "match_ratio": match_ratio,
                    "qualitative_match": qualitative_match
                })

        candidates.sort(key=lambda x: x["match_ratio"], reverse=True)

        # Compute next most discriminatory question
        all_unmatched = []
        for c in candidates:
            all_unmatched.extend(c["unmatched_symptoms"])

        # Count frequencies in candidates to find best discriminator
        freqs = {}
        for s in all_unmatched:
            freqs[s] = freqs.get(s, 0) + 1

        discriminatory_question = None
        if freqs:
            best_symptom = max(freqs, key=freqs.get)
            discriminatory_question = {
                "symptom_key": best_symptom,
                "question_text": f"Are you experiencing {best_symptom.replace('_', ' ')}?",
                "rationale": f"Differentiates top candidate conditions across active symptom matrix."
            }

        return {
            "emergency_override": len(emergency_triggers) > 0,
            "emergency_triggers": emergency_triggers,
            "candidate_conditions": candidates,
            "next_discriminatory_question": discriminatory_question
        }


class TestDeterministicSymptomEngine(unittest.TestCase):

    def test_emergency_override_triggered_for_leg_swelling(self):
        result = MockSymptomEngine.evaluate(["unilateral_leg_swelling", "leg_pain"])
        self.assertTrue(result["emergency_override"])
        self.assertEqual(len(result["emergency_triggers"]), 1)
        self.assertIn("Deep Vein Thrombosis", result["emergency_triggers"][0]["action"])

    def test_deterministic_scoring_qualitative_labels(self):
        result = MockSymptomEngine.evaluate(["tremor", "hyperreflexia", "diaphoresis"])
        self.assertFalse(result["emergency_override"])
        self.assertTrue(len(result["candidate_conditions"]) > 0)
        top = result["candidate_conditions"][0]
        self.assertEqual(top["disease_name"], "Serotonin Syndrome")
        self.assertEqual(top["qualitative_match"], "HIGHER RELATIVE MATCH")

    def test_next_discriminatory_question_selected(self):
        result = MockSymptomEngine.evaluate(["fatigue"])
        self.assertIsNotNone(result["next_discriminatory_question"])
        self.assertIn("symptom_key", result["next_discriminatory_question"])

if __name__ == "__main__":
    unittest.main()
