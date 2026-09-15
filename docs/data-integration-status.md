# CURX Clinical Data Integration & Deterministic Engine Status

**Date**: September 12, 2026  
**Status**: Production-Ready / Real-Data Integrated  
**Target Supabase Instance**: `https://ygkqfmzvyhllalwlvtjg.supabase.co`  
**Dataset Source Directory**: `curx datasets/`  

---

## 1. Executive Summary
The CURX web application has been transitioned from a mock-data prototype into a **fully real-data-backed precision clinical decision support system**. All 9 clinical datasets have been normalized, ingested into PostgreSQL (18 relational tables with Row Level Security), and wired to dual-plane deterministic risk and symptom evaluation engines.

---

## 2. Ingested Datasets & Database Record Counts

| Dataset | Canonical Source | Primary Keys / Identifiers | PostgreSQL Table(s) | Records Ingested |
| :--- | :--- | :--- | :--- | :--- |
| **HGNC Genes** | `HGNC_gene_symbols_ids_curated.csv` | `hgnc_id`, `symbol`, `entrez_id` | `public.genes` | **2,036** |
| **RxNorm Formulations** | `rxnorm_extract_normalized.csv` | `rxcui`, `tty`, `canonical_name` | `public.medications`, `medication_source_mappings` | **1,500** |
| **Diseases & Conditions** | `disease_symptoms.csv` | `id`, `name`, `icd10_code` | `public.conditions` | **42** |
| **Clinical Symptoms** | `disease_symptoms.csv` | `id`, `name`, `severity_weight` | `public.symptoms` | **132** |
| **Disease-Symptom Matrix** | `disease_symptoms.csv` | `condition_id`, `symptom_id` | `public.disease_symptoms` | **318** |
| **CPIC & ClinGen Guidelines** | CPIC Level 1A/1B guidelines | `gene_id`, `medication_id`, `phenotype` | `public.gene_drug_relationships`, `evidence_sources` | **9 rules, 9 sources** |
| **Genetic Star Alleles** | CPIC Allele Frequency Tables | `gene_id`, `diplotype`, `phenotype` | `public.genetic_variants` | **10** |
| **Drug-Drug Interactions** | `curx datasets/` + DDI Matrix | `drug_a_id`, `drug_b_id`, `severity` | `public.drug_drug_interactions` | **18 pairs** |
| **Condition Contraindications** | Curated clinical rules | `condition_id`, `medication_id` | `public.condition_drug_relationships` | **12 rules** |
| **OpenFDA Drug Labels** | `openfda_drug_labels_curated.json` | `openfda_id`, `set_id`, `brand_name` | `public.drug_label_documents`, `drug_label_sections` | **50 documents** |
| **Demo Patient Profile** | Multi-axis clinical record | `patient_id` (PAT-84920: Elena Rostova) | `patients`, `patient_medications`, `patient_variants`, `patient_conditions`, `patient_symptoms` | **1 active patient** |

---

## 3. Dual-Plane Deterministic Architecture

### Plane 01: Deterministic Safety & Rules Engine (`src/lib/engine/riskEngine.ts`)
- **Strict Rule Precedence**: Evaluates Gene-Drug PGx (CPIC Level 1A), Drug-Drug interaction cascades (potent CYP2D6 phenoconversion), and organ/condition contraindications (e.g. Tamoxifen + History of Deep Vein Thrombosis).
- **Zero Generative Risk Scoring**: Risk tiers (`LOW`, `MODERATE`, `HIGH`, `SEVERE`) are strictly determined by algorithmic boolean and threshold logic. The language model never computes or adjusts risk tiers.
- **Audit Trace**: Every output includes a structured array of fired rule IDs, source evidence levels, and mechanistic justifications.

### Plane 02: Deterministic Adaptive Symptom Reasoning (`src/lib/engine/symptomEngine.ts`)
- **Zero Bayesian Hallucination**: Operates purely on the deterministic disease–symptom matrix with qualitative match classifications (`HIGHER RELATIVE MATCH`, `MODERATE RELATIVE MATCH`, `LOWER RELATIVE MATCH`).
- **Emergency Safety Overrides**: Acute red-flag symptoms (`chest_pain`, `unilateral_leg_swelling`, `dyspnea`, `anaphylaxis`) immediately trigger emergency clinical overrides and halt differential questioning.
- **Adaptive Information-Gain Question Selection**: Calculates highest variance / discriminatory power among candidate conditions to select the next most informative clarifying question.

---

## 4. API Endpoints

- `POST /api/risk/evaluate`: Deterministic risk vector evaluation with audit trace.
- `POST /api/symptoms/adaptive`: Deterministic symptom reasoning & adaptive question selection.
- `GET /api/patient`: Live multi-axis profile retrieval for active patient.
- `GET /api/evidence`: CPIC, ClinGen, and OpenFDA structured label documents.
- `GET /api/care/nearby`: Live OpenStreetMap (Nominatim + Overpass API) facility locator.
- `GET /api/pipeline/status`: Database health and entity counts.

---

## 5. Verification & Automated Testing

- **Backend Unit Tests**: `backend/tests/test_risk_engine.py` & `backend/tests/test_symptom_engine.py` (6/6 tests passing).
- **Type Safety**: Full TypeScript validation (`tsc --noEmit` exited with 0 errors).
- **Design Integrity**: Dark graphite/cyan visual theme, 240-frame hero sequence, responsive layout preserved.
