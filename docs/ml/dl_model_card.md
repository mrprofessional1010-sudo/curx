# CURX Model Card: CURXSymptomNet v002

Following Mitchell et al. (2019) Model Cards for Model Reporting standards.

---

## 1. Model Details

- **Model Name:** `CURXSymptomNet`
- **Model Version:** `v002`
- **Architecture:** Hybrid Tabular Gated Set-Attention + Residual Representation + Hyperspherical Class Prototypes
- **Parameters:** 76,694 trainable weights (~300 KB)
- **Framework:** PyTorch 2.8.0
- **Release Status:** Research & Clinical Benchmarking Only (`model_status: "research_only"`)
- **Developer:** CURX Clinical Machine Learning Research Group

---

## 2. Intended Use

### 2.1 Primary Intended Use
- Generation of relative condition rankings (Top-1, Top-3, Top-5 differential diagnoses) based on patient-reported symptom vectors.
- Clinical decision support hypothesis generation.
- Evaluation of tabular set embeddings and prototype metric learning on structured medical symptom taxonomies.

### 2.2 Prohibited Use Cases
- Autonomous medical diagnosis or prescriptive decision making without licensed physician oversight.
- Direct-to-consumer emergency medical triage.

---

## 3. Data Integrity & Leakage Discipline

- **Underlying Dataset:** `dataset.csv` (41 disease classes, 133 symptoms).
- **Leakage Prevention:** Pruned 93.82% exact duplicates to 304 distinct symptom vectors before partitioning.
- **Data Partitioning:** Stratified 70/15/15 (212 Train, 46 Validation, 46 Sealed Test).
- **Augmentation Protocol:** Train-only symptom dropout ($p = 0.15$) and continuous severity perturbation. Validation and test partitions were kept strictly unaugmented and untouched until final evaluation.

---

## 4. Performance Summary

Evaluated on the sealed held-out test partition ($n = 46$ unseen patterns):

| Metric | Result | Benchmark Significance |
|---|---|---|
| **Top-1 Accuracy** | **86.96%** | +52.18% over initial transformer (34.78%) |
| **Top-3 Accuracy** | **93.48%** | High ranking fidelity |
| **Top-5 Accuracy** | **100.0%** | Complete differential hypothesis coverage |
| **Macro AUROC** | **0.9995** | Exceptional discrimination across all 41 classes |
| **Macro AUPRC** | **0.9878** | Precision-recall curve area |
| **Macro F1 Score** | **0.8081** | Balanced multiclass performance |
| **Clinical Sensitivity** | **85.37%** | Macro recall across disease classes |
| **Clinical Specificity** | **99.67%** | Low false positive rate |
| **Calibrated ECE** | **0.0541** | Well-calibrated posterior probabilities ($T = 0.4353$) |

---

## 5. Regulatory & Clinical Safety Warning

> [!CAUTION]
> **RESEARCH ONLY NOTICE:**  
> This software is an experimental algorithm benchmark. It is not approved, cleared, or regulated by the FDA, EMA, or any healthcare authority as Software as a Medical Device (SaMD). All predictions represent statistical pattern associations and must be verified by a licensed medical practitioner.
