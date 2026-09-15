# CURX

CURX is an advanced, production-ready clinical decision support and pharmacogenomics intelligence platform that bridges the gap between raw genetic variants, active drug regimens, multi-morbidity profiles, and real-time clinical reasoning. Built with a dual-plane safety architecture, CURX computes drug–gene, drug–drug, and condition–drug collision vectors using deterministic clinical rules (CPIC, ClinPGx, OpenFDA) before passing authorized structured traces to an AI conversational explanation layer powered by DeepSeek on NVIDIA NIM.

---

## Features

- **Personalized User Profiles & Onboarding**: Fully personalized clinical intake for authenticated users, capturing active medications, genetic diplotypes, chronic conditions, and acute symptoms.
- **Medication Intelligence**: Multi-drug interaction screening grounded in canonical RxNorm mappings and curated drug collision matrices.
- **Genetic Intelligence**: Pharmacogenomic metabolizer status resolution across critical clinical genes (CYP2D6, CYP2C19, CYP2C9, VKORC1, SLCO1B1, DPYD, TPMT, HLA-B).
- **Adaptive Symptom Reasoning**: Bayesian graph traversal and deep neural symptom classifier (CurxSymptomNet) identifying adverse drug events and dangerous clinical trajectories.
- **Deterministic Risk Engine**: Authoritative, rule-based scoring engine calculating composite risk tiers (LOW, MODERATE, HIGH, SEVERE) without black-box hallucination.
- **Live Evidence Layer**: Real-time provenance citations and direct links to authoritative CPIC dosing guidelines, ClinPGx annotations, and OpenFDA genomic boxed warnings.
- **Live ClinPGx Integration**: Automatic synchronization pipeline maintaining up-to-date guideline annotations and accession identifiers directly with ClinPGx REST services.
- **Geographic Care Finder**: Real-time geolocation-based emergency room and clinic locator powered by OpenStreetMap Overpass API for acute clinical escalations.
- **DeepSeek AI Conversational Assistant**: Secure conversational clinical explanation layer utilizing `deepseek-ai/deepseek-v4-flash-0731` on NVIDIA NIM, strictly bounded to pre-computed deterministic risk traces.
- **Personalized Clinical Dashboard**: Responsive, interactive interface with dynamic risk meters, evidence inspectors, care locator map, and streaming AI assistant.

---

## Architecture

```
USER
  ↓
AUTH (Supabase SSR / PKCE / Session Cookie)
  ↓
PATIENT PROFILE (Onboarding / Intake Flow)
  ↓
SUPABASE (PostgreSQL + Row-Level Security)
  ↓
CURX KNOWLEDGE BASE (CPIC / ClinPGx / OpenFDA / RxNorm / HGNC)
  ↓
DETERMINISTIC ENGINES (Risk Engine + Adaptive Symptom Graph)
  ↓
EVIDENCE (Guideline Citations & Provenance Links)
  ↓
AI EXPLANATION (DeepSeek-V4-Flash via NVIDIA NIM)
  ↓
CARE FINDER (OpenStreetMap Nearby Clinical Facilities)
```

---

## Technology Stack

- **Frontend & Web Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling & UI**: Tailwind CSS, Lucide Icons, Glassmorphism, Framer Motion-inspired CSS animations
- **Database & Authentication**: Supabase (PostgreSQL, SSR Auth, RLS Policies, PostgREST)
- **AI & LLM Inference**: NVIDIA NIM (`deepseek-ai/deepseek-v4-flash-0731`), OpenAI SDK
- **Machine Learning**: PyTorch, ONNX Runtime, Scikit-Learn, CurxSymptomNet (Multi-Layer Perceptron)
- **Backend & Data Pipeline**: Python 3.11+, PostgREST HTTP Client, Urllib
- **Testing & QA**: Playwright (E2E Automated Browser Suite), Python `unittest`

---

## Prerequisites

- **Node.js**: `v18.17.0` or higher (Node 20+ recommended)
- **npm** or **yarn** / **pnpm**
- **Python**: `3.10` or higher
- **Supabase Account / Instance**: Active PostgreSQL instance with migration scripts applied
- **NVIDIA Developer Key**: (Optional but recommended for live LLM explanations)

---

## Environment Variables

