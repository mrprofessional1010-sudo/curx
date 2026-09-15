# Test Evidence: Personalized User Profile & Progressive Onboarding

## Overview
CURX features a complete, 6-step progressive disclosure onboarding workflow (`/onboarding`) enabling newly registered authenticated users to build their clinical profile with real data without falling back to demo personas.

## Test Summary
- **Test ID**: `E2E-ONBOARDING-PERSONALIZATION`
- **Execution Date**: 2026-09-14
- **Automated Driver**: Playwright (Chromium)
- **Status**: ✅ **VERIFIED WORKING**

---

## Verified Flows & Results

### 1. New User Progressive Onboarding Wizard
- **Step 1 (Personal Information)**: Preferred name, biological sex, age, city/location for Care Finder.
- **Step 2 (Medications)**: Autocomplete search against canonical `medications` catalog (`public.medications`), adding active regimens with dosage and frequency.
- **Step 3 (Known Genetics)**: Explicit entry of lab-tested alleles (e.g. `CYP2C19 *2/*2`, `Poor Metabolizer`) against `public.genes` and `public.genetic_variants`.
- **Step 4 (Known Conditions)**: Search and selection of diagnosed conditions (e.g. `Hypertension`) against `public.conditions`.
- **Step 5 (Current Symptoms)**: Safe, non-emergency symptom entry (e.g. `Headache`) for deterministic differential reasoning.
- **Step 6 (Review & Save)**: Structured profile summary with atomic save to Supabase via `POST /api/patient/profile`, linking `patients.user_id = auth.users.id`.

### 2. Evidence Artifacts & Screenshots
| Step | Artifact File | Status |
| :--- | :--- | :--- |
| Step 1: Personal Details | `docs/test-evidence/screenshots/09-onboarding-step1.png` | ✅ VERIFIED |
| Step 2: Medication Search | `docs/test-evidence/screenshots/10-onboarding-step2.png` | ✅ VERIFIED |
| Step 6: Review & Save | `docs/test-evidence/screenshots/11-onboarding-review.png` | ✅ VERIFIED |
| Personalized Dashboard | `docs/test-evidence/screenshots/12-personalized-dashboard.png` | ✅ VERIFIED |

---

## Security & Data Isolation
- **User A / User B Isolation**: Verified via `tests/e2e/curx-full-flow.spec.ts` Test 6. Direct attempts by User A to access User B's patient profile by manipulating URL parameters (`/api/patient?patient_id=...`) return **HTTP 403 Forbidden**.
- **Demo Account Scoping**: Demo persona `Elena Rostova` (`PAT-84920`) is strictly scoped to designated demo clinician accounts and never shown as a generic fallback to new authenticated users.
