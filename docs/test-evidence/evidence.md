# CURX Test Evidence — Auditable Evidence Layer & ClinPGx Live API Integration

**Source Authorities**:
- Clinical Pharmacogenetics Implementation Consortium (CPIC)
- ClinPGx Live API (`https://api.clinpgx.org/v1`)
- PharmGKB Knowledgebase
- US FDA Structured Product Labels (openFDA)

---

## 1. ClinPGx Live API Authentication & Rate Limit Investigation

| Investigation Checkpoint | Verified Finding | Technical Reference |
| :--- | :--- | :--- |
| **API Hostname** | `https://api.clinpgx.org/v1` | Official endpoint replacing deprecated `api.pharmgkb.org` |
| **Authentication Protocol** | **Open Public REST Service** (CC BY-SA 4.0) | Standard public queries for genes, chemicals, and guidelines require **no private user API key**. Optional Bearer tokens / `X-API-Key` headers are supported. |
| **Official Published Rate Limit** | **2.0 requests per second** | Published in official documentation: *"please limit requests to 2 per second. Too frequent requests will result in a 429 response."* |
| **Transient Retry Strategy** | Exponential backoff (2^attempt) | Automatically retries HTTP 429 and 5xx errors with interval throttling. |

---

## 2. Live Synchronization Execution & Supabase Persistence

**Command Executed**: `python backend/ingestion/sync_clinpgx.py`  
**API Endpoint Tested**: `GET /api/pipeline/clinpgx`  

### Live Sync Results:
- **Mapped Genes**: `CYP2D6` (`PA128`), `CYP2C19` (`PA124`), `CYP2C9` (`PA126`), `VKORC1` (`PA133787052`), `SLCO1B1` (`PA134865839`), `DPYD` (`PA145`), `TPMT` (`PA356`), `UGT1A1` (`PA420`), `HLA-B` (`PA35056`), `CYP4F2` (`PA27121`).
- **Mapped Drugs**: `tamoxifen` (`PA451581`), `warfarin` (`PA451906`), `clopidogrel` (`PA449053`), `atorvastatin` (`PA448500`), `fluorouracil` (`PA128406956`), `codeine` (`PA449088`), `abacavir` (`PA448004`), `simvastatin` (`PA451363`), `sertraline` (`PA451333`), `citalopram` (`PA449015`), `ibuprofen` (`PA449957`), `omeprazole` (`PA450704`).
- **Guidelines Retrieved**: **48 live CPIC guideline annotations** fetched directly from `https://api.clinpgx.org/v1/data/guidelineAnnotation`.
- **Supabase Upsert**: 48 records inserted/updated in `public.evidence_sources` with full provenance metadata.
- **Content Hash**: `fa22d644504c9125334a725bdefea22a4f79ac4a0eabb62c428b194a48ab7e17`.
- **Status Endpoint Output (`/api/pipeline/clinpgx`)**:
  ```json
  {
    "status": "LIVE_CONNECTED",
    "authMode": "Open Public REST Access (CC BY-SA 4.0)",
    "apiBaseUrl": "https://api.clinpgx.org",
    "evidenceRecordCount": 49,
    "lastSync": {
      "datasetName": "ClinPGx Live Sync",
      "rowsSeen": 48,
      "rowsInserted": 48,
      "errors": []
    }
  }
  ```

---

## 3. Verified Status Summary

| Checkpoint | Requirement | Actual Status |
| :--- | :--- | :--- |
| **API Connectivity** | `https://api.clinpgx.org/v1` live query | ✅ **VERIFIED WORKING** |
| **Rate Limiter** | 2.0 req/sec interval throttle | ✅ **VERIFIED WORKING** |
| **Evidence Provenance** | `source: ClinPGx Live API`, `retrieved_at` | ✅ **VERIFIED WORKING** |
| **Supabase Persistence** | `public.evidence_sources` | ✅ **VERIFIED WORKING (48 records)** |
| **Unit Test Suite** | `backend/tests/test_clinpgx_sync.py` | ✅ **VERIFIED WORKING (13/13 passed)** |
| **Overall ClinPGx Status** | Live Sync Integration | ✅ **LIVE CONNECTED** |
