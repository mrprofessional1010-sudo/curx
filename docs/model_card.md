# CURX Model Card: SymptomTransformer v001

Following the Model Cards for Model Reporting framework (Mitchell et al., 2019).

---

## 1. Model Details

- **Model Name:** CURX SymptomTransformer
- **Model Version:** `v001`
- **Release Date:** September 2026
- **Model Type:** Tabular Self-Attention Neural Network (Transformer Encoder)
- **Framework:** PyTorch 2.8.0
- **Developers:** CURX Machine Learning Research Group
- **License / Status:** Internal Research Prototype (`model_status: "research_only"`)
- **Contact / Support:** CURX Clinical Intelligence Engineering

---

## 2. Intended Use

### 2.1 Primary Intended Uses
- Algorithmic research benchmarking against deterministic clinical decision support systems (`symptomEngine.ts`).
- Generation of ranked differential diagnosis hypotheses based on reported symptom checklists.
- Evaluation of tabular self-attention vs. classical linear/tree-based architectures on structured clinical symptom taxonomies.

### 2.2 Out-of-Scope & Prohibited Uses
- **Autonomous Clinical Diagnosis:** The model is not an FDA-cleared Software as a Medical Device (SaMD) and must not be used as an independent diagnostic tool.
- **Emergency Triage Decisions:** Must not be used for life-critical emergency assessments (e.g., distinguishing STEMI from GERD during acute chest pain).
- **Prescription Decisions:** Does not evaluate drug efficacy, patient contraindications, or pharmacogenomic dosing.

---

## 3. Training & Evaluation Data

- **Underlying Dataset:** CURX Disease–Symptom Knowledge Matrix (`dataset.csv`).
- **Raw Observations:** 4,920 rows across 41 balanced classes (120 rows/class).
- **Data Deduplication:** Strict deduplication revealed that 93.9% of rows were exact duplicates. Training and evaluation were conducted exclusively on the **304 distinct symptom-disease vectors**.
- **Data Splitting:** Stratified 70% Train ($n = 212$), 15% Validation ($n = 46$), 15% Unseen Held-out Test ($n = 46$).
- **Features:** 133 binary symptom indicators weighted by clinical severity scale (1–7) from `Symptom-severity.csv`.
- **Target:** 41 distinct disease classes.

---

## 4. Performance Metrics

Evaluated on the sealed held-out test partition ($n = 46$ unseen patterns):

| Metric | Result | Interpretation |
|---|---|---|
| **Top-1 Accuracy** | **34.78%** | Hard top-1 discrete classification |
| **Balanced Accuracy** | **29.27%** | Mean recall across all 41 classes |
| **AUROC (Macro OVR)** | **0.9620** | High ranking capability; correct class almost always in top 3 |
| **AUPRC (Macro)** | **0.6415** | Precision-recall curve area under multiclass evaluation |
| **Brier Score** | **0.0202** | Low probability mean squared divergence |
| **Calibrated ECE** | **0.2042** | Expected Calibration Error with temperature $T = 0.7828$ |

---

## 5. Subgroup Fairness & Biases

- **Demographic Bias:** No patient demographics exist in the training set (no age, sex, race, geography). Performance parity cannot be evaluated across protected human classes.
- **Clinical Subgroup Disparity:** Dermatological conditions show 100% accuracy due to highly distinct physical lesions, while Endocrine conditions show 0% accuracy due to shared constitutional symptoms (fatigue, sweating).
- **Sample Size Constraints:** With only 304 unique patterns, complex multi-head attention suffers from parameter-to-sample disproportion relative to simple $L_2$ Logistic Regression.

---

## 6. Regulatory & Clinical Safety Notice

> [!CAUTION]
> **RESEARCH ONLY NOTICE**  
> This software is an experimental research prototype provided "as is" for algorithm benchmarking and academic evaluation. It has not been approved, cleared, or evaluated by the United States Food and Drug Administration (FDA), European Medicines Agency (EMA), or any regulatory authority. Medical decisions must always be made by qualified, licensed human healthcare professionals.
