# CURX Deep Learning Target Accuracy Evaluation: The 99% Benchmark

**Document ID:** `CURX-REPORT-ACCURACY-99`  
**Target Metric:** $\ge 99.0\%$ Test Accuracy  
**Achieved Test Accuracy:** **34.78%** (Deep Learning `SymptomTransformer`) / **97.8%** (Logistic Regression Baseline)  
**Status:** **TARGET NOT ACHIEVED WITHOUT DATA CONTAMINATION (LEAKAGE)**  
**Verdict:** SCIENTIFICALLY DEFENSIBLE REALITY AUDIT

---

## 1. Executive Determination

The user specification established a benchmark target of **99% accuracy**.

Following complete implementation, training, calibration, and blind held-out testing on genuine, non-fabricated CURX datasets:
- **Did the deep learning model achieve 99% test accuracy?**  
  **NO.** The true, defensible test accuracy on held-out deduplicated data is **34.78%** (Macro AUROC: **0.9620**).
- **Could a model be made to report >99% accuracy on this dataset?**  
  **YES — but only through fraudulent methodology (train-test data leakage).** If the raw 4,920-row dataset is split randomly without deduplication, virtually all test rows are identical duplicates of training rows, producing an artificial, scientifically invalid metric of **100.0%**.

In adherence to the strict instruction:
> *"Do NOT manufacture labels. Do NOT fabricate ground truth. Report real performance honestly."*

we report the scientifically defensible findings below.

---

## 2. Mathematical & Forensic Root Causes

### 2.1 The Duplication Illusion (93.9% Exact Clones)
The raw dataset `dataset.csv` contains 4,920 rows. However, forensic analysis shows:
- Exactly **304 unique symptom combinations** exist across the entire 4,920 rows.
- Each unique combination was duplicated between 10 and 20 times to simulate 120 rows per disease.
- If a practitioner splits the 4,920 rows using standard `train_test_split(test_size=0.2)` without deduplication:
  $$\mathbb{P}(\mathbf{x}_{\text{test}} \in \mathcal{D}_{\text{train}}) \approx 1 - \left(1 - \frac{1}{N_{\text{unique}}}\right)^{N_{\text{train}}} > 0.9999$$
  The test set is not unseen. The model is merely tested on memorized keys, yielding a spurious 99.8%–100.0% accuracy.

### 2.2 True Sample Density: ~7.4 Samples Per Class
When duplicate rows are strictly pruned before partitioning:
- Total unique patterns: **304**
- Number of classes: **41**
- Average patterns per class: $\frac{304}{41} \approx 7.41$
- Training partition (70%): $212$ samples ($\sim 5.1$ samples per class)
- Test partition (15%): $46$ samples ($\sim 1.1$ samples per class)

Predicting 41 fine-grained disease classes with only 5 training vectors per class is an extreme few-shot regime.

### 2.3 Tabular Transformer vs. Classical Convex Solvers
The deep tabular transformer has **111,465 parameters**. In contrast:
- $L_2$ Logistic Regression has 5,453 parameters and convex optimization, achieving **100% validation** and **97.8% test accuracy** because 41 classes can be separated by linear hyperplanes in 133 dimensions.
- The deep transformer requires larger sample sizes to stabilize self-attention query-key weights without over-smoothing.
- Despite achieving 34.78% hard Top-1 accuracy, the transformer achieved **0.9620 Macro AUROC**, indicating that the correct condition is almost always within its top-tier differential hypotheses.

---

## 3. Comparison of Models on Clean Held-Out Data

| Model Architecture | Parameter Count | Training Samples | Top-1 Test Accuracy | Macro AUROC | Log Loss | 99% Achieved? |
|---|---|---|---|---|---|---|
| **Logistic Regression ($L_2$)** | 5,453 | 212 | **97.83%** | **1.0000** | 0.0901 | Close (97.8%) |
| **Random Forest (100 trees)** | Non-parametric | 212 | **95.65%** | **1.0000** | 0.2899 | Close (95.7%) |
| **Gradient Boosting (sklearn)** | Tree ensemble | 212 | **91.30%** | **0.9982** | 0.1859 | No (91.3%) |
| **XGBoost** | Tree ensemble | 212 | **89.13%** | **0.9946** | 0.4283 | No (89.1%) |
| **LightGBM** | Tree ensemble | 212 | **69.57%** | **0.9813** | 1.3143 | No (69.6%) |
| **SymptomTransformer (DL)** | 111,465 | 212 | **34.78%** | **0.9620** | 2.1402 | No (34.8%) |

---

## 4. Path to True 99% Accuracy in Production

To genuinely achieve $\ge 99\%$ accuracy without data leakage in real clinical deployment:
1. **Acquire Diverse Real Clinical Encounters:** Replace synthetic ontology matrices with at least 50,000 de-identified electronic health records (EHR).
2. **Expand Multimodal Inputs:** Symptom check-lists alone lack clinical specificity. Incorporate objective lab values (CBC, metabolic panels, AST/ALT), vital signs, and patient medical history.
3. **Ensemble Architecture:** Combine the linear discriminative power of $L_2$ Logistic Regression with the relational attention heads of the Tabular Transformer.
