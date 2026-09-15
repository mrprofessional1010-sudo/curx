# CURX Test Evidence — Playwright Automated Browser Automation

**Verification Date**: September 14, 2026  
**Playwright Version**: `1.63.0` (`@playwright/test`)  
**Browser Binary**: Chromium `153.0.8010.12` (Chrome for Testing build v1243)  
**Execution Environment**: Windows x64 / Node.js v24.12.0  
**Test Suite Path**: [`tests/e2e/curx-full-flow.spec.ts`](file:///c:/Users/Sunil/Downloads/curx%20ai/tests/e2e/curx-full-flow.spec.ts)  
**Status**: ✅ **VERIFIED WORKING (4 passed / 0 failed / 0 skipped in 46.2s)**

---

## 1. Root Cause Analysis & Resolution of Azure CDN 404

### Previous Failure
Previously, running automated browser driver installations caused an Azure CDN 404 error:
```
Microsoft Azure CDN returned 404 while trying to download:
playwright-1.57.0-win32_x64.zip
```

### Root Cause
1. An unpinned/deprecated Playwright package version referenced obsolete Microsoft Azure blob storage URLs that have been retired by the Playwright team in favor of Chrome for Testing (CFT) endpoints.
2. The browser cache directory in `%LOCALAPPDATA%\ms-playwright` contained mismatched references to legacy browser builds.

### Permanent Resolution
1. Added official `@playwright/test` (`^1.50+`) to `devDependencies` in [`package.json`](file:///c:/Users/Sunil/Downloads/curx%20ai/package.json).
2. Installed official Chrome for Testing Chromium browser binary directly via `npx playwright install chromium` from official distribution endpoint `https://cdn.playwright.dev/builds/cft/153.0.8010.12/win64/chrome-win64.zip`.
3. Configured [`playwright.config.ts`](file:///c:/Users/Sunil/Downloads/curx%20ai/playwright.config.ts) to detect and use the installed Chromium engine with zero third-party/unofficial dependencies.

---

## 2. Test Execution Matrix

| Test Case | Scope & User Flow | Expected Result | Actual Result | Status | Evidence Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TEST 1: Landing Page & Map** | `GET /` — Hero title, brand, Care Continuity section | 200 OK, title matching `/CURX/i`, heading visible | Renders in 6.1s, no uncaught JS exceptions | ✅ **PASSED** | Live browser DOM |
| **TEST 2: Route Protection** | `GET /dashboard` unauthenticated | HTTP 307 redirect to `/login?redirect=%2Fdashboard` | Intercepted by middleware, login inputs visible | ✅ **PASSED** | Route transition |
| **TEST 3: Signup Screen** | `GET /signup` — Form structure & strength meter | Full Name, Email, Password inputs rendered & interactive | Clean form DOM hydration in 1.9s | ✅ **PASSED** | Form validation |
| **TEST 4: End-to-End User Journey** | Complete Clinician journey: Login → Dashboard → Real Data → Tabs → Persistence → Logout | Live Supabase session established; real patient data hydrated; all 7 tabs functional; no map `TypeError`; session persisted across reload; logout returns to `/login` | 100% completed in 33.2s; 8 full screenshots captured | ✅ **PASSED** | [`screenshots/`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/) |

---

## 3. Verified Tabs & Screenshot Evidence

All screenshots captured directly during the live Playwright execution:

| Step / Tab | Verified Component | Key Assertions Verified | Evidence File |
| :--- | :--- | :--- | :--- |
| **01. Overview** | Elena Rostova (`PAT-84920`) | Multi-axis collision banner, vital metrics, real Supabase patient data | [`01-overview.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/01-overview.png) |
| **02. Medications** | Active Regimen & Candidate Simulation | Warfarin, Ibuprofen, Omeprazole, Clopidogrel loaded; candidate Venlafaxine simulated | [`02-medications.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/02-medications.png) |
| **03. Genetics** | Pharmacogenomics & Star Alleles | `CYP2C9 *1/*3`, `VKORC1 G/A`, `CYP2C19 *1/*2`, intermediate metabolizer phenotypes | [`03-genetics.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/03-genetics.png) |
| **04. Symptoms** | Deterministic Symptom Differential | 5 reported symptoms, qualitative ranking, adaptive discriminating questions | [`04-symptoms.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/04-symptoms.png) |
| **05. Risk Engine** | Safety Engine & Collision Trace | Multi-axis collision evaluation, algorithmic rules, zero LLM hallucination | [`05-risk-engine.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/05-risk-engine.png) |
| **06. Evidence** | Auditable Guidelines | CPIC Level 1A guidelines, ClinPGx annotations, literature recommendations | [`06-evidence.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/06-evidence.png) |
| **07. Care Finder** | OpenStreetMap Facility Locator | Medical centers rendered, spatial coordinates normalized without `TypeError` | [`07-care-finder.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/07-care-finder.png) |
| **08. Logout** | Session Destruction & Redirect | `Sign out` button clears cookies and redirects browser back to `/login` | [`08-logout.png`](file:///c:/Users/Sunil/Downloads/curx%20ai/docs/test-evidence/screenshots/08-logout.png) |

---

## 4. Playwright Test Suite CLI Log

```bash
$ npx playwright test

Running 4 tests using 1 worker

  ok 1 [chromium] › tests\e2e\curx-full-flow.spec.ts:16:7 › CURX Clinical Intelligence — End-to-End Test Suite › 1. Landing Page Navigation & Visual Care Continuity (6.1s)
  ok 2 [chromium] › tests\e2e\curx-full-flow.spec.ts:32:7 › CURX Clinical Intelligence — End-to-End Test Suite › 2. Unauthenticated Protected Route Guard (4.0s)
  ok 3 [chromium] › tests\e2e\curx-full-flow.spec.ts:42:7 › CURX Clinical Intelligence — End-to-End Test Suite › 3. Signup Screen Verification (1.9s)
  ok 4 [chromium] › tests\e2e\curx-full-flow.spec.ts:49:7 › CURX Clinical Intelligence — End-to-End Test Suite › 4. Complete Clinician Authenticated Journey, Real Data & Tab Verification (33.2s)

  4 passed (46.2s)
```
