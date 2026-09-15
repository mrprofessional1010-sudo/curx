# CURX Data Audit & Ground Truth Integrity Report

**Author:** CURX Machine Learning Research Group  
**Date:** September 2026  
**Status:** COMPLETED & VERIFIED  
**Scope:** Exhaustive audit of all data sources in the CURX workspace for supervised machine learning readiness.

---

## 1. Executive Summary

An exhaustive audit of all data assets present in the CURX repository was conducted to determine what supervised learning tasks are genuinely supported by real data. 

**Key Conclusion:**
Only **one dataset** contains ground-truth labels suitable for supervised learning: the **Disease–Symptom Matrix** (`dataset.csv`). All other assets (OpenFDA drug labels, HGNC gene sets, CPIC guidelines, RxNorm concepts, and curated interaction rules) are reference catalogs, unstructured document corpora, or rule tables.

Furthermore, forensic analysis of the Disease–Symptom Matrix revealed that out of **4,920 recorded rows**, only **304 rows are distinct** (93.9% exact duplicates). Training models on the raw duplicated data yields artificially inflated metrics (~100% accuracy) due to severe train-test leakage. To guarantee scientific validity and clinical defensibility, strict deduplication prior to splitting was enforced, leaving 304 unique symptom patterns distributed across 41 disease classes (~7.4 unique vectors per class).

---

## 2. Complete Inventory of CURX Datasets

| Dataset Asset | Physical Location / Archive | Raw Count | Form | Target / Supervised Label | ML Readiness Status |
|---|---|---|---|---|---|
| **Disease–Symptom Matrix** | `curx dataset symptom.zip/dataset.csv` | 4,920 rows × 18 cols | CSV | `Disease` (41 classes) | **Supervised Ready** (requires deduplication) |
| **Symptom Severity Index** | `curx dataset symptom.zip/Symptom-severity.csv` | 133 rows × 2 cols | CSV | N/A (Weighting feature 1–7) | **Feature Transformer Ready** |
| **Symptom Descriptions** | `curx dataset symptom.zip/symptom_Description.csv` | 41 rows × 2 cols | CSV | Disease descriptions | **Reference Text Only** |
| **Symptom Precautions** | `curx dataset symptom.zip/symptom_precaution.csv` | 41 rows × 5 cols | CSV | Up to 4 precautions/disease | **Clinical Rules / Reference** |
| **Medication Catalog** | `Drug Dataset.zip/Medicine_Details.csv` | 11,825 rows × 9 cols | CSV | Drug metadata, uses, side effects | **Reference Catalog** (No patient outcomes) |
| **HGNC Gene Nomenclature** | `hgnc_complete_set.txt` | 45,054 rows × 52 cols | TSV | Genomic identifiers | **Genomic Reference Only** |
| **CPIC Guidelines** | `cpic guide lines.tsv` | 29 rows × 3 cols | TSV | Gene–drug guideline mappings | **Corrupted Data** (`[object Object]` values) |
| **CPIC OpenAPI Spec** | `response_1789210740592.json` | Swagger/OpenAPI | JSON | API schema definitions | **Schema Only** |
| **OpenFDA Drug Labels** | `drug-label-0001-of-0014.json.zip` (14 parts) | ~250,000 JSON documents | JSON (~1.9 GB) | Unstructured regulatory text | **Corpus for Future NLP / Information Extraction** |
| **Condition–Drug Rules** | `backend/seed_data/condition_drug_rules.csv` | 21 rows × 7 cols | CSV | Rule engine contraindications | **Deterministic Rule Seed** |
| **Drug–Drug Interactions** | `backend/seed_data/drug_drug_interactions.csv` | 21 rows × 7 cols | CSV | Severity-coded pairwise DDI | **Deterministic Rule Seed** |
| **RxNorm Concepts** | `RxNorm_full_prescribe_09082026.zip` | ~140,000 concepts | RRF | Unified medical vocabulary | **Ontology / Normalization Only** |

---

## 3. Forensic Analysis: Disease–Symptom Matrix (`dataset.csv`)

### 3.1 Raw Matrix Structure
- **Columns:** `Disease`, `Symptom_1`, `Symptom_2`, ..., `Symptom_17`.
- **Raw Observations:** 4,920 rows.
- **Disease Classes:** Exactly 41 distinct diseases.
- **Raw Balance:** Exactly 120 rows per disease class (artificially synthesized balance).
- **Missingness:** 53.1% of cells in columns `Symptom_1` through `Symptom_17` are null/empty, reflecting that typical disease profiles comprise 3 to 9 symptoms rather than 17.

### 3.2 Duplication & Leakage Hazard
A hashing and deduplication pass over all symptom feature tuples revealed:
- **Total rows:** 4,920
- **Unique feature-label combinations:** **304**
- **Duplicate rows:** 4,616 (93.82% duplication rate)
- **Per-class unique samples:** 5 to 10 unique symptom patterns per disease (mean: 7.41, median: 7.0).

> [!CRITICAL]
> If a standard random train/test split is applied to the raw 4,920 rows, **virtually 100% of the test samples are identical duplicates of samples present in the training set**. Any model trained on such a split achieves >99% test accuracy simply by memorizing 304 discrete keys. This is **train-test contamination (leakage)**.

### 3.3 Target Definition & Clinical Task
- **Supported Supervised Task:** Multi-class tabular classification mapping a binary or severity-weighted vector of reported symptoms $\mathbf{x} \in \mathbb{R}^{133}$ to disease probability distribution $\hat{\mathbf{y}} \in \Delta^{41}$.
- **Clinical Role:** Algorithmic symptom checking and clinical hypothesis generation.
- **Non-supported Tasks:** Patient-level risk prediction, pharmacogenomic phenotype classification, hospitalization length-of-stay, or adverse drug event forecasting (no longitudinal or individual patient records exist).

---

## 4. Leakage Prevention Protocol

To ensure valid evaluation:
1. **Strict Deduplication:** The dataset was deduplicated to the 304 unique symptom vectors before any train/validation/test partitioning.
2. **Stratified Partitioning:** A stratified 70% Train (212 samples), 15% Validation (46 samples), and 15% Unseen Test (46 samples) split was executed with fixed random seeds (`seed=42`).
3. **No Target Leakage in Features:** Feature representation uses only clinical severity weights derived from the independent `Symptom-severity.csv` index.
4. **Feature Space Normalization:** Preprocessing transforms and scalers were fit strictly on the training partition.
5. **Sealed Test Set:** The test partition was kept sealed until final post-calibration evaluation.

---

## 5. Corrupted & Incomplete Data Assets

1. **CPIC Guidelines (`cpic guide lines.tsv`):**
   - Contains 29 rows.
   - Cells in column `guideline` contain literal serialized JavaScript object strings: `"[object Object]"`.
   - Action: Excluded from ML training; deterministic fallback remains in rule catalog.
2. **OpenFDA Drug Labels:**
   - 14 zip archives containing ~250,000 regulatory submissions.
   - Text is non-standardized narrative descriptions of indications, precautions, and adverse reactions.
   - Action: Categorized as unstructured reference corpus; not suitable for direct tabular classification without extensive NER/LLM extraction pipeline.
