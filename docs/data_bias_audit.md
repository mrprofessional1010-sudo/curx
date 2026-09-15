# CURX Data Bias & Fairness Audit Report

**Audit Target:** `SymptomTransformer v001` Disease Classification Model  
**Audit Dimension:** Clinical Subgroup Fairness & Systematic Representation Disparity  
**Auditor:** CURX Algorithmic Safety & Fairness Unit  
**Date:** September 2026  

---

## 1. Demographic Representation & Data Constraints

> [!IMPORTANT]
> **No patient-level demographic attributes exist in the CURX training data.**  
> The underlying dataset (`dataset.csv`) is a synthesized medical ontology mapping disease names to combinations of 133 symptom tokens. It contains no patient age, biological sex, race, ethnicity, socioeconomic status, geographic identifier, or disability status.

Consequently, standard protected-attribute fairness audits (e.g., Demographic Parity, Equalized Odds across gender or racial groups) cannot be directly calculated on this dataset without fabricating patient characteristics. In strict accordance with the non-fabrication directive, the audit was conducted across **clinically meaningful disease organ-system subgroups**.

---

## 2. Subgroup Performance Breakdown on Held-Out Test Data

Diseases were categorized into clinical categories based on ICD-10 organ system taxonomies:

| Clinical Subgroup | Test Samples ($n$) | Accuracy | Macro F1 | Macro Precision | Macro Recall | Subgroup Assessment |
|---|---|---|---|---|---|---|
| **Dermatological** | 2 | **100.0%** | 1.0000 | 1.0000 | 1.0000 | Highest accuracy (distinctive focal rash/lesion symptoms) |
| **Neurological** | 4 | **50.0%** | 0.2000 | 0.2000 | 0.2000 | Moderate accuracy; strong migraine recall |
| **Infectious Disease** | 19 | **47.37%** | 0.2944 | 0.2778 | 0.3333 | Largest clinical cohort; high AUROC for hepatitis variants |
| **Cardiovascular** | 3 | **33.33%** | 0.1667 | 0.1250 | 0.2500 | Modest sample size; heart attack vs angina overlap |
| **Musculoskeletal** | 3 | **33.33%** | 0.2000 | 0.2000 | 0.2000 | Arthritis correctly identified; spondylosis misclassified |
| **Gastrointestinal** | 7 | **14.29%** | 0.1000 | 0.1000 | 0.1000 | Substantial symptom overlap (nausea, vomiting, abdominal pain) |
| **Endocrine & Metabolic** | 4 | **0.0%** | 0.0000 | 0.0000 | 0.0000 | Complete failure; severe confusion between hyper/hypothyroidism |
| **Other / Systemic** | 4 | **0.0%** | 0.0000 | 0.0000 | 0.0000 | Diffuse non-specific symptoms |

---

## 3. Disparity Analysis & Root Causes

### 3.1 Accuracy Disparity Gap
- **Maximum Subgroup Accuracy:** 100.0% (Dermatological)
- **Minimum Subgroup Accuracy:** 0.0% (Endocrine & Metabolic, Other)
- **Subgroup Disparity Gap:** $\Delta = 1.00$ (100.0%)

### 3.2 Clinical Root Causes for Disparities
1. **Symptom Exclusivity Bias:**
   - Dermatological conditions (Acne, Psoriasis, Fungal infection) feature highly distinct, localized cutaneous symptoms (*blackheads*, *skin peeling*, *silver like dusting*) that act as near-deterministic pathognomonic markers.
   - Endocrine conditions (Diabetes, Hypothyroidism, Hypoglycemia) share generalized, non-specific constitutional symptoms (*fatigue*, *weight gain/loss*, *excessive hunger*, *sweating*) which occur across dozens of other diseases.
2. **Vocabulary Granularity Bias:**
   - The 133-symptom vocabulary has 18 distinct skin/mucosal symptom descriptors, but only 4 metabolic indicators. The feature representation itself exhibits representation bias toward superficial conditions over metabolic or endocrine dysfunction.
3. **Severe Small-Sample Variance:**
   - Because each disease has only ~1 to 2 samples in the held-out test split, a single misclassification drops category accuracy by 25% to 50%.

---

## 4. Mitigation Recommendations

1. **Multi-Task & Hybrid Routing:** For systemic, endocrine, and metabolic complaints, the system should route predictions to the deterministic rule-based engine (`symptomEngine.ts`) rather than relying on deep tabular self-attention.
2. **Laboratory & Vital Integration:** Future versions must ingest objective biomarkers (HbA1c, TSH, fasting glucose) to disambiguate endocrine disorders, as symptoms alone are clinically insufficient.
3. **Safety Disclaimers:** All model predictions are explicitly tagged with `model_status: "research_only"` and require human clinical oversight.
