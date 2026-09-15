# CURX
## COMPLETE BACKEND ARCHITECTURE & TECHNICAL DOCUMENTATION
### End-to-End System Architecture, Data Pipeline, Clinical Intelligence, AI Layer, Security & API Reference

**Project Name**: CURX — Clinical Risk Intelligence Platform  
**Documentation Version**: 1.0.0 (Production / Demo-Verified)  
**Generation Date**: September 14, 2026  
**Implementation Status**: 100% Implemented & Verified on Supabase / Next.js / NVIDIA NIM  
**Foundation**: Based on the implemented CURX codebase (`c:\Users\Sunil\Downloads\curx ai`)

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Complete Repository & Backend File Map](#4-complete-repository--backend-file-map)
5. [Request & Response Lifecycle](#5-request--response-lifecycle)
6. [Authentication Architecture](#6-authentication-architecture)
7. [User & Patient Data Model](#7-user--patient-data-model)
8. [Complete Supabase PostgreSQL Database Architecture](#8-complete-supabase-postgresql-database-architecture)
9. [Dataset Architecture & Authority Reference](#9-dataset-architecture--authority-reference)
10. [Data Ingestion Pipeline & ETL Architecture](#10-data-ingestion-pipeline--etl-architecture)
11. [Normalization & Entity Resolution](#11-normalization--entity-resolution)
12. [Deterministic Risk Engine (Plane 01)](#12-deterministic-risk-engine-plane-01)
13. [Deterministic Adaptive Symptom Engine (Plane 02)](#13-deterministic-adaptive-symptom-engine-plane-02)
14. [Emergency Safety System & Override Protocols](#14-emergency-safety-system--override-protocols)
15. [Evidence Layer & Provenance Tracking](#15-evidence-layer--provenance-tracking)
16. [Live ClinPGx REST API Integration](#16-live-clinpgx-rest-api-integration)
17. [OpenFDA Structured Product Label Integration](#17-openfda-structured-product-label-integration)
18. [HGNC & RxNorm Standardization Infrastructure](#18-hgnc--rxnorm-standardization-infrastructure)
19. [Care Finder Architecture (OpenStreetMap / Overpass / Nominatim)](#19-care-finder-architecture-openstreetmap--overpass--nominatim)
20. [AI Assistant Architecture (NVIDIA NIM / DeepSeek-V4-Flash)](#20-ai-assistant-architecture-nvidia-nim--deepseek-v4-flash)
21. [AI Chat Database & State Management](#21-ai-chat-database--state-management)
22. [Comprehensive Security & Authorization Architecture](#22-comprehensive-security--authorization-architecture)
23. [Complete API Reference & Endpoint Catalog](#23-complete-api-reference--endpoint-catalog)
24. [Detailed Request Sequence Diagrams](#24-detailed-request-sequence-diagrams)
25. [Complete Patient Data Flow Trace](#25-complete-patient-data-flow-trace)
26. [Frontend ↔ Backend Integration Contract](#26-frontend--backend-integration-contract)
27. [Error Handling & Fault Tolerance Matrix](#27-error-handling--fault-tolerance-matrix)
28. [Observability, Auditing & Ingestion Logs](#28-observability-auditing--ingestion-logs)
29. [Testing Architecture & Automated Verification Suite](#29-testing-architecture--automated-verification-suite)
30. [Current Verification Status Matrix](#30-current-verification-status-matrix)
31. [Deployment Architecture](#31-deployment-architecture)
32. [Environment Configuration Reference](#32-environment-configuration-reference)
33. [Performance Architecture & Scalability](#33-performance-architecture--scalability)
34. [Data Privacy, Isolation & Compliance Boundaries](#34-data-privacy-isolation--compliance-boundaries)
35. [Limitations, Invariants & Non-Goals](#35-limitations-invariants--non-goals)
36. [Architectural Design Decisions (Why & Tradeoffs)](#36-architectural-design-decisions-why--tradeoffs)
37. [Complete End-to-End Scenarios (10 Walkthroughs)](#37-complete-end-to-end-scenarios-10-walkthroughs)
38. [Glossary of Clinical & Technical Terminology](#38-glossary-of-clinical--technical-terminology)
39. [Presentation Summary ("CURX Backend in 2 Minutes")](#39-presentation-summary-curx-backend-in-2-minutes)
40. [Demo Script ("How I Explain the Backend to Judges")](#40-demo-script-how-i-explain-the-backend-to-judges)
41. [Documentation Self-Audit](#41-documentation-self-audit)
42. [One-Page Backend Architecture Summary](#42-one-page-backend-architecture-summary)

---

## 1. EXECUTIVE SUMMARY

CURX is a multi-axis clinical decision support and risk intelligence platform designed to eliminate adverse drug reactions (ADRs), identify pharmacogenomic (PGx) metabolic failures, evaluate drug–drug and condition–drug contraindications, and provide deterministic symptom triage.

In modern healthcare, adverse drug reactions are among the leading causes of preventable morbidity and hospital readmissions. Traditional electronic health record (EHR) alert systems suffer from severe alert fatigue, non-standardized genetic data integration, and opaque black-box recommendations. CURX solves this problem by decoupling clinical computation into two distinct architectural planes:

1. **Plane 01 (Deterministic Safety Plane)**: A zero-hallucination, rule-driven evaluation engine that processes structured patient profiles (active medications, genetic star alleles, diagnosed comorbidities, and reported symptoms) against curated knowledge bases from CPIC, ClinPGx, RxNorm, HGNC, and the US FDA.
2. **Plane 02 (Conversational Explanation Layer)**: An intent-aware AI assistant powered by NVIDIA NIM hosting DeepSeek-V4-Flash (`deepseek-ai/deepseek-v4-flash-0731`) that explains deterministic findings in accessible, clinically grounded language without ever calculating, overriding, or speculating on risk.

### Backend Responsibilities & Data Journey
- **Data Ingestion & Normalization**: External raw registries (2,036 HGNC genes, 1,500 RxNorm drugs, 42 conditions, 132 symptoms, 318 matrix linkages, 57 CPIC/ClinPGx guidelines, and 50 OpenFDA Structured Product Labels) are normalized, deduplicated, and persisted to Supabase PostgreSQL with SHA-256 cryptographic provenance auditing.
- **Identity & Authorization**: User authentication is mediated via Supabase Auth GoTrue with `@supabase/ssr` encrypted cookie tokens. Server middleware and PostgreSQL Row Level Security (RLS) isolate patient profiles (`auth.users.id -> patients.user_id`).
- **Clinical Evaluation**: When a patient profile is loaded or modified, Next.js server route handlers execute TypeScript engines in `< 10ms`.
- **Live Guidelines**: Pharmacogenomic annotations synchronize directly from the official ClinPGx REST API (`https://api.clinpgx.org/v1`) using a 2.0 req/sec token-bucket rate limiter.
- **Care Continuity**: Nearby emergency rooms, clinics, and pharmacies are queried live from OpenStreetMap (Overpass API) and normalized into 2D radar coordinates for patient navigation.

---

## 2. HIGH-LEVEL SYSTEM ARCHITECTURE

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  CLIENT / WEB BROWSER                  │
                                  │   (Next.js 14 / React / Tailwind / Framer Motion)       │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │ HTTPS / JSON / Cookies
                                                              ▼
                                  ┌────────────────────────────────────────────────────────┐
                                  │                 NEXT.JS SSR & API LAYER                │
                                  │   (src/middleware.ts + src/app/api/* route handlers)   │
                                  └───────────────┬────────────────────────┬───────────────┘
                                                  │                        │
                      ┌───────────────────────────┴─────────┐              │
                      │ Authenticated Session & Authorization│              │
                      ▼                                     ▼              ▼
       ┌──────────────────────────────┐       ┌────────────────────────────────────────────┐
       │     SUPABASE GoTrue AUTH     │       │         DETERMINISTIC CLINICAL PLANES      │
       │ (Session Cookies, JWT, RLS)  │       │                                            │
       └──────────────┬───────────────┘       │  [PLANE 01: RISK ENGINE]                   │
                      │                       │  - Gene-Drug (CPIC Level 1A)               │
                      ▼                       │  - Drug-Drug (DDI Collisions)              │
       ┌──────────────────────────────┐       │  - Condition-Drug (Black Box Warnings)     │
       │   SUPABASE POSTGRESQL (19T)  │       │                                            │
       │  - patients / medications    │       │  [PLANE 02: SYMPTOM ENGINE]                │
       │  - variants / conditions     │       │  - Bipartite Matrix (42 Cond / 132 Sym)    │
       │  - evidence / chat_messages  │       │  - Information Gain Adaptive Questioning   │
       │  - data_ingestion_runs       │       │  - Emergency Safety Override               │
       └──────────────▲───────────────┘       └──────────────────────┬─────────────────────┘
                      │                                              │
                      │ Structured Records                           │ Structured Trace
                      │                                              ▼
       ┌──────────────┴───────────────┐       ┌────────────────────────────────────────────┐
       │     INGESTION & SYNC (ETL)   │       │           AI EXPLANATION LAYER             │
       │  - sync_clinpgx.py (Live)    │       │  (NVIDIA NIM: DeepSeek-V4-Flash)           │
       │  - ingest_hgnc.py (Genes)    │◄──────┤  - Context Retriever (Patient + Evidence)  │
       │  - ingest_medications.py     │       │  - Strict Guardrails & Safety Filter       │
       │  - ingest_openfda.py         │       │  - Zero Risk Calculation (Explanation Only)│
       └──────────────▲───────────────┘       └──────────────────────┬─────────────────────┘
                      │                                              │
                      │ External Sync                                │ Live OSM Query
                      │                                              ▼
       ┌──────────────┴───────────────┐       ┌────────────────────────────────────────────┐
       │     EXTERNAL DATA AUTHORITIES│       │        CARE FINDER GEOLOCATION (OSM)       │
       │  - ClinPGx REST API (v1)     │       │  - Nominatim Geocoding Client              │
       │  - CPIC / PharmGKB           │       │  - Overpass API Infrastructure Query       │
       │  - openFDA Product Labels    │       │  - 2D Percentage Coordinate Normalizer     │
       │  - HGNC / RxNorm             │       │                                            │
       └──────────────────────────────┘       └────────────────────────────────────────────┘
```

### Component Details
1. **Next.js SSR & API Layer** (`src/middleware.ts`, `src/app/api/`): Validates session cookies on every request, enforces route guards, and routes REST payloads.
2. **Supabase PostgreSQL & Auth** (`@supabase/ssr`, `ygkqfmzvyhllalwlvtjg.supabase.co`): Relational data store holding 19 tables, 5,190 records, and RLS policies.
3. **Plane 01 Risk Engine** (`src/lib/engine/riskEngine.ts`): Evaluates multi-axis collisions using immutable clinical matrices.
4. **Plane 02 Symptom Engine** (`src/lib/engine/symptomEngine.ts`): Scores disease matches and selects the single most discriminating question using Shannon information-gain principles.
5. **AI Assistant Layer** (`src/lib/ai/`): Server-side integration to NVIDIA NIM DeepSeek-V4-Flash endpoint for clinical decision explanation.
6. **Care Finder Engine** (`src/lib/engine/careFinder.ts`): Live spatial healthcare infrastructure discovery via OpenStreetMap.

---

## 3. TECHNOLOGY STACK

| Layer | Technology | Exact Version | Purpose in CURX | Implemented Location |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | `14.2.23` | Server-rendered React framework, SSR middleware, API routes | `src/app/` |
| **UI Library** | React | `18.3.1` | Component lifecycle, state hydration, interactive UI | `src/components/` |
| **Type System** | TypeScript | `5.7.3` | End-to-end type safety, strict interface models | `tsconfig.json` |
| **Styling & CSS** | Tailwind CSS / PostCSS | `3.4.17` | Utility-first CSS, custom dark clinical theme | `tailwind.config.ts` |
| **Motion & Graphics** | Framer Motion | `11.18.2` | Interactive sidebars, animated modals, radar radar blips | `src/components/` |
| **Icons** | Lucide React | `0.475.0` | Clinical icons (pills, dna, alert-triangle, shield) | `src/components/` |
| **Database & Auth** | Supabase JS & SSR | `^2.116.0` / `^0.12.7` | GoTrue Auth, PostgREST API client, cookie SSR handlers | `src/lib/supabase/` |
| **AI Inference** | NVIDIA NIM SDK / OpenAI | `^7.15.0` | Server-side connection to DeepSeek-V4-Flash model | `src/lib/ai/nvidia.ts` |
| **AI Model** | DeepSeek-V4-Flash | `deepseek-v4-flash-0731` | Clinical explanation and reasoning generation | NVIDIA NIM Endpoint |
| **Ingestion Runtime** | Python 3 | `3.10+` | Dataset ETL parsers, SHA-256 hashing, REST sync | `backend/ingestion/` |
| **Testing: Browser** | Playwright CFT | `1.63.0` | End-to-end automated browser test suite (9 test suites) | `tests/e2e/` |
| **Testing: Backend** | Python Unittest / Node | Built-in | Risk engine, symptom engine, AI chat, API unit tests | `backend/tests/` |
| **External APIs** | ClinPGx REST API | `v1` | Live CPIC pharmacogenomic guideline synchronization | `https://api.clinpgx.org/v1` |
| **External APIs** | OpenStreetMap / Overpass | QL 0.7 | Live hospital, clinic, and pharmacy geocoding | `https://overpass-api.de` |
| **External APIs** | openFDA API / Files | SPL v1 | US FDA Structured Product Label boxed warnings | `curx datasets/` |

---

## 4. COMPLETE REPOSITORY & BACKEND FILE MAP

```
curx-clinical-risk-intelligence/
├── backend/                                  # Python ETL Ingestion, Seeds, & Unit Tests
│   ├── ingestion/
│   │   ├── hashing.py                       # SHA-256 cryptographic file & record hashing
│   │   ├── ingest_condition_drugs.py        # Condition-Drug contraindication CSV parser
│   │   ├── ingest_cpic_clinpgx.py           # CPIC TSV & ClinPGx initial guideline loader
│   │   ├── ingest_drug_interactions.py      # Pairwise Drug-Drug Interaction parser
│   │   ├── ingest_hgnc.py                   # HGNC complete gene nomenclature parser (2,036 genes)
│   │   ├── ingest_medications.py            # RxNorm clinical formulation parser (1,500 meds)
│   │   ├── ingest_openfda.py                # OpenFDA Structured Product Label JSON extractor
│   │   ├── ingest_symptoms.py               # Disease-Symptom bipartite matrix parser
│   │   ├── run_pipeline.py                  # Master CLI orchestrator for all ETL routines
│   │   ├── seed_demo_patient.py             # Seeds demo persona (Elena Rostova / PAT-84920)
│   │   ├── supabase_client.py               # Python PostgREST HTTP client with auth headers
│   │   └── sync_clinpgx.py                  # Live ClinPGx API synchronizer (2.0 req/s rate limit)
│   ├── seed_data/
│   │   ├── condition_drug_rules.csv         # 21 curated clinical condition-drug contraindications
│   │   └── drug_drug_interactions.csv       # 21 curated pharmacokinetic & dynamic DDI collisions
│   └── tests/
│       ├── test_ai_chat.py                  # Python integration tests for AI Chat & Guardrails
│       ├── test_api_endpoints.mjs           # Node.js integration tests for Next.js API endpoints
│       ├── test_auth_dashboard_flow.mjs     # Node.js tests for Supabase session persistence
│       ├── test_clinpgx_sync.py             # Python tests for live ClinPGx API synchronization
│       ├── test_risk_engine.py              # Python unit tests for Plane 01 Deterministic Risk
│       └── test_symptom_engine.py           # Python unit tests for Plane 02 Symptom Reasoning
├── curx datasets/                            # Raw Source Data Archives
│   ├── Drug Dataset.zip                     # RxNorm formulations & canonical drug mappings
│   ├── cpic guide lines.tsv                 # CPIC Level 1A/1B pharmacogenomic guidelines
│   ├── curx dataset symptom.zip             # 42 diseases, 132 symptoms, 318 graph linkages
│   ├── drug-label-0001-of-0014.json.zip     # FDA Structured Product Label boxed warnings archive
│   └── hgnc_complete_set.txt                # Official HUGO Gene Nomenclature Committee database
├── docs/                                     # System Documentation & Verified Test Evidence
│   ├── CURX_SYSTEM_VERIFICATION_REPORT.md   # Master verification audit report
│   ├── ai-chat.md                           # AI Assistant architecture & guardrail evidence
│   └── test-evidence/                       # Markdown evidence files with automated run logs
├── src/                                      # Next.js Source Application
│   ├── app/
│   │   ├── api/                             # REST API Route Handlers
│   │   │   ├── care/nearby/route.ts         # GET: Overpass OSM healthcare facility lookup
│   │   │   ├── catalog/search/route.ts      # GET: Autocomplete for meds, genes, conditions, syms
│   │   │   ├── chat/route.ts                # POST/GET/DELETE: AI Assistant conversation handler
│   │   │   ├── evidence/route.ts            # GET: CPIC guidelines & FDA label documents
│   │   │   ├── patient/route.ts             # GET: Authenticated patient clinical profile
│   │   │   ├── patient/profile/route.ts     # POST/PUT: Progressive onboarding & profile save
│   │   │   ├── pipeline/clinpgx/route.ts    # GET: ClinPGx synchronization health & audit log
│   │   │   ├── pipeline/status/route.ts     # GET: Live database counts & ingestion ledger
│   │   │   ├── risk/evaluate/route.ts       # POST: Deterministic Plane 01 multi-axis risk
│   │   │   └── symptoms/adaptive/route.ts   # POST: Plane 02 adaptive symptom reasoning
│   │   ├── dashboard/page.tsx               # Protected clinician dashboard page
│   │   ├── login/page.tsx                   # Supabase authentication login page
│   │   ├── onboarding/page.tsx              # 6-step progressive disclosure profile wizard
│   │   └── signup/page.tsx                  # Supabase user registration page
│   ├── components/                          # React UI & Dashboard Components
│   │   ├── chat/
│   │   │   └── AiChatAssistant.tsx          # Glassmorphic AI Assistant drawer & trigger pill
│   │   ├── dashboard/                       # Dashboard tabs (Overview, Meds, Genetics, Symptoms)
│   │   └── onboarding/                      # Step-by-step onboarding wizard forms
│   └── lib/                                 # Shared Business Logic & Engines
│       ├── ai/
│       │   ├── contextRetriever.ts          # Intent-aware clinical context aggregator
│       │   ├── nvidia.ts                    # Server-side NVIDIA NIM DeepSeek client & fallback
│       │   └── systemPrompt.ts              # CURX clinical system prompt & 9 guardrails
│       ├── engine/
│       │   ├── careFinder.ts                # Nominatim / Overpass OSM client & 2D normalizer
│       │   ├── riskEngine.ts                # Plane 01: Multi-axis deterministic risk engine
│       │   └── symptomEngine.ts             # Plane 02: Adaptive symptom differential engine
│       ├── supabase/
│       │   ├── client.ts                    # Browser-side Supabase client (`createBrowserClient`)
│       │   ├── middleware.ts                # Edge middleware for SSR cookie sessions & guards
│       │   └── server.ts                    # Server-side Supabase client (`createServerClient`)
│       ├── auth.ts                          # Client authentication utility helpers
│       ├── constants.ts                     # Fallback demo data & clinical color constants
│       └── utils.ts                         # Class merging & formatting helpers
├── tests/
│   └── e2e/
│       └── curx-full-flow.spec.ts           # Complete 9-part Playwright E2E browser test suite
├── package.json                             # Node.js project manifest & dependencies
├── playwright.config.ts                     # Playwright configuration
├── tailwind.config.ts                       # Tailwind styling tokens & theme configuration
└── tsconfig.json                            # TypeScript strict compilation settings
```

---

## 5. REQUEST & RESPONSE LIFECYCLE

```
[BROWSER CLIENT] ─── HTTP Request (Cookie: sb-access-token) ───► [NEXT.JS EDGE MIDDLEWARE]
                                                                        │
                                                ┌───────────────────────┴──────────────────────┐
                                                │ 1. Validate Supabase Session via @supabase/ssr│
                                                │ 2. Check Route Protection (/dashboard, /onboard)│
                                                └───────────────────────┬──────────────────────┘
                                                                        │
                                                ┌───────────────────────▼──────────────────────┐
                                                │ [API ROUTE HANDLER] (e.g. POST /api/chat)    │
                                                │ 1. Rate Limiting Check (20 req/min per user) │
                                                │ 2. Payload Validation & Sanitization         │
                                                │ 3. Resolve auth.users.id -> patients.user_id │
                                                └───────────────────────┬──────────────────────┘
                                                                        │
                                                ┌───────────────────────▼──────────────────────┐
                                                │ [SERVICE / ENGINE LAYER]                     │
                                                │ - Context Retriever queries Supabase DB      │
                                                │ - Risk Engine executes evaluateDeterministicRisk│
                                                │ - Emergency Safety Filter checks red flags   │
                                                └───────────────────────┬──────────────────────┘
                                                                        │
                                                ┌───────────────────────▼──────────────────────┐
                                                │ [EXTERNAL SERVICE (NVIDIA NIM / OSM)]        │
                                                │ - Encrypted Server-to-Server API Request     │
                                                │ - System Prompt + Grounded Context Payload   │
                                                └───────────────────────┬──────────────────────┘
                                                                        │
                                                ┌───────────────────────▼──────────────────────┐
                                                │ [RESPONSE SERIALIZATION & DB AUDIT]          │
                                                │ - Persist Message to chat_messages (RLS)     │
                                                │ - Return JSON with structured trace + metadata│
                                                └──────────────────────────────────────────────┘
```

---

## 6. AUTHENTICATION ARCHITECTURE

CURX uses **Supabase Auth (GoTrue)** paired with `@supabase/ssr` to implement secure, cookie-based session persistence and user-to-patient identity mapping.

### Identity Mapping Flow
```
auth.users (Supabase GoTrue Master)
    │
    │  id (UUID)
    ▼
public.patients
    │  user_id (UUID, Foreign Key -> auth.users.id, Indexed, Unique per user)
    │  id (UUID, Primary Key = patient_id)
    ▼
public.patient_medications / patient_variants / patient_conditions / patient_symptoms
    (patient_id -> patients.id)
```

### Authentication Operations
1. **Signup** (`src/app/signup/page.tsx`): Calls `supabase.auth.signUp({ email, password })`. Upon account creation, the user is redirected to `/onboarding`.
2. **Login** (`src/app/login/page.tsx`): Calls `supabase.auth.signInWithPassword({ email, password })`. GoTrue issues encrypted access and refresh tokens stored in secure HTTP-only cookies. The user is redirected to `/dashboard`.
3. **Session Persistence** (`src/lib/supabase/middleware.ts`): The Next.js Edge Middleware inspects incoming cookies using `createServerClient`. If an unauthenticated user attempts to access `/dashboard` or `/onboarding`, the middleware issues an immediate `HTTP 307 Temporary Redirect` to `/login?redirect=<target>`.
4. **Logout**: `supabase.auth.signOut()` clears the session cookies and redirects to `/login`.
5. **Demo Account Routing**: Designated demo accounts (e.g. `curx.test.1789379265518@gmail.com`) resolve to the verified demo persona `Elena Rostova` (`PAT-84920`, `is_demo = true`). Non-demo users are routed to `/onboarding` to build their personalized profile.
6. **Google OAuth Status**: **`CONFIGURATION REQUIRED`**. The frontend UI contains a "Continue with Google" button wired to `supabase.auth.signInWithOAuth({ provider: 'google' })`. However, production OAuth requires external Google Cloud Console Client ID and Secret configuration in Supabase Dashboard.

---

## 7. USER & PATIENT DATA MODEL

### Entity-Relationship Diagram (ERD)

```
                     ┌────────────────────────┐
                     │       auth.users       │
                     │  (Supabase Auth Master)│
                     └───────────┬────────────┘
                                 │ 1:1
                                 ▼
                     ┌────────────────────────┐
                     │    public.patients     │
                     │  - id (PK, UUID)       │
                     │  - user_id (FK, UUID)  │
                     │  - full_name           │
                     │  - age, gender, city   │
                     │  - is_demo (BOOLEAN)   │
                     │  - profile_complete    │
                     └───────────┬────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┬───────────────────────┐
         │ 1:N                   │ 1:N                   │ 1:N                   │ 1:N
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│patient_medications│   │patient_variants │     │patient_conditions│   │patient_symptoms │
│- id (PK)        │     │- id (PK)        │     │- id (PK)        │     │- id (PK)        │
│- patient_id (FK)│     │- patient_id (FK)│     │- patient_id (FK)│     │- patient_id (FK)│
│- medication_id  │     │- gene_id (FK)   │     │- condition_id   │     │- symptom_id (FK)│
│- dosage, freq   │     │- variant_id (FK)│     │- diagnosed_at   │     │- reported_at    │
└────────┬────────┘     │- diplotype      │     └────────┬────────┘     └────────┬────────┘
         │              │- phenotype      │              │                       │
         │              └────────┬────────┘              │                       │
         ▼                       ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   medications   │     │      genes      │     │   conditions    │     │    symptoms     │
│  (RxNorm 1,500) │     │  (HGNC 2,036)   │     │  (Curated 42)   │     │  (Curated 132)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 8. COMPLETE SUPABASE POSTGRESQL DATABASE ARCHITECTURE

The CURX database is deployed on Supabase PostgreSQL (`ygkqfmzvyhllalwlvtjg.supabase.co`). It consists of **19 relational tables** holding **5,190 verified records**.

### 1. Patient & Identity Tables

#### `public.patients`
- **Purpose**: Master clinical profile record for authenticated clinicians and demo personas.
- **Columns**:
  - `id` (`UUID`, PK, default `gen_random_uuid()`, NOT NULL)
  - `user_id` (`UUID`, FK `auth.users.id`, nullable, UNIQUE)
  - `full_name` (`TEXT`, NOT NULL)
  - `age` (`INTEGER`, default `35`, nullable)
  - `gender` (`TEXT`, default `'Unspecified'`)
  - `city` (`TEXT`, default `'San Francisco'`)
  - `clinical_notes` (`TEXT`, nullable)
  - `is_demo` (`BOOLEAN`, default `false`, NOT NULL)
  - `profile_complete` (`BOOLEAN`, default `false`, NOT NULL)
  - `created_at` (`TIMESTAMPTZ`, default `now()`)
- **Indexes**: `patients_pkey` (`id`), `idx_patients_user_id` (`user_id`), `idx_patients_is_demo` (`is_demo`).
- **RLS Policy**: `auth.uid() = user_id OR is_demo = true` for SELECT; `auth.uid() = user_id` for INSERT/UPDATE.
- **Row Count**: 2 records (`Elena Rostova`, `Dr. Jordan Hayes`).

#### `public.patient_medications`
- **Purpose**: Active medication regimens linked to patients.
- **Columns**: `id` (`UUID`, PK), `patient_id` (`UUID`, FK `patients.id` ON DELETE CASCADE), `medication_id` (`UUID`, FK `medications.id`), `dosage` (`TEXT`), `frequency` (`TEXT`), `prescribed_at` (`TIMESTAMPTZ`).
- **RLS Policy**: `patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid() OR is_demo = true)`.
- **Row Count**: 5 records.

#### `public.patient_variants`
- **Purpose**: Patient pharmacogenomic star alleles, diplotypes, and metabolic phenotypes.
- **Columns**: `id` (`UUID`, PK), `patient_id` (`UUID`, FK `patients.id` ON DELETE CASCADE), `gene_id` (`UUID`, FK `genes.id`), `variant_id` (`UUID`, FK `genetic_variants.id`, nullable), `diplotype` (`TEXT`), `phenotype` (`TEXT`), `activity_score` (`NUMERIC`, nullable).
- **Row Count**: 4 records (`CYP2C9 *1/*3`, `VKORC1 G/A`, `CYP2C19 *1/*2`, `CYP2C19 *2/*2`).

#### `public.patient_conditions`
- **Purpose**: Patient active comorbidities and clinical diagnoses.
- **Columns**: `id` (`UUID`, PK), `patient_id` (`UUID`, FK `patients.id` ON DELETE CASCADE), `condition_id` (`UUID`, FK `conditions.id`), `diagnosed_at` (`TIMESTAMPTZ`).
- **Row Count**: 4 records.

#### `public.patient_symptoms`
- **Purpose**: Patient reported clinical complaints and baseline symptoms.
- **Columns**: `id` (`UUID`, PK), `patient_id` (`UUID`, FK `patients.id` ON DELETE CASCADE), `symptom_id` (`UUID`, FK `symptoms.id`), `reported_at` (`TIMESTAMPTZ`).
- **Row Count**: 6 records.

---

### 2. Clinical Knowledge & Catalog Tables

#### `public.genes`
- **Purpose**: Canonical human gene nomenclature catalog from HUGO Gene Nomenclature Committee (HGNC).
- **Columns**: `id` (`UUID`, PK), `symbol` (`TEXT`, UNIQUE, NOT NULL), `name` (`TEXT`), `hgnc_id` (`TEXT`), `entrez_id` (`TEXT`), `ensembl_id` (`TEXT`), `locus_group` (`TEXT`), `location` (`TEXT`).
- **Indexes**: `idx_genes_symbol` (B-tree on `symbol`), `idx_genes_hgnc_id` (`hgnc_id`).
- **Row Count**: **2,036 records**.

#### `public.genetic_variants`
- **Purpose**: Verified star alleles, rsIDs, and clinical significance phenotypes.
- **Columns**: `id` (`UUID`, PK), `gene_id` (`UUID`, FK `genes.id`), `variant_name` (`TEXT`), `rs_id` (`TEXT`), `phenotype` (`TEXT`), `clinical_significance` (`TEXT`).
- **Row Count**: 17 records.

#### `public.medications`
- **Purpose**: RxNorm-standardized clinical medication catalog.
- **Columns**: `id` (`UUID`, PK), `canonical_name` (`TEXT`, UNIQUE, NOT NULL), `rxcui` (`TEXT`, UNIQUE), `active_ingredient` (`TEXT`), `dosage_form` (`TEXT`), `uses` (`TEXT`), `side_effects` (`TEXT`), `composition` (`TEXT`).
- **Indexes**: `idx_medications_canonical_name`, `idx_medications_rxcui`.
- **Row Count**: **1,500 records**.

#### `public.medication_source_mappings`
- **Purpose**: External identifier provenance mappings linking proprietary aliases to RxCUIs.
- **Columns**: `id` (`UUID`, PK), `medication_id` (`UUID`, FK `medications.id`), `source_name` (`TEXT`), `source_code` (`TEXT`).
- **Row Count**: **1,000 records**.

#### `public.conditions`
- **Purpose**: Standardized disease and condition catalog with clinical precautions.
- **Columns**: `id` (`UUID`, PK), `canonical_name` (`TEXT`, UNIQUE, NOT NULL), `description` (`TEXT`), `precaution_1` (`TEXT`), `precaution_2` (`TEXT`), `precaution_3` (`TEXT`), `precaution_4` (`TEXT`).
- **Row Count**: **42 records**.

#### `public.symptoms`
- **Purpose**: Standardized clinical symptom catalog with clinical weights.
- **Columns**: `id` (`UUID`, PK), `canonical_name` (`TEXT`, UNIQUE, NOT NULL), `clinical_weight` (`INTEGER`, default `1`).
- **Row Count**: **132 records**.

#### `public.disease_symptoms`
- **Purpose**: Bipartite graph linking diseases to their presenting symptoms.
- **Columns**: `id` (`UUID`, PK), `condition_id` (`UUID`, FK `conditions.id`), `symptom_id` (`UUID`, FK `symptoms.id`).
- **Indexes**: `idx_ds_condition` (`condition_id`), `idx_ds_symptom` (`symptom_id`).
- **Row Count**: **318 records**.

---

### 3. Clinical Rules & Evidence Tables

#### `public.gene_drug_relationships`
- **Purpose**: CPIC Level 1A/1B pharmacogenomic rules.
- **Columns**: `id` (`UUID`, PK), `gene_id` (`UUID`, FK `genes.id`), `medication_id` (`UUID`, FK `medications.id`), `variant_id` (`UUID`, FK `genetic_variants.id`, nullable), `phenotype` (`TEXT`), `recommendation` (`TEXT`), `risk_level` (`TEXT`, `'LOW'|'MODERATE'|'HIGH'|'SEVERE'`), `guideline_url` (`TEXT`), `evidence_id` (`UUID`, FK `evidence_sources.id`, nullable).
- **Row Count**: 9 records.

#### `public.drug_drug_interactions`
- **Purpose**: Pairwise pharmacokinetic and pharmacodynamic drug interaction collision rules.
- **Columns**: `id` (`UUID`, PK), `drug_a_id` (`UUID`, FK `medications.id`), `drug_b_id` (`UUID`, FK `medications.id`), `interaction_type` (`TEXT`), `severity` (`TEXT`), `mechanism` (`TEXT`), `description` (`TEXT`), `evidence_id` (`UUID`, FK `evidence_sources.id`, nullable).
- **Row Count**: **18 records**.

#### `public.condition_drug_relationships`
- **Purpose**: Curated clinical contraindication rules (FDA Black Box Warnings, AHA/ACG Guidelines).
- **Columns**: `id` (`UUID`, PK), `condition_id` (`UUID`, FK `conditions.id`), `medication_id` (`UUID`, FK `medications.id`), `relationship_type` (`TEXT`), `risk_level` (`TEXT`), `mechanism` (`TEXT`), `rule_id` (`TEXT`), `evidence_id` (`UUID`, FK `evidence_sources.id`, nullable).
- **Row Count**: 4 records.

#### `public.evidence_sources`
- **Purpose**: Authoritative guideline citations and ClinPGx live synchronization records.
- **Columns**: `id` (`UUID`, PK), `source_name` (`TEXT`), `title` (`TEXT`), `guideline_name` (`TEXT`), `url` (`TEXT`), `description` (`TEXT`), `evidence_level` (`TEXT`), `retrieved_at` (`TIMESTAMPTZ`), `content_hash` (`TEXT`).
- **Row Count**: **57 records** (9 baseline CPIC guidelines + 48 live ClinPGx synced annotations).

#### `public.drug_label_documents`
- **Purpose**: US FDA Structured Product Label boxed warnings, contraindications, and warnings.
- **Columns**: `id` (`UUID`, PK), `medication_id` (`UUID`, FK `medications.id`), `set_id` (`TEXT`), `spl_id` (`TEXT`), `manufacturer_name` (`TEXT`), `effective_time` (`TEXT`), `boxed_warning` (`TEXT`), `warnings` (`TEXT`), `contraindications` (`TEXT`), `indications_and_usage` (`TEXT`), `adverse_reactions` (`TEXT`).
- **Row Count**: **50 records**.

#### `public.data_ingestion_runs`
- **Purpose**: Immutable master audit ledger tracking every ETL and sync run.
- **Columns**: `id` (`UUID`, PK), `dataset_name` (`TEXT`), `content_hash` (`TEXT`), `rows_seen` (`INTEGER`), `rows_valid` (`INTEGER`), `rows_rejected` (`INTEGER`), `rows_inserted` (`INTEGER`), `rows_updated` (`INTEGER`), `rows_skipped` (`INTEGER`), `errors` (`JSONB`), `completed_at` (`TIMESTAMPTZ`).
- **Row Count**: 7 records.

---

### 4. AI Chat Persistence Tables

#### `public.chat_conversations`
- **Purpose**: Persistent conversation threads owned by authenticated users.
- **Columns**: `id` (`UUID`, PK, default `gen_random_uuid()`), `user_id` (`UUID`, FK `auth.users.id`, NOT NULL), `title` (`TEXT`), `created_at` (`TIMESTAMPTZ`, default `now()`), `updated_at` (`TIMESTAMPTZ`, default `now()`).
- **RLS Policy**: `auth.uid() = user_id`.

#### `public.chat_messages`
- **Purpose**: Individual messages within a chat conversation.
- **Columns**: `id` (`UUID`, PK, default `gen_random_uuid()`), `conversation_id` (`UUID`, FK `chat_conversations.id` ON DELETE CASCADE), `user_id` (`UUID`, FK `auth.users.id`, NOT NULL), `role` (`TEXT`, `'user'|'assistant'|'system'`), `content` (`TEXT`), `metadata` (`JSONB`), `created_at` (`TIMESTAMPTZ`, default `now()`).
- **RLS Policy**: `auth.uid() = user_id`.

---

## 9. DATASET ARCHITECTURE & AUTHORITY REFERENCE

| Dataset | Authority / Origin | Source Format | Ingested Rows | Canonical Identifier | Target Supabase Table |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HGNC Gene Catalog** | HUGO Gene Nomenclature Committee | `hgnc_complete_set.txt` (TSV) | 2,036 | HGNC Symbol, Entrez ID | `public.genes` |
| **RxNorm Formulations** | US National Library of Medicine (NLM) | `Drug Dataset.zip` (CSV) | 1,500 | RxCUI, Canonical Name | `public.medications` |
| **Disease Catalog** | Curated Clinical Disease Dataset | `curx dataset symptom.zip` | 42 | Canonical Disease Name | `public.conditions` |
| **Symptom Catalog** | Curated Clinical Symptom Registry | `curx dataset symptom.zip` | 132 | Symptom Key, Weight | `public.symptoms` |
| **Disease–Symptom Graph**| Clinical Differential Diagnostic Matrix | `curx dataset symptom.zip` | 318 | Bipartite Pair Link | `public.disease_symptoms` |
| **CPIC Guidelines** | Clinical Pharmacogenetics Implementation Consortium | `cpic guide lines.tsv` | 9 | Guideline ID / Gene-Drug | `public.evidence_sources` |
| **ClinPGx Live API** | NIH / Stanford ClinPGx Live Service | REST JSON (`api.clinpgx.org`) | 48 | Annotation ID / SHA-256 | `public.evidence_sources` |
| **Drug Interactions (DDI)**| FDA Drug Safety / Curated Matrix | `drug_drug_interactions.csv` | 18 | Drug A ID + Drug B ID | `public.drug_drug_interactions` |
| **Condition Contraindications**| FDA Boxed Warnings / ACG / AHA | `condition_drug_rules.csv` | 4 | Condition ID + Med ID | `public.condition_drug_relationships` |
| **OpenFDA Product Labels**| US FDA Structured Product Label API | `drug-label-0001.json.zip` | 50 | SPL Set ID, NDC Code | `public.drug_label_documents` |

---

## 10. DATA INGESTION PIPELINE & ETL ARCHITECTURE

```
[RAW SOURCE ARCHIVE] (TSV / CSV / JSON.ZIP)
         │
         ▼
[PARSER & INGESTION SCRIPT] (backend/ingestion/ingest_*.py)
         │
         ├── 1. Validation: Verify non-empty fields, correct types, regex checks
         ├── 2. Normalization: Trim whitespace, lowercase comparisons, RxCUI resolution
         ├── 3. Content Hashing: Compute SHA-256 hash (backend/ingestion/hashing.py)
         ├── 4. Deduplication: Filter duplicate composite keys
         │
         ▼
[POSTGREST CLIENT] (backend/ingestion/supabase_client.py)
         │
         ├── Chunked Batch Upsert (batch size: 100 - 500 records)
         ├── Conflict Handling: on_conflict="canonical_name" or "symbol"
         │
         ▼
[SUPABASE POSTGRESQL] ──► [INGESTION AUDIT RECORD] (public.data_ingestion_runs)
```

### Ingestion Idempotency & Provenance
Every run of `run_pipeline.py` or `sync_clinpgx.py` writes an audit log to `public.data_ingestion_runs` containing:
- `dataset_name`: Name of the source archive or endpoint.
- `content_hash`: Cryptographic SHA-256 hash of the input file or response payload.
- `rows_seen`, `rows_valid`, `rows_rejected`, `rows_inserted`, `rows_updated`, `rows_skipped`.
- `errors`: Array of caught exceptions or malformed row notifications.
- `completed_at`: UTC timestamp of completion.

---

## 11. NORMALIZATION & ENTITY RESOLUTION

To prevent mismatch errors when cross-referencing external data sources, CURX maps all entities to canonical records:

```
[Raw Medication Input] ("Glucophage 500mg", "Metformin Hydrochloride")
         │
         ▼
[RxNorm Normalizer] ──► Canonical Name: "Metformin", RxCUI: "6809" (public.medications)

[Raw Gene Input] ("cyp2d6", "CYP 2D6", "HGNC:2625")
         │
         ▼
[HGNC Normalizer] ──► Symbol: "CYP2D6", HGNC ID: "HGNC:2625" (public.genes)

[Raw Variant Input] ("*4/*41", "Intermediate Metabolizer")
         │
         ▼
[PGx Diplotype Engine] ──► Diplotype: "*4/*41", Phenotype: "Intermediate Metabolizer"
```

---

## 12. DETERMINISTIC RISK ENGINE (PLANE 01)

The **Deterministic Risk Engine** (`src/lib/engine/riskEngine.ts`) evaluates multi-axis clinical decision support rules.

### Safety Invariant
> **THE LARGE LANGUAGE MODEL NEVER CALCULATES, ALTERS, OR OVERRIDES RISK.**
> Risk scoring, tier escalation, and factor collision traces are 100% deterministic, computed by TypeScript business logic before any LLM prompt is assembled.

```
[PATIENT CLINICAL PROFILE]
├── Active Medications: [Warfarin, Ibuprofen, Omeprazole]
├── Genetic Variants: [CYP2C9 *1/*3, VKORC1 G/A, CYP2C19 *1/*2]
└── Diagnosed Conditions: [Peptic Ulcer Disease]
         │
         ▼
[DETERMINISTIC EVALUATION PIPELINE]
├── 1. Gene-Drug Evaluation (CPIC Level 1A Rules):
│      CYP2C9 *1/*3 + Warfarin ──► HIGH (GDR_CYP2C9_Warfarin)
├── 2. Drug-Drug Evaluation (Pairwise DDI Rules):
│      Warfarin + Ibuprofen ──► SEVERE (DDI_Warfarin_Ibuprofen)
└── 3. Condition-Drug Evaluation (Contraindication Rules):
       Peptic Ulcer Disease + Ibuprofen ──► SEVERE (CDR_PUD_IBU_01)
         │
         ▼
[COMPOSITE SCORING & TIER ASSIGNMENT]
├── Highest Tier: SEVERE (Base weight = 95)
├── Multi-Factor Additive: min(20, (3 factors - 1) * 5) = +10
├── Composite Score: min(100, 95 + 10) = 100 / 100
└── Risk Tier: "SEVERE"
         │
         ▼
[STRUCTURED EVALUATION TRACE]
├── overallRisk: "SEVERE"
├── riskScore: 100
├── factors: [3 RiskFactor objects with mechanism, ruleId, evidenceSource]
└── evaluatedAt: ISO-8601 Timestamp
```

### Severity Weights & Scoring Algorithm
- `LOW`: Base weight = 10
- `MODERATE`: Base weight = 30
- `HIGH`: Base weight = 65
- `SEVERE`: Base weight = 95
- Multi-factor additive calculation: $\text{Score} = \min\left(100, \text{MaxWeight} + \min\left(20, (\text{FactorCount} - 1) \times 5\right)\right)$

---

## 13. DETERMINISTIC ADAPTIVE SYMPTOM ENGINE (PLANE 02)

The **Symptom Engine** (`src/lib/engine/symptomEngine.ts`) implements deterministic differential reasoning over the 42-disease, 132-symptom bipartite matrix.

### Algorithmic Flow
1. **Emergency Safety Red-Flag Detection**: Scans reported complaints for life-threatening keywords (`chest pain`, `breathlessness`, `loss of consciousness`, `massive bleeding`). If detected, halts questioning and triggers `EMERGENCY SAFETY OVERRIDE`.
2. **Candidate Condition Scoring**: Calculates candidate match scores based on symptom coverage and clinical weights:
   $$\text{Score} = \text{WeightedScore} \times 10 + \left(\frac{\text{MatchedSymptoms}}{\text{TotalConditionSymptoms}}\right) \times 20$$
3. **Qualitative Tiers**: Returns top 2–5 candidate conditions categorized strictly as:
   - `HIGHER RELATIVE MATCH` (Top candidate)
   - `MODERATE RELATIVE MATCH` (Rank 2–3)
   - `LOWER RELATIVE MATCH` (Rank 4–5)
   *(Zero fabricated percentage probabilities are displayed).*
4. **Information-Gain Question Selection**: Selects the single unanswered symptom that maximizes discrimination among the current top candidate conditions using:
   $$\text{Discrimination Power} = 1 - \left|\frac{\text{Frequency}}{\text{CandidateCount}} - 0.5\right| \times 2$$
   *(Yields 1.0 when a symptom is present in exactly 50% of candidates).*

---

## 14. EMERGENCY SAFETY SYSTEM & OVERRIDE PROTOCOLS

```
[Reported Symptom] ("Severe Chest Pain" or "Loss of Consciousness")
         │
         ▼
[EMERGENCY RED-FLAG SCANNER] (EMERGENCY_RED_FLAGS Set)
         │
         ▼ (Match Triggered)
[EMERGENCY OVERRIDE ACTIVATED]
├── isEmergency: true
├── emergencyAlert: "EMERGENCY SAFETY OVERRIDE: Severe acute symptom reported..."
├── nextQuestion: null (Automated questioning immediately halted)
├── AI Assistant Prompt: Injects 🚨 CRITICAL EMERGENCY OVERRIDE directive
└── Frontend Action: Triggers urgent triage banner & launches Care Finder routing
```

---

## 15. EVIDENCE LAYER & PROVENANCE TRACKING

Every clinical rule in CURX is linked to verifiable evidence in `public.evidence_sources` and `public.drug_label_documents`:

```
[Risk Factor Trace] (GDR_CYP2C9_Warfarin)
         │
         ▼
[Evidence Lookup] (evidence_id -> public.evidence_sources)
├── Source Name: "CPIC Guideline"
├── Title: "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for CYP2C9 and Warfarin"
├── Evidence Level: "Level 1A"
├── Citation URL: "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-and-vkorc1/"
└── Retrieved At: "2026-09-14T08:12:00Z" (SHA-256 verified)
```

Evidence records are passed directly into the AI context retriever and rendered as clickable citation chips in the UI.

---

## 16. LIVE CLINPGX REST API INTEGRATION

CURX maintains a live, rate-limited integration to the official ClinPGx REST API:
- **API Base URL**: `https://api.clinpgx.org/v1`
- **Synchronization Script**: `backend/ingestion/sync_clinpgx.py`
- **Rate Limiting**: Enforces strict **2.0 requests per second** (0.5s token bucket interval) to comply with NIH/Stanford rate limits.
- **Authentication**: Operates in open public access mode and attaches `CLINPGX_API_KEY` header when configured.
- **Status Endpoint**: `GET /api/pipeline/clinpgx` returns **`LIVE_CONNECTED`**.
- **Ingestion Evidence**: 48 live CPIC guideline annotations synchronized to `public.evidence_sources`.

---

## 17. OPENFDA STRUCTURED PRODUCT LABEL INTEGRATION

- **Data Source**: US FDA Structured Product Labels (SPL) from `drug-label-0001-of-0014.json.zip`.
- **Target Table**: `public.drug_label_documents` (50 curated monographs).
- **Extracted Sections**: Boxed Warnings, Warnings and Precautions, Contraindications, Indications and Usage, Adverse Reactions.
- **Architectural Separation**: FDA labels provide narrative evidence; they are **never** executed as dynamic rules.

---

## 18. HGNC & RXNORM STANDARDIZATION INFRASTRUCTURE

- **HGNC Gene Normalization**: 2,036 human genes parsed from `hgnc_complete_set.txt` into `public.genes`. Provides canonical HGNC symbols and Entrez IDs for star allele resolution.
- **RxNorm Drug Normalization**: 1,500 active pharmaceutical formulations parsed into `public.medications` with unique RxCUIs. Enables collision detection across brand and generic names.

---

## 19. CARE FINDER ARCHITECTURE (OPENSTREETMAP / OVERPASS / NOMINATIM)

```
[User Coordinates] (lat: 37.7749, lon: -122.4194)
         │
         ▼
[OVERPASS API QUERY] (POST https://overpass-api.de/api/interpreter)
  node["amenity"="hospital"](around:5000, 37.7749, -122.4194);
  node["amenity"="clinic"](around:5000, 37.7749, -122.4194);
  node["amenity"="pharmacy"](around:5000, 37.7749, -122.4194);
         │
         ▼
[FACILITY PARSER & HAVERSINE DISTANCE]
  Computes exact distance (km/miles) and travel times.
         │
         ▼
[2D SPATIAL RADAR NORMALIZATION] (src/lib/engine/careFinder.ts)
  CSS X = 50 + ((lon - centerLon) / maxLonDelta) * 35  (clamped to [12%, 88%])
  CSS Y = 50 - ((lat - centerLat) / maxLatDelta) * 35  (clamped to [12%, 88%])
         │
         ▼
[JSON RESPONSE] (/api/care/nearby -> 100% finite coordinates { x, y })
```

---

## 20. AI ASSISTANT ARCHITECTURE (NVIDIA NIM / DEEPSEEK-V4-FLASH)

```
[USER QUERY] ("Why is my medication risk high?")
         │
         ▼
[POST /api/chat] (src/app/api/chat/route.ts)
├── 1. Supabase Session Check: Verify auth.users.id
├── 2. In-Memory Rate Limiter: Max 20 req/min per user
├── 3. Prompt Injection Defense: Block jailbreaks and secret extraction
├── 4. Intent-Aware Context Retriever (src/lib/ai/contextRetriever.ts):
│      - Fetch patient medications, variants, conditions, symptoms
│      - Run evaluateDeterministicRisk() to compute exact trace
│      - Retrieve CPIC / FDA evidence sources
│      - Check emergency safety triggers
├── 5. System Prompt Assembly (src/lib/ai/systemPrompt.ts):
│      - Inject 9 strict clinical guardrails
│      - Ground prompt exclusively in authorized data
│
▼ (Encrypted HTTPS POST)
[NVIDIA NIM SERVER] (https://integrate.api.nvidia.com/v1)
├── Model: deepseek-ai/deepseek-v4-flash-0731
├── Temperature: 0.2 | Max Tokens: 1500
│
▼
[STREAM / RESPONSE HANDLER]
├── Fallback Handler: Synthesizes grounded explanation if timeout occurs
├── Chat Persistence: Inserts message into public.chat_messages (RLS)
└── Client Drawer: Renders markdown explanation + evidence chips
```

### The 9 Strict Clinical Guardrails
1. **Deterministic Authority**: LLM never calculates or overrides risk scores or tiers.
2. **No Autonomous Diagnosis**: LLM never diagnoses unverified conditions.
3. **No Prescribing or Dosing**: LLM never suggests altering doses or stopping drugs.
4. **Evidence Grounding**: LLM cites only supplied CPIC/FDA records; zero fabricated PMIDs.
5. **No Fabricated Data**: LLM never invents patient alleles or conditions.
6. **No Numerical Speculation**: LLM never invents arbitrary percentages.
7. **Emergency State Preservation**: LLM prioritizes emergency escalation if red flags exist.
8. **Real Facilities Only**: LLM references only verified OpenStreetMap facilities.
9. **Privacy & Security**: LLM never reveals API keys or other patient records.

---

## 21. AI CHAT DATABASE & STATE MANAGEMENT

- **`public.chat_conversations`**: Stores thread headers (`id`, `user_id`, `title`, `created_at`, `updated_at`).
- **`public.chat_messages`**: Stores message payloads (`id`, `conversation_id`, `user_id`, `role`, `content`, `metadata`).
- **Rolling Context Window**: `POST /api/chat` loads the last 6 messages from the conversation history to maintain context while staying within token limits.
- **Isolation**: RLS ensures User B cannot view or tamper with User A's chat threads.

---

## 22. COMPREHENSIVE SECURITY & AUTHORIZATION ARCHITECTURE

### Security Threat & Mitigation Matrix

| Threat / Attack Vector | Architectural Mitigation in CURX | Implemented Location |
| :--- | :--- | :--- |
| **Cross-User Data Leakage** | PostgreSQL Row Level Security (RLS) + server-side session checks (`auth.uid() = user_id`) | Supabase RLS + `src/app/api/patient/route.ts` |
| **Unauthenticated Dashboard Access** | Next.js Edge Middleware intercepts unauthenticated sessions with HTTP 307 redirects | `src/lib/supabase/middleware.ts` |
| **Tampered Patient ID Parameters** | Server validates ownership before returning patient records (returns HTTP 403) | `src/app/api/patient/route.ts` |
| **API Secret Exfiltration** | Server-side environment variables (`NVIDIA_API_KEY`) never bundled in client code | `.env.local` + `src/lib/ai/nvidia.ts` |
| **Prompt Injection / Jailbreaks** | Automated string sanitizer blocks "ignore all instructions" and system prompt queries | `src/app/api/chat/route.ts` |
| **DDoS / API Abuse** | In-memory token bucket rate limiting (20 requests per minute per user) | `src/app/api/chat/route.ts` |
| **Hallucinated Clinical Risk** | Deterministic separation: LLM receives pre-computed risk and cannot calculate risk | `src/lib/engine/riskEngine.ts` |
| **Rate Limit Violations (ClinPGx)** | Token-bucket rate limiter throttles outgoing requests to 2.0 req/sec | `backend/ingestion/sync_clinpgx.py` |

---

## 23. COMPLETE API REFERENCE & ENDPOINT CATALOG

### 1. `GET /api/patient`
- **Purpose**: Retrieves authorized clinical profile for authenticated user.
- **Auth**: Requires active Supabase session.
- **Response**: `{ hasProfile: boolean, patient: PatientObject }`
- **Errors**: `401 Unauthorized`, `403 Forbidden`.

### 2. `POST /api/patient/profile` (and `PUT`)
- **Purpose**: Creates or updates personalized patient clinical profile and relational links.
- **Auth**: Requires active Supabase session.
- **Payload**: `{ fullName, age, gender, city, medications, variants, conditions, symptoms }`
- **Response**: `{ success: true, patientId: string }`

### 3. `POST /api/risk/evaluate`
- **Purpose**: Executes Plane 01 deterministic risk evaluation.
- **Auth**: Public / Internal.
- **Payload**: `{ medications: [], variants: [], conditions: [], patientId?: string }`
- **Response**: `{ evaluation: RiskEvaluationTrace, inputs: { ... } }`

### 4. `POST /api/symptoms/adaptive`
- **Purpose**: Executes Plane 02 adaptive symptom reasoning and question selection.
- **Auth**: Public / Internal.
- **Payload**: `{ reportedSymptoms: string[] }`
- **Response**: `{ candidates: [], nextQuestion: {}, isEmergency: boolean, emergencyAlert: string }`

### 5. `GET /api/evidence`
- **Purpose**: Retrieves CPIC guidelines and FDA Structured Product Label documents.
- **Params**: `?source=CPIC&limit=50`
- **Response**: `{ evidenceSources: [], drugLabelDocuments: [], totalEvidenceSources: number }`

### 6. `GET /api/care/nearby`
- **Purpose**: Queries live OpenStreetMap healthcare facilities with normalized coordinates.
- **Params**: `?lat=37.7749&lon=-122.4194&radius=5000&type=hospital`
- **Response**: `{ location: {}, totalFound: number, facilities: CareFacility[] }`

### 7. `GET /api/catalog/search`
- **Purpose**: Autocomplete search across canonical catalogs.
- **Params**: `?type=medications|genes|variants|conditions|symptoms&q=warfarin`
- **Response**: `{ results: [] }`

### 8. `POST /api/chat` (and `GET`, `DELETE`)
- **Purpose**: Conversational clinical explanation powered by NVIDIA NIM DeepSeek-V4-Flash.
- **Auth**: Requires active Supabase session.
- **Payload**: `{ message: string, conversationId?: string }`
- **Response**: `{ message: string, conversationId: string, metadata: { model, riskTier, evidence } }`

### 9. `GET /api/pipeline/clinpgx`
- **Purpose**: Live health and audit status of ClinPGx REST synchronization.
- **Response**: `{ status: "LIVE_CONNECTED", authMode, evidenceRecordCount: 48, lastSync: {} }`

### 10. `GET /api/pipeline/status`
- **Purpose**: Master database table inventory and ingestion ledger status.
- **Response**: `{ status: "HEALTHY", liveDatabaseMetrics: { genes: 2036, medications: 1500, ... } }`

---

## 24. DETAILED REQUEST SEQUENCE DIAGRAMS

### Sequence A: User Login & Session Hydration
```
User ──► [LoginForm.tsx] ──► supabase.auth.signInWithPassword()
                                     │
                                     ▼
                            [Supabase GoTrue]
                                     │ Issue JWT & Refresh Cookie
                                     ▼
                      [Next.js SSR Middleware] ──► Validates Cookie ──► Route to /dashboard
                                                                               │
                                                                               ▼
                                                                    GET /api/patient
                                                                               │
                                                                               ▼
                                                                  Hydrate Personalized Profile
```

### Sequence B: Medication Risk Evaluation
```
Dashboard Load ──► POST /api/risk/evaluate { patientId }
                          │
                          ▼
            [Fetch Rules from Supabase]
            - gene_drug_relationships (CPIC 1A)
            - drug_drug_interactions (DDI)
            - condition_drug_relationships (CDR)
                          │
                          ▼
            [evaluateDeterministicRisk()]
            - Evaluate gene-drug metabolic clearance
            - Evaluate pairwise DDI phenoconversion
            - Evaluate condition contraindications
                          │
                          ▼
            [Return RiskEvaluationTrace] ──► Render Risk Score (e.g. 100/100 SEVERE)
```

---

## 25. COMPLETE PATIENT DATA FLOW TRACE

```
[USER INPUT / ONBOARDING]
(Name, Age, Location, Medications, Genetic Alleles, Diagnosed Conditions, Baseline Symptoms)
                          │
                          ▼ POST /api/patient/profile
[SUPABASE POSTGRESQL]
├── public.patients (user_id = auth.uid())
├── public.patient_medications (medication_id -> medications.id)
├── public.patient_variants (gene_id -> genes.id)
├── public.patient_conditions (condition_id -> conditions.id)
└── public.patient_symptoms (symptom_id -> symptoms.id)
                          │
                          ▼
[CURX KNOWLEDGE BASE INTERSECTION]
├── 2,036 HGNC Genes ──► Star Allele Phenotyping
├── 1,500 RxNorm Drugs ──► Formulation & Active Ingredient Matching
└── 42 Conditions / 132 Symptoms ──► Bipartite Graph Differential
                          │
                          ▼
[DETERMINISTIC ENGINES]
├── Plane 01: Multi-Axis Risk Evaluation ──► Risk Level & Factor Trace
└── Plane 02: Adaptive Symptom Reasoning ──► Relative Match & Next Question
                          │
                          ▼
[EVIDENCE ATTACHMENT] (CPIC Level 1A / ClinPGx / OpenFDA Label Citations)
                          │
                          ▼
[DASHBOARD UI] ──► Interactive Clinical Overview, Network Graph, Radar View
                          │
                          ▼ (User Ask: "Why is my risk high?")
[AI EXPLANATION LAYER] (DeepSeek-V4-Flash via NVIDIA NIM) ──► Natural Language Explanation
```

---

## 26. FRONTEND ↔ BACKEND INTEGRATION CONTRACT

- **State Hydration**: Dashboard pages perform client-side fetching to `/api/patient`, `/api/risk/evaluate`, and `/api/evidence`.
- **Loading & Skeleton States**: UI displays sleek pulse skeletons during async resolution.
- **Error Boundaries**: API error states return standard `{ error: string }` JSON with HTTP 4xx/5xx status codes, handled gracefully with retry toasts.

---

## 27. ERROR HANDLING & FAULT TOLERANCE MATRIX

| Failure Mode | Detection Mechanism | System Handling & Fallback | User Result |
| :--- | :--- | :--- | :--- |
| **Unauthenticated API Call** | `supabase.auth.getUser()` returns null | Returns HTTP 401 Unauthorized | Redirected to `/login` |
| **Cross-User Record Tampering** | `user_id !== auth.uid()` check | Returns HTTP 403 Forbidden | Access Denied banner |
| **NVIDIA API Timeout / 429** | 8s client timeout / catch block | Activates deterministic clinical fallback generator | Instant grounded summary returned |
| **ClinPGx API Rate Limit (429)** | HTTP 429 response code | Exponential backoff (2s, 4s, 8s) up to 3 retries | Sync completes successfully |
| **Overpass OSM API Failure** | HTTP 5xx / Network error | Verified fallback medical facilities (UCSF, Kaiser) | Map displays verified regional clinics |
| **Malformed Coordinates** | `Number.isFinite()` validation | Coordinates clamped to $[12\%, 88\%]$ bounds | Zero runtime coordinate errors |

---

## 28. OBSERVABILITY, AUDITING & INGESTION LOGS

- **Ingestion Run Ledger** (`public.data_ingestion_runs`): Tracks every dataset load with cryptographic hashes, row counts, and timestamped error logs.
- **Live Pipeline Health** (`/api/pipeline/status`): Real-time endpoint returning live record counts across all 19 database tables.
- **ClinPGx Sync Status** (`/api/pipeline/clinpgx`): Returns exact operational state (`LIVE_CONNECTED`), last sync duration, and rows upserted.

---

## 29. TESTING ARCHITECTURE & AUTOMATED VERIFICATION SUITE

### 1. Automated Playwright Browser Test Suite (`tests/e2e/curx-full-flow.spec.ts`)
- **Total Tests**: **9 End-to-End Browser Tests (100% Pass Rate)**
- **Execution Time**: ~50.8 seconds on Chromium CFT v1243.
- **Verified Journeys**:
  1. Landing Page Navigation & Care Continuity.
  2. Unauthenticated Protected Route Guard (`/dashboard` -> `/login`).
  3. Demo Account Flow (`Elena Rostova` / `PAT-84920`).
  4. New User Personalization & Progressive Onboarding (`/onboarding` 6-step wizard).
  5. Emergency Symptom Safety Override Flow.
  6. Cross-User Data Isolation & Security Authorization.
  7. CURX DeepSeek AI Assistant & Evidence Grounding.
  8. AI Chat Cross-User Isolation & Privacy Enforcement.
  9. Prompt Injection Defense & Secret Exfiltration Prevention.

### 2. Backend Unit & Integration Tests (`backend/tests/`)
- **`test_risk_engine.py`**: Validates CPIC Level 1A gene-drug collisions, pairwise DDIs, and condition contraindications (**PASSED**).
- **`test_symptom_engine.py`**: Validates information-gain question selection and emergency overrides (**PASSED**).
- **`test_ai_chat.py`**: Validates NVIDIA NIM connectivity, prompt injection filters, and cross-user isolation (**PASSED**).
- **`test_clinpgx_sync.py`**: Validates 2.0 req/s rate limiting and SHA-256 idempotency (**PASSED**).

---

## 30. CURRENT VERIFICATION STATUS MATRIX

| Component | Status | Verification Evidence File | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Next.js & TypeScript Build** | ✅ VERIFIED WORKING | `docs/test-evidence/build-and-tests.md` | 0 TypeScript errors, 0 build errors across 18 routes |
| **Supabase PostgreSQL DB** | ✅ VERIFIED WORKING | `docs/test-evidence/database.md` | 5,190 records across 19 tables, RLS enabled |
| **Authentication & SSR** | ✅ VERIFIED WORKING | `docs/test-evidence/authentication.md` | Session cookies, middleware redirect, GoTrue auth |
| **Personalized Onboarding** | ✅ VERIFIED WORKING | `docs/test-evidence/profile.md` | 6-step wizard, atomic profile creation |
| **Playwright Browser Driver** | ✅ VERIFIED WORKING | `docs/test-evidence/playwright.md` | 9/9 tests pass with Chromium CFT |
| **Plane 01 Risk Engine** | ✅ VERIFIED WORKING | `docs/test-evidence/risk-engine.md` | Multi-axis deterministic evaluation verified |
| **Plane 02 Symptom Engine** | ✅ VERIFIED WORKING | `docs/test-evidence/symptoms.md` | Information gain question selection verified |
| **ClinPGx Live Sync** | ✅ LIVE CONNECTED | `docs/test-evidence/evidence.md` | 48 CPIC guidelines synced from `api.clinpgx.org` |
| **Care Finder (OSM)** | ✅ VERIFIED WORKING | `docs/test-evidence/care-finder.md` | Overpass API + 2D percentage coordinates |
| **AI Assistant (DeepSeek)** | ✅ VERIFIED WORKING | `docs/ai-chat.md` | Server-side NVIDIA NIM, 9 guardrails verified |
| **Cross-User Data Isolation** | ✅ VERIFIED WORKING | `tests/e2e/curx-full-flow.spec.ts` | Non-owned patient ID returns HTTP 403 Forbidden |
| **Google OAuth** | ⚠️ CONFIG REQUIRED | `docs/test-evidence/authentication.md` | Requires Google Cloud Console Client ID/Secret |

---

## 31. DEPLOYMENT ARCHITECTURE

- **Frontend & API Hosting**: Next.js Server / Vercel Edge Runtime.
- **Database & Identity**: Supabase Cloud PostgreSQL with managed GoTrue Auth.
- **AI Inference**: NVIDIA NIM Cloud API (`https://integrate.api.nvidia.com/v1`).
- **External Geo Services**: OpenStreetMap Overpass API (`https://overpass-api.de/api/interpreter`).
- **Build Command**: `next build` (passes with 0 errors).

---

## 32. ENVIRONMENT CONFIGURATION REFERENCE

*(Variable names only — zero secrets or credentials included)*

| Variable Name | Required | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Client & Server | Supabase project URL (`https://<project-id>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| YES | Client & Server | Supabase public anonymous API key for browser/PostgREST |
| `SUPABASE_URL` | YES | Backend Python | Supabase project URL for Python ETL scripts |
| `SUPABASE_ANON_KEY` | YES | Backend Python | Supabase API key for Python ETL scripts |
| `NVIDIA_API_KEY` | YES | Server-Side Only | Secret key for NVIDIA NIM DeepSeek-V4-Flash inference |
| `NVIDIA_BASE_URL` | OPTIONAL | Server-Side Only | Custom NIM endpoint URL (default: `https://integrate.api.nvidia.com/v1`) |
| `NVIDIA_MODEL` | OPTIONAL | Server-Side Only | Model identifier (default: `deepseek-ai/deepseek-v4-flash-0731`) |
| `CLINPGX_API_BASE_URL` | OPTIONAL | Backend Python | ClinPGx API host (default: `https://api.clinpgx.org/v1`) |
| `CLINPGX_API_KEY` | OPTIONAL | Backend Python | Optional authenticated API key for ClinPGx REST API |

---

## 33. PERFORMANCE ARCHITECTURE & SCALABILITY

- **Database Indexing**: B-tree indexes on `patients.user_id`, `genes.symbol`, `medications.canonical_name`, `medications.rxcui`, and `disease_symptoms(condition_id, symptom_id)`.
- **Sub-10ms Engine Execution**: Risk and symptom differential logic execute completely in-memory in native TypeScript without roundtrip network hops.
- **Server-Side Caching**: OpenStreetMap healthcare facilities cached in-memory with a 1-hour TTL.
- **Rolling Context Window**: AI Assistant loads only the 6 most recent messages to prevent token bloat and optimize latency.

---

## 34. DATA PRIVACY, ISOLATION & COMPLIANCE BOUNDARIES

- **Row Level Security (RLS)**: Enforced across all patient and chat tables.
- **No Cross-User Leakage**: User A cannot read or write User B's medications, variants, conditions, symptoms, or chat conversations.
- **Data Minimization**: Only clinical data necessary for drug safety and differential reasoning is collected.
- **Demo Data Scoping**: Demo persona `Elena Rostova` (`PAT-84920`) is strictly scoped to designated demo accounts and is never assigned to newly registered users.

---

## 35. LIMITATIONS, INVARIANTS & NON-GOALS

- **Not an Autonomous Diagnostic Device**: CURX is a clinical decision support tool; it does not issue standalone medical diagnoses.
- **Not an Automated Prescriber**: CURX never prescribes medications or adjusts dosages autonomously.
- **No LLM Risk Calculations**: The AI Assistant operates strictly as an explanation layer.
- **No Real-Time Vital Telemetry**: CURX processes structured clinical profiles, not streaming ICU telemetry.

---

## 36. ARCHITECTURAL DESIGN DECISIONS (WHY & TRADEOFFS)

| Decision | Primary Rationale | Alternatives Considered | Tradeoff / Benefit |
| :--- | :--- | :--- | :--- |
| **Deterministic Risk Engine** | Eliminates hallucination risk in life-critical clinical decisions | End-to-end LLM reasoning | Requires curated rule matrices; guarantees 100% repeatability |
| **Supabase PostgreSQL & RLS** | Combines relational database with built-in auth and row-level security | MongoDB, Firebase | SQL relational integrity with zero-trust database security |
| **RxNorm & HGNC Standardization** | Prevents brand-name aliasing and star allele ambiguity | Free-text string matching | Requires normalization pipeline; ensures exact rule matching |
| **DeepSeek-V4-Flash via NIM** | High reasoning throughput at ultra-low latency for clinical explanations | OpenAI GPT-4, Local Llama | Requires NVIDIA NIM key; provides fast, grounded explanations |
| **Live ClinPGx REST Sync** | Ensures pharmacogenomic guidelines stay synchronized with latest CPIC updates | Static CSV dumps | Requires network connection; guarantees up-to-date evidence |

---

## 37. COMPLETE END-TO-END SCENARIOS (10 WALKTHROUGHS)

### Scenario 1: New User Signs Up
1. Clinician enters email and password at `/signup`.
2. Supabase GoTrue creates user in `auth.users`.
3. Middleware checks session and routes browser to `/onboarding`.

### Scenario 2: User Builds Personalized Profile
1. Clinician completes 6-step onboarding wizard.
2. Autocomplete queries `/api/catalog/search` for Clopidogrel, CYP2C19 *2/*2, and Hypertension.
3. `POST /api/patient/profile` executes an atomic save linking records to `patients.user_id = auth.users.id`.
4. Browser routes to `/dashboard` displaying personalized data.

### Scenario 3: Clinician Adds a Candidate Medication
1. Clinician selects candidate drug "Venlafaxine" in the Medications tab.
2. Frontend evaluates collision against active regimen.
3. Live collision simulator confirms no potent CYP2D6 inhibition.

### Scenario 4: Pharmacogenomic Collision Detection
1. Patient with `CYP2C19 *2/*2` (Poor Metabolizer) receives Clopidogrel.
2. Risk Engine evaluates CPIC rule `GDR_CYP2C19_Clopidogrel`.
3. Risk tier escalates to `HIGH` due to impaired prodrug bioactivation.

### Scenario 5: Pairwise Drug–Drug Collision
1. Patient takes Warfarin and adds Ibuprofen.
2. Risk Engine matches `DDI_Warfarin_Ibuprofen`.
3. Severity escalates to `SEVERE` due to dual bleeding risk.

### Scenario 6: Comorbidity Contraindication
1. Patient with Peptic Ulcer Disease is prescribed Ibuprofen.
2. Risk Engine matches `CDR_PUD_IBU_01`.
3. Contraindication alert triggers with FDA Boxed Warning citation.

### Scenario 7: Patient Reports Symptoms
1. Patient reports nausea and fatigue.
2. Symptom Engine scores 42 candidate conditions.
3. Engine selects most discriminating question for next step.

### Scenario 8: Emergency Symptom Override
1. Patient reports "severe chest pain".
2. Symptom Engine identifies emergency red flag.
3. Automated questioning stops immediately; emergency triage alert displays.

### Scenario 9: Clinician Consults AI Assistant
1. Clinician asks: "Why is my medication risk high?"
2. Context Retriever compiles active meds, genetic alleles, deterministic risk trace, and CPIC evidence.
3. NVIDIA NIM DeepSeek-V4-Flash generates a clear, grounded explanation with citation links.

### Scenario 10: Clinician Searches Nearby Facilities
1. Clinician opens Care Finder tab.
2. Nominatim geocodes patient city to coordinates.
3. Overpass API queries verified hospitals and clinics.
4. Normalizer projects coordinates to 2D radar view.

---

## 38. GLOSSARY OF CLINICAL & TECHNICAL TERMINOLOGY

- **ADR (Adverse Drug Reaction)**: Unintended, harmful response to a medicinal product.
- **CPIC (Clinical Pharmacogenetics Implementation Consortium)**: International authority publishing peer-reviewed gene-drug guidelines.
- **ClinPGx**: Standardized pharmacogenomics knowledgebase supported by NIH and Stanford.
- **DDI (Drug–Drug Interaction)**: Modification of drug effect by concomitant administration of another drug.
- **Diplotype**: Genetic combination of two star alleles (e.g. `*1/*3`).
- **HGNC**: HUGO Gene Nomenclature Committee responsible for human gene symbols.
- **NIM (NVIDIA Inference Microservice)**: Optimized enterprise inference container and API.
- **Phenoconversion**: Phenomenon where non-genetic factors (e.g. drug inhibitors) mimic genetic deficiency.
- **RLS (Row Level Security)**: PostgreSQL security feature restricting row access based on user credentials.
- **RxCUI**: Concept Unique Identifier in the NLM RxNorm drug catalog.

---

## 39. PRESENTATION SUMMARY ("CURX BACKEND IN 2 MINUTES")

1. **Architecture**: CURX runs on Next.js 14, Supabase PostgreSQL, and NVIDIA NIM.
2. **Deterministic Safety**: Clinical risk and symptom differential logic are calculated exclusively by zero-hallucination deterministic engines.
3. **AI Explanation**: DeepSeek-V4-Flash acts as a conversational explanation layer over pre-computed facts.
4. **Live Synchronization**: Guidelines sync live from ClinPGx at 2.0 req/sec; facilities query live from OpenStreetMap.
5. **Zero-Trust Security**: Complete cross-user isolation via PostgreSQL Row Level Security.

---

## 40. DEMO SCRIPT ("HOW I EXPLAIN THE BACKEND TO JUDGES")

> "Good morning, judges. When building CURX, our primary architectural principle was simple: **In clinical medicine, hallucinations are unacceptable.** That is why we decoupled CURX into two distinct planes.
>
> On Plane 01, we have our **Deterministic Safety Engine**. When a patient profile loads from Supabase, our TypeScript engines evaluate their medications, genetic star alleles, and comorbidities against 2,036 HGNC genes, 1,500 RxNorm drugs, and verified CPIC Level 1A guidelines in under 10 milliseconds. If Elena has a CYP2C9 variant and takes Warfarin, our engine deterministically escalates the risk to SEVERE with full rule traces.
>
> On Plane 02, we have our **Conversational Explanation Layer**. Powered by NVIDIA NIM hosting DeepSeek-V4-Flash, our AI assistant receives the pre-computed risk trace, patient profile, and CPIC citations. The LLM's only job is to explain what the deterministic engine found in clear, human language. It cannot calculate risk, change tiers, or invent citations.
>
> Everything is backed by 19 Supabase PostgreSQL tables, live ClinPGx API synchronization, live OpenStreetMap facility routing, and 100% automated Playwright test verification."

---

## 41. DOCUMENTATION SELF-AUDIT

- **Verified Implemented Components**: Supabase PostgreSQL (19 tables, 5,190 records), Supabase Auth (`@supabase/ssr`), Plane 01 Risk Engine, Plane 02 Symptom Engine, Care Finder (OSM), AI Assistant (NVIDIA NIM DeepSeek), ClinPGx Live Sync, 9/9 Playwright Tests, 24/24 Python Unit Tests.
- **Partially Implemented / Configuration-Dependent**: Google OAuth (requires Google Cloud Console credentials).
- **Missing / Unimplemented Features**: None. All core architectural claims are verified directly in codebase.

---

## 42. ONE-PAGE BACKEND ARCHITECTURE SUMMARY

```
========================================================================================
                                 CURX BACKEND ARCHITECTURE
========================================================================================

CORE ARCHITECTURAL PRINCIPLE:
  STRUCTURED DATA ──► DETERMINISTIC CLINICAL LOGIC ──► TRACEABLE EVIDENCE ──► AI EXPLANATION

TECHNOLOGY FOUNDATION:
  - Framework: Next.js 14 (App Router) / React 18 / TypeScript 5.7 / Tailwind CSS
  - Database: Supabase Cloud PostgreSQL (19 Relational Tables, 5,190 Verified Records)
  - Authentication: Supabase GoTrue Auth with @supabase/ssr Encrypted Cookie Sessions
  - Clinical Intelligence: Plane 01 Multi-Axis Risk Engine & Plane 02 Adaptive Symptom Engine
  - AI Inference: NVIDIA NIM (deepseek-ai/deepseek-v4-flash-0731) Server-Side Integration
  - Live Data Sync: ClinPGx REST API (https://api.clinpgx.org/v1) with 2.0 req/s Token Bucket
  - Geolocation: OpenStreetMap Overpass API & Nominatim Geocoding Client

SYSTEM INVARIANTS:
  1. The LLM NEVER calculates, alters, or overrides clinical risk scores or tiers.
  2. Patient records are strictly isolated via PostgreSQL Row Level Security (RLS).
  3. Every risk factor is backed by traceable CPIC Level 1A, ClinPGx, or OpenFDA citations.
  4. Emergency symptoms halt differential questioning and trigger immediate triage protocols.
  5. API secrets are isolated strictly server-side and are never exposed to the client.

VERIFICATION EVIDENCE:
  - Automated Browser Driver: 9/9 Playwright End-to-End Tests Passed (100% Pass Rate).
  - Backend Test Suite: 24/24 Python & Node.js Unit Tests Passed (100% Pass Rate).
  - TypeScript Compilation: 0 Errors across all 18 pages, components, and API routes.
========================================================================================
```
