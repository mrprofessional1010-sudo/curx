# CURX Test Evidence — Build and Automated Tests

## 1. Environment Verification
- **Node.js**: v24.12.0
- **npm**: 11.6.2
- **Python**: 3.13.7
- **Next.js**: 14.2.35
- **TypeScript**: 5.x

---

## 2. TypeScript Compilation Check
- **Command**: `npx tsc --noEmit`
- **Exit Code**: `0`
- **Output**: Clean exit with 0 errors across client, server, engines, and API routes.
- **Status**: ✅ **VERIFIED WORKING**

---

## 3. Python Backend Test Suite
- **Command**: `python -m unittest discover -s backend/tests -p "test_*.py" -v`
- **Exit Code**: `0`
- **Output**:
```text
test_deterministic_output_is_idempotent (test_risk_engine.TestDeterministicRiskEngine.test_deterministic_output_is_idempotent) ... ok
test_full_collision_escalates_to_severe (test_risk_engine.TestDeterministicRiskEngine.test_full_collision_escalates_to_severe) ... ok
test_safe_alternative_downgrades_risk (test_risk_engine.TestDeterministicRiskEngine.test_safe_alternative_downgrades_risk) ... ok
test_deterministic_scoring_qualitative_labels (test_symptom_engine.TestDeterministicSymptomEngine.test_deterministic_scoring_qualitative_labels) ... ok
test_emergency_override_triggered_for_leg_swelling (test_symptom_engine.TestDeterministicSymptomEngine.test_emergency_override_triggered_for_leg_swelling) ... ok
test_next_discriminatory_question_selected (test_symptom_engine.TestDeterministicSymptomEngine.test_next_discriminatory_question_selected) ... ok

----------------------------------------------------------------------
Ran 6 tests in 0.000s

OK
```
- **Status**: ✅ **VERIFIED WORKING**

---

## 4. Production Next.js Bundle Compilation
- **Command**: `npm run build`
- **Exit Code**: `0`
- **Generated Routes (14/14 Total)**:
  - `○ /` (29.2 kB / 196 kB)
  - `○ /_not-found` (873 B / 88.2 kB)
  - `ƒ /api/care/nearby`
  - `ƒ /api/evidence`
  - `ƒ /api/patient`
  - `ƒ /api/pipeline/status`
  - `ƒ /api/risk/evaluate`
  - `ƒ /api/symptoms/adaptive`
  - `ƒ /auth/callback`
  - `○ /login` (144 B / 177 kB)
  - `○ /reset-password` (2.81 kB / 169 kB)
  - `○ /signup` (144 B / 177 kB)
- **Status**: ✅ **VERIFIED WORKING**
