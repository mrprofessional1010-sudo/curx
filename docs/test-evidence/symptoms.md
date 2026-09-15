# Test Evidence: Symptoms Tab & Deterministic Reasoning Matrix

## Verification Details
- **Test ID**: `E2E-SYMPTOMS-PERSONALIZATION`
- **Execution Date**: 2026-09-14
- **Automated Runner**: Playwright (Chromium)
- **Status**: ✅ **VERIFIED WORKING**

## Core Features Verified
1. **User Reported Symptoms**:
   - Initialized from `public.patient_symptoms` for the active user profile (e.g. non-emergency symptom `Headache`).
2. **Deterministic Differential Reasoning**:
   - Qualitative ranking categories (`HIGHER RELATIVE MATCH`, `MODERATE RELATIVE MATCH`) without false-precision percentages.
3. **Emergency Symptom Safety Override**:
   - Verified in automated test `curx-full-flow.spec.ts:269`. Reporting critical acute symptoms (e.g. `Chest pain`) immediately triggers `isEmergency = true`, halts automated questioning, and outputs urgent-care instructions.

## Evidence Artifacts
- Screenshot: `docs/test-evidence/screenshots/04-symptoms.png`