Copy `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

### Required Variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your public Supabase anon key.

### Optional Server-Side Variables:
- `NVIDIA_API_KEY`: NVIDIA NIM API key for DeepSeek AI conversational explanations.
- `NVIDIA_BASE_URL`: Defaults to `https://integrate.api.nvidia.com/v1`.
- `NVIDIA_MODEL`: Defaults to `deepseek-ai/deepseek-v4-flash-0731`.
- `CLINPGX_API_BASE_URL`: Defaults to `https://api.clinpgx.org/v1` (public access requires no key).

---

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/curx.git
   cd curx
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Install Python dependencies** (for ingestion & ML modules):
   ```bash
   pip install -r requirements.txt # or install torch, onnxruntime, supabase-py
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NVIDIA_API_KEY
   ```

---

## Database Setup

CURX uses Supabase PostgreSQL. The schema includes tables for:
- `patients`, `patient_medications`, `patient_variants`, `patient_conditions`, `patient_symptoms`
- `medications`, `genes`, `conditions`, `symptoms`, `genetic_variants`
- `evidence_sources`, `curx_clinical_rules`, `ingestion_metadata`

To apply seed rules and initialize synthetic demo patient data:
```bash
# Seed deterministic clinical rules and synthetic demo profile
python -m backend.ingestion.ingest_drug_interactions
python -m backend.ingestion.ingest_condition_drugs
python -m backend.ingestion.seed_demo_patient
```

---

## Dataset Setup

Refer to [`docs/data_sources.md`](docs/data_sources.md) for full instructions on downloading external raw datasets (OpenFDA, RxNorm, HGNC).

To sync live guideline annotations from ClinPGx:
```bash
python -m backend.ingestion.sync_clinpgx
```

---

## Running the Application

### Development Server
```bash
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

### Production Build
```bash
npm run build
npm start
```

---

## Running Tests

### 1. TypeScript & Type Verification
```bash
npx tsc --noEmit
```

### 2. Backend Unit & Integration Tests (Python)
```bash
python -m unittest discover -s backend/tests -p "test_*.py"
```
Runs test suites for:
- Deterministic Risk Engine evaluation (`test_risk_engine.py`)
- Symptom Engine graph traversal (`test_symptom_engine.py`)
- ClinPGx Live API synchronization (`test_clinpgx_sync.py`)
- DeepSeek AI chat safety & boundary tests (`test_ai_chat.py`)

### 3. End-to-End Browser Automation Tests (Playwright)
```bash
npx playwright test
```
Tests complete browser user flows:
- Landing page & frame sequence rendering
- Authentication & route protection
- User onboarding & profile completion
- Real-time risk evaluation & evidence inspection
- AI chat drawer interaction & response streaming
- Emergency alert triggers and nearby care finder

---

## DeepSeek / NVIDIA AI Setup

The conversational explanation assistant uses `deepseek-ai/deepseek-v4-flash-0731` hosted on NVIDIA NIM.

### Architectural Boundary:
- The AI model **never calculates or modifies clinical risk**.
- All risk calculations are performed deterministically in TypeScript/Python beforehand.
- The pre-computed risk tier, score, and CPIC evidence citations are injected into the model's system prompt as immutable clinical ground truth.
- If the AI request times out or is unconfigured, a deterministic grounded fallback explanation is automatically rendered.

---

## ML / Research Model

CURX includes **CurxSymptomNet**, a deep multi-layer neural network trained on multi-label adverse symptom embeddings.
- **Model Formats**: PyTorch (`.pt`), ONNX (`.onnx`), and Scikit-Learn pipelines.
- **Location**: `models/model_v002_curxsymptomnet/`
- **Metadata**: Complete evaluation cards, calibration curves, and label encoders are stored alongside the model artifacts.

---

## Security

- **Strict Environment Isolation**: Server-side secrets (`NVIDIA_API_KEY`, `SUPABASE_SERVICE_ROLE`) are never exposed to browser bundles or client code.
- **Row-Level Security (RLS)**: Patient profiles and medical history in Supabase are isolated per authenticated `user_id`.
- **Zero Real PHI**: All demo profiles and test cases in source control use strictly synthetic, fictitious patient identities.
- **Prompt Injection Defense**: The AI chat endpoint sanitizes inputs and blocks prompt escape attempts.

---

## Limitations

- **Clinical Decision Support Only**: CURX is designed as a clinical decision support tool for informational and educational research. It is not an automated medical diagnostic device.
- **Clinician Review Required**: All medication changes, dose titrations, and variant interpretations must be confirmed by a licensed healthcare professional.

---

## License

This project is currently unlicensed for proprietary research and clinical validation. All rights reserved. (See documentation or contact repository maintainers for institutional licensing terms).
