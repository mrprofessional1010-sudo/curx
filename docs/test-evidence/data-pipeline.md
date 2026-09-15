# CURX Test Evidence — Data Ingestion Pipeline & Normalization

**Pipeline Location**: `backend/ingestion/`  
**Master Script**: `python -m backend.ingestion.run_pipeline`  
**Source Directory**: `curx datasets/` & `backend/seed_data/`  
**Idempotence Guarantee**: SHA-256 Content Hashing verified against `public.data_ingestion_runs`.

---

## 1. Verified Source Dataset Audits

| Dataset Name | Source File | SHA-256 Hash | Raw Rows Seen | Ingested Rows | Provenance / Authority | Ingestion Audit ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HGNC Human Genes** | `curx datasets/HGNC_gene_symbols_ids_curated.csv` | `9e07bb4939...` | 45,054 | **2,036** | HUGO Gene Nomenclature Committee | `4a1c9864-...` |
| **Disease-Symptom Matrix** | `curx datasets/disease_symptoms.csv` | `327bd46217...` | 318 | **318** | Curated Disease-Symptom Links | `fe9b4b64-...` |
| **CURX RxNorm Catalog** | `curx datasets/rxnorm_extract_normalized.csv` | `3aeff6ad0a...` | 1,500 | **1,500** | NLM RxNorm Clinical Formulations | `662d19b1-...` |
| **CPIC Guidelines** | CPIC Level 1A/1B tables | `7d061e11f8...` | 9 | **9** | CPIC & PharmGKB Knowledgebase | `c45b4f50-...` |
| **Drug-Drug Interactions** | Curated collision matrix | `61b5c9e1b3...` | 18 | **18** | Pharmacokinetic Interaction Matrix | `a7bd7b66-...` |
| **Condition-Drug Rules** | `backend/seed_data/condition_drug_rules.csv` | `045c7de12f...` | 22 | **4** | FDA Black Box Warnings / ACG / AHA Guidelines | `91de664f-...` |
| **OpenFDA Product Labels** | `curx datasets/openfda_drug_labels_curated.json` | `3473d86de6...` | 50 | **50** | US FDA Structured Product Label API | `e6e4cb8a-...` |

---

## 2. Normalization & Provenance
- **RxNorm Identifier Resolution**: Canonical drugs stored with `rxcui` and term types (`tty` e.g., `SCD`, `IN`). Source mapping stored in `public.medication_source_mappings`.
- **Condition-Drug Contraindications**: Maps canonical condition ID to medication ID with contraindication risk levels (`SEVERE` / `HIGH`) and mechanistic explanations.
- **HGNC Gene Symbols**: Official HGNC IDs, Entrez Gene IDs, and Ensemble IDs cross-indexed.
- **Idempotence Verified**: Running `run_pipeline.py` multiple times skips existing unmodified datasets by checking matching content hashes in `data_ingestion_runs`.
