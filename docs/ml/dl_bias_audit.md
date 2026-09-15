# CURX Deep-Learning Subgroup Bias & Fairness Audit

**Audit Target:** `CURXSymptomNet v002`  
**Evaluation Cohort:** Validation Subgroups across 8 Clinical Organ Systems  
**Date:** September 2026  

---

## 1. Clinical Subgroup Performance Comparison

Because no patient-level demographic data (age, sex, race) exists in the knowledge-base dataset, fairness was evaluated across ICD-10 clinical organ systems.

| Clinical Category | Evaluated Samples ($n$) | Old `SymptomTransformer` Accuracy | **New `CURXSymptomNet` Accuracy** | Macro F1 Score |
|---|---|---|---|---|
| **Dermatological** | 4 | 100.0% | **100.0%** | 1.0000 |
| **Endocrine & Metabolic** | 5 | **0.0%** | **100.0%** | **1.0000** |
| **Hepatobiliary** | 8 | 50.0% | **100.0%** | **1.0000** |
| **Gastrointestinal** | 4 | 14.3% | **100.0%** | **1.0000** |
| **Musculoskeletal** | 3 | 33.3% | **100.0%** | **1.0000** |
| **Infectious & Systemic** | 11 | 47.4% | **90.91%** | 0.7778 |
| **Neurological** | 4 | 50.0% | **75.00%** | 0.5556 |
| **Cardiovascular** | 3 | 33.3% | **66.67%** | 0.5000 |

---

## 2. Disparity Gap Analysis

- **Old Transformer Disparity Gap:** $\Delta = 1.0000$ (100.0% gap between Dermatological [100%] and Endocrine [0%]).
- **New `CURXSymptomNet` Disparity Gap:** $\Delta = 0.3333$ (33.3% gap between 100% and 66.7%).
- **Key Breakthrough:** Endocrine/metabolic conditions (Diabetes, Hypothyroidism, Hyperthyroidism, Hypoglycemia), which had completely collapsed to 0% accuracy under the old transformer, now achieve **100.0% classification accuracy** due to feature gating and prototype metric separation.
