# CURX Data Source Authority Model & Clinical Hierarchy

This document defines the strict authoritative source hierarchy and data honesty principles for the CURX Clinical Decision-Support & Medication Intelligence Platform.

---

## 1. Authoritative Clinical Hierarchy

Every data domain in CURX has a single designated primary authority and secondary normalization/enrichment sources:

| Clinical / Data Domain | Primary Authoritative Source | Secondary / Normalization Source | Role & Usage Boundaries |
| :--- | :--- | :--- | :--- |
| **Disease / Symptom Mapping** | Disease/Symptom Dataset (`dataset.csv`, `Symptom-severity.csv`, `symptom_Description.csv`, `symptom_precaution.csv`) | Clinical Phenotype Weights | Maps symptoms to candidate conditions & powers deterministic question selection. **Never called a medical diagnosis.** |
| **Medication Identity** | Normalized CURX Medication Dataset (`Medicine_Details.csv`) | RxNorm Prescribable Content (`RXNCONSO.RRF`) | Resolves multi-source brand/generic names and formulations to canonical RxNorm CUIs. |
| **Human Gene Identity** | HGNC Complete Set (`hgnc_complete_set.txt`) | HGNC Symbol & Alias Map | Authoritative standard for gene symbols, locus groups, and chromosomal locations. |
| **Gene–Drug Clinical Evidence** | CPIC Guidelines (`cpic guide lines.tsv` + CPIC API) | ClinPGx / PharmGKB API (Cached) | Validated pharmacogenomic guidelines & allele-specific risk rules (`*2`, `*3`, `*4`, etc.). |
| **Drug–Drug Interactions** | Designated Interaction Dataset (`drug_drug_interactions.csv`) | OpenFDA Label Evidence | Pairwise Drug A ↔ Drug B interaction mechanisms and severity tiers (`LOW`, `MODERATE`, `HIGH`, `SEVERE`). |
| **Condition–Drug Rules** | CURX Curated Condition–Drug Rules (`condition_drug_rules.csv`) | OpenFDA / CPIC Supporting Evidence | Explicit clinical contraindications & precaution rules. |
| **Drug Label Documents** | openFDA Structured Product Labels (`drug-label-0001` to `0014`) | N/A | Full-text label enrichment & supporting clinical evidence only. **Never generates autonomous rules.** |
| **Facility Discovery** | OpenStreetMap (Nominatim Geocoding + Overpass API) | Local Server Cache | Real facility geocoding and specialty lookup without fabricated doctor rankings. |

---

## 2. Core Clinical Principles

1. **Dual-Plane Separation**:
   - **Plane 01 (Deterministic Safety Plane)**: Calculates risk tiers (`LOW`, `MODERATE`, `HIGH`, `SEVERE`) using only explicit, structured rules.
   - **Plane 02 (Language / Explanation Plane)**: Explains the pre-computed structured trace. The LLM *never* computes or modifies risk tiers.

2. **OpenFDA Separation**:
   - OpenFDA label text is stored in `drug_label_documents` and `drug_label_sections`.
   - It enriches medications with official FDA labeling (indications, boxed warnings, adverse reactions).
   - It supports existing validated rules with source evidence but **never automatically generates clinical rules**.

3. **Multi-Source Medication Normalization**:
   - Medications from various datasets (Kaggle, RxNorm, openFDA, ClinPGx) are resolved to a single canonical entity with source mappings preserved in `medication_source_mappings`.
