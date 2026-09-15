# CURX — GitHub Repository Manifest & Publication Report

## 1. Repository Metadata

| Property | Value |
| :--- | :--- |
| **Repository Name** | `curx` (or `curx-platform`) |
| **Default Branch** | `main` |
| **Target Remote** | `origin` |
| **License Status** | Unlicensed (Proprietary Clinical Research & Decision Support) |
| **Framework** | Next.js 14 (App Router) + Supabase PostgreSQL + NVIDIA NIM |

---

## 2. Technology Stack

- **Frontend Application**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database & Auth**: Supabase PostgreSQL, Row Level Security, Supabase SSR Auth
- **AI & LLM Acceleration**: NVIDIA NIM (`deepseek-ai/deepseek-v4-flash-0731`)
- **Machine Learning**: PyTorch (`CurxSymptomNet`), ONNX Runtime, Scikit-Learn
- **Data Ingestion**: Python 3.11+, PostgREST, Urllib (CPIC, ClinPGx, OpenFDA, RxNorm, HGNC)
- **Quality Assurance**: Playwright Browser Automation (E2E), Python `unittest`

---

## 3. Environment Variables Reference

| Variable | Scope | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | **Required** | Supabase Project REST URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server | **Required** | Public Supabase Anonymous API Key |
| `NVIDIA_API_KEY` | Server-Side Only | Optional (Recommended) | NVIDIA NIM API Key for DeepSeek LLM Inference |
| `NVIDIA_BASE_URL` | Server-Side Only | Optional | Defaults to `https://integrate.api.nvidia.com/v1` |
| `NVIDIA_MODEL` | Server-Side Only | Optional | Defaults to `deepseek-ai/deepseek-v4-flash-0731` |
| `CLINPGX_API_BASE_URL` | Server-Side Only | Optional | Defaults to `https://api.clinpgx.org/v1` |

---

## 4. Setup & Replication Instructions

```bash
# 1. Clone repository
git clone <repository-url>
cd curx

# 2. Install Node dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

---

## 5. Dataset Setup & Ingestion

CURX incorporates canonical pharmacogenomic and clinical pharmacology datasets:
1. **Curated Deterministic Rules**: Stored in `backend/seed_data/` and loaded automatically during migration.
2. **ClinPGx Guidelines**: Synchronized live using `python -m backend.ingestion.sync_clinpgx`.
3. **OpenFDA & RxNorm Archives**: Documented in [`docs/data_sources.md`](data_sources.md).

---

## 6. Verification & Testing Suite

| Test Suite | Command | Coverage |
| :--- | :--- | :--- |
| **TypeScript Typecheck** | `npx tsc --noEmit` | Strict type safety across all components and API routes |
| **Production Build** | `npm run build` | Zero-error Next.js production build for all 19 routes |
| **Python Unit Tests** | `python -m unittest discover -s backend/tests -p "test_*.py"` | 24/24 unit tests for Risk Engine, Symptom Engine, ClinPGx Sync, and AI Chat boundaries |
| **Playwright E2E Tests** | `npx playwright test` | 9/9 automated browser scenarios verifying end-to-end user flows |

---

## 7. Security & Privacy Audit

- **Secret Sanitization**: Verified 0 hardcoded secrets across all tracked source files, scripts, and documentation.
- **Protected Environment Files**: `.env`, `.env.local`, `.env.production` are strictly excluded in `.gitignore`.
- **Zero Protected Health Information (PHI)**: All patient personas (e.g., "Elena Rostova") in demo seeds and tests are 100% synthetic.
- **Strict Boundary Enforcement**: DeepSeek AI inference is strictly isolated from risk scoring calculations, preventing unauthorized clinical hallucination.

---

## 8. Excluded & Ignored Files

The following files and directories are explicitly excluded via `.gitignore`:
- `curx datasets/` (~2GB of external OpenFDA zip dumps and RxNorm archives)
- `node_modules/`, `.next/`, `build/`, `dist/`
- `.env*` files (except `.env.example`)
- `scratch/`, `test-results/`, `playwright-report/`
- `frames/` (root duplicate of `public/frames/`)
- `curx-jpg (1).zip` (raw archive)
- `__pycache__/`, `*.pyc`, `.pytest_cache/`
- IDE and OS temporary files (`.DS_Store`, `Thumbs.db`, `.vscode/`)

---

## 9. Known Limitations

- **Decision Support Scope**: CURX is designed as a clinical decision support tool for informational and research purposes, not an autonomous medical device.
- **Live ClinPGx Rate Limits**: Upstream public API endpoints are throttled to 2.0 requests per second as per official ClinPGx guidelines.
