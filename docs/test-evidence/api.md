# CURX Test Evidence — API Endpoints Suite

**Base URL**: `http://localhost:3000`  
**Automated Runner**: `backend/tests/test_api_endpoints.mjs` & `backend/tests/test_auth_dashboard_flow.mjs`  
**JSON Output**: `docs/test-evidence/api/endpoints_test_result.json`

---

## 1. Verified Endpoint Test Matrix

| Endpoint | Method | Expected Response | Actual Response | HTTP Status | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/pipeline/status` | `GET` | Health metrics & live table counts | `status: HEALTHY`, live counts returned | `200 OK` | ✅ VERIFIED |
| `/api/pipeline/clinpgx` | `GET` | Safe ClinPGx sync status & audit | `isConfigured`, `apiBaseUrl`, `evidenceRecordCount` | `200 OK` | ✅ VERIFIED |
| `/api/patient` | `GET` | Multi-axis demo/authenticated patient profile | Elena Rostova (`PAT-84920`), 4 meds, 3 variants, 3 conditions | `200 OK` | ✅ VERIFIED |
| `/api/evidence` | `GET` | Guideline citation for gene/drug query | CPIC Level 1A Tamoxifen Guideline | `200 OK` | ✅ VERIFIED |
| `/api/care/nearby` | `GET` | Nearby facilities with `{ x, y }` coordinates | 3 to 15 facilities, `all_have_coords: true` | `200 OK` | ✅ VERIFIED |
| `/api/risk/evaluate` | `POST` | Deterministic risk tier and structured trace | `riskTier: SEVERE` for multi-axis collision | `200 OK` | ✅ VERIFIED |
| `/api/symptoms/adaptive` | `POST` | Qualitative candidates + discriminating question | Top: *Serotonin Syndrome*, next question returned | `200 OK` | ✅ VERIFIED |
| `/dashboard` (Unauthenticated) | `GET` | Redirect to login | Redirect location: `/login?redirect=/dashboard` | `307 Temporary Redirect` | ✅ VERIFIED |
| `/login` (Unauthenticated) | `GET` | Render login form | Login page HTML returned | `200 OK` | ✅ VERIFIED |
| `/signup` (Unauthenticated) | `GET` | Render signup form | Signup page HTML returned | `200 OK` | ✅ VERIFIED |
