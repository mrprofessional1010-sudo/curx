# CURX Clinical Data Sources & Ingestion Guide

This document outlines the official data sources, licensing, file formats, and ingestion procedures used by the CURX clinical decision support platform.

---

## 1. Data Source Inventory

| Dataset / Source | Authority | Official URL / Ingestion Method | File Format | Role in CURX |
| :--- | :--- | :--- | :--- | :--- |
| **CPIC Guidelines** | Clinical Pharmacogenetics Implementation Consortium | [cpicpgx.org](https://cpicpgx.org) / ClinPGx API | REST API / TSV | Authoritative Gene–Drug dosing & collision guidelines |
| **ClinPGx Live API** | Clinical Pharmacogenomics Knowledgebase | [api.clinpgx.org/v1](https://api.clinpgx.org/v1) | JSON REST API | Live guideline annotations, chemical accession mapping, and variant lookups |
| **OpenFDA Drug Labels** | US Food & Drug Administration | [open.fda.gov/apis/drug/label](https://open.fda.gov/apis/drug/label/) | JSON (partitioned zips) | Pharmacogenomic boxed warnings, precautions, contraindications |
| **RxNorm** | US National Library of Medicine (NLM) | [nlm.nih.gov/research/umls/rxnorm](https://www.nlm.nih.gov/research/umls/rxnorm/) | UMLS RRF / Normalized Text | Canonical RxCUI medication identifiers and brand/generic normalization |
| **HGNC Gene Names** | HUGO Gene Nomenclature Committee | [genenames.org](https://www.genenames.org/download/archive/) | TSV / JSON | Approved human gene symbols, NCBI Entrez IDs, Ensembl IDs |
| **Curated Clinical Rules** | CURX Pharmacological Knowledgebase | `backend/seed_data/` | CSV | Deterministic Drug–Drug and Condition–Drug interaction matrices |

---

## 2. Dataset Classification & Storage Policy

| Classification | Location | Git Policy | Rationale |
| :--- | :--- | :--- | :--- |
| **Large Raw Archives** | `curx datasets/*.zip` | **EXCLUDED (.gitignore)** | OpenFDA label dumps (~1.9GB) and RxNorm monthly archives (~75MB) exceed GitHub recommended file size limits and are reproducible from upstream mirrors. |
| **Curated Seed Rules** | `backend/seed_data/*.csv` | **COMMITTED** | Compact, deterministic domain rules (<10KB) essential for reproducible offline engine operation. |
| **Data Catalog Schemas** | `backend/data_catalog/` | **COMMITTED** | JSON schema mappings and inventory manifests describing entity normalization logic. |
| **Synthetic Demo Data** | `backend/ingestion/seed_demo_patient.py` | **COMMITTED** | 100% synthetic clinical test profile ("Elena Rostova") with no PHI. |

---

## 3. Data Ingestion & Synchronization Pipelines

### Prerequisites
Ensure your `.env.local` contains valid Supabase database configuration:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Running the Complete Pipeline
To ingest all canonical datasets into Supabase:
```bash
# Execute master ingestion pipeline
python -m backend.ingestion.run_pipeline
```

### Ingesting Specific Components

1. **HGNC Human Gene Nomenclature**:
   ```bash
   python -m backend.ingestion.ingest_hgnc
   ```

2. **Medications & RxNorm Normalization**:
   ```bash
   python -m backend.ingestion.ingest_medications
   ```

3. **CPIC / ClinPGx Pharmacogenomic Guidelines**:
   ```bash
   python -m backend.ingestion.ingest_cpic_clinpgx
   ```

4. **ClinPGx Live API Sync**:
   ```bash
   python -m backend.ingestion.sync_clinpgx
   ```

5. **OpenFDA Genomic Warnings**:
   ```bash
   python -m backend.ingestion.ingest_openfda
   ```

6. **Deterministic DDI & Condition-Drug Rules**:
   ```bash
   python -m backend.ingestion.ingest_drug_interactions
   python -m backend.ingestion.ingest_condition_drugs
   ```

7. **Symptom Knowledge Graph & Embeddings**:
   ```bash
   python -m backend.ingestion.ingest_symptoms
   ```

8. **Seed Synthetic Test Persona**:
   ```bash
   python -m backend.ingestion.seed_demo_patient
   ```

---

## 4. Upstream Data Licensing & Citation

- **CPIC**: Public domain open-access guidelines under CC0 1.0 Universal.
- **ClinPGx**: Open clinical pharmacogenomics resource.
- **OpenFDA**: US Government public open data (FDA API Terms of Service).
- **RxNorm**: Data courtesy of the U.S. National Library of Medicine (NLM), NIH, Department of Health and Human Services.
- **HGNC**: European Bioinformatics Institute (EMBL-EBI) and Wellcome Trust.
