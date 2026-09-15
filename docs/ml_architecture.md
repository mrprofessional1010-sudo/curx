# CURX Deep Learning Architecture Specification

**Model Name:** `SymptomTransformer`  
**Architecture Family:** Tabular Self-Attention Transformer  
**Target Application:** Multi-class Disease Classification from Clinical Symptom Profiles  
**Version:** `v001`

---

## 1. Architectural Philosophy & Design Rationale

Tabular medical data presents distinct inductive bias requirements compared to computer vision or sequential language modeling. In disease-symptom mapping:
1. Symptoms do not occur in an arbitrary sequence; they form an unordered set with complex multi-way co-occurrence dependencies (syndromes).
2. The dataset size is modest (304 unique patterns across 41 classes after strict deduplication). Oversized models suffer from catastrophic overfitting and high sample variance.
3. Feature interactions (e.g., *fever* + *chills* + *cough* pointing toward respiratory infection vs. *fever* + *joint pain* + *rash* pointing toward systemic inflammatory disease) require non-linear relational modeling.

To balance expressive capacity with regularized parameter efficiency, we designed the **`SymptomTransformer`**, a lightweight tabular transformer with self-attention feature interaction heads.

---

## 2. Model Architecture Diagram

```
Input Feature Vector x ∈ ℝ¹³³ (Severity-Weighted Symptom Scores)
                │
                ▼
┌────────────────────────────────────────────────────────┐
│             Feature Projection Layer                   │
│   Linear(133 → d_model = 64) + LayerNorm + Dropout(0.2) │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│           Transformer Encoder Block 1                  │
│   • Multi-Head Self-Attention (4 heads, head_dim = 16) │
│   • Residual Connection + LayerNorm                    │
│   • Feed-Forward Network: Linear(64 → 128) → GELU      │
│     → Dropout(0.2) → Linear(128 → 64)                  │
│   • Residual Connection + LayerNorm                    │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│           Transformer Encoder Block 2                  │
│   • Multi-Head Self-Attention (4 heads, head_dim = 16) │
│   • Residual Connection + LayerNorm                    │
│   • Feed-Forward Network: Linear(64 → 128) → GELU      │
│     → Dropout(0.2) → Linear(128 → 64)                  │
│   • Residual Connection + LayerNorm                    │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│                Readout / Pooling Head                  │
│   • Global Mean Pooling + Feature Skip Projection      │
│   • LayerNorm(d_model)                                 │
│   • Dropout(p = 0.2)                                   │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│              Linear Classification Head                │
│   • Linear(64 → 41 Disease Classes)                    │
│   • Logits z ∈ ℝ⁴¹                                     │
└────────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────────┐
│            Post-Hoc Temperature Calibration            │
│   • z_calibrated = z / T  (Learned T = 0.7828)         │
│   • Softmax(z_calibrated) → Probability Vector p ∈ Δ⁴¹ │
└────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Formulation

### 3.1 Input Formulation
Given raw reported symptoms $S = \{s_1, \dots, s_k\}$, an indicator vector $\mathbf{x} \in \mathbb{R}^{133}$ is constructed:
$$x_j = \begin{cases} w_j & \text{if symptom } j \text{ is present} \\ 0 & \text{otherwise} \end{cases}$$
where $w_j \in [1, 7]$ denotes the clinical severity weight from `Symptom-severity.csv`.

### 3.2 Feature Embedding & Self-Attention
The input is projected into latent dimension $d = 64$:
$$\mathbf{h}_0 = \text{LayerNorm}(\mathbf{W}_p \mathbf{x} + \mathbf{b}_p)$$

For each transformer layer $l \in \{1, 2\}$:
$$\mathbf{u}_l = \mathbf{h}_{l-1} + \text{MultiHeadAttention}(\mathbf{Q}=\mathbf{h}_{l-1}, \mathbf{K}=\mathbf{h}_{l-1}, \mathbf{V}=\mathbf{h}_{l-1})$$
$$\mathbf{h}_l = \text{LayerNorm}(\mathbf{u}_l + \text{FFN}(\mathbf{u}_l))$$
where the feed-forward network uses GELU activations:
$$\text{FFN}(\mathbf{u}) = \mathbf{W}_2 \cdot \text{GELU}(\mathbf{W}_1 \mathbf{u} + \mathbf{b}_1) + \mathbf{b}_2$$

### 3.3 Output & Calibration
Unnormalized logits $\mathbf{z} = \mathbf{W}_c \mathbf{h}_L + \mathbf{b}_c$ are scaled via temperature parameter $T > 0$:
$$p(y = c \mid \mathbf{x}) = \frac{\exp(z_c / T)}{\sum_{j=1}^{41} \exp(z_j / T)}$$

---

## 4. Parameter Count & Computational Footprint

| Component | Dimensions | Parameter Count |
|---|---|---|
| Input Projection | $133 \times 64 + 64$ | 8,576 |
| Transformer Block 1 | Self-Attention (4 heads) + FFN (64→128→64) | 49,664 |
| Transformer Block 2 | Self-Attention (4 heads) + FFN (64→128→64) | 49,664 |
| Readout & Norms | LayerNorms + Skip Projections | 896 |
| Classification Head | $64 \times 41 + 41$ | 2,665 |
| **Total Parameters** | — | **111,465** (~435 KB) |
| **Inference Latency** | CPU (Intel/AMD x86_64) | **< 3.2 ms per batch** |

---

## 5. Comparative Baseline Architectures

Before deploying the deep-learning architecture, four strong classical machine-learning baselines were trained and benchmarked under identical stratified validation splits:

1. **Multinomial Logistic Regression ($L_2$ Regularized):**
   - High-dimensional linear boundary: $\mathbf{z} = \mathbf{W}\mathbf{x} + \mathbf{b}$.
   - Validation Accuracy: **100.0%** (Linear separability on validation partition).
2. **Random Forest Classifier (100 Trees, Gini Impurity):**
   - Ensemble of decorrelated decision trees with bootstrap aggregation.
   - Validation Accuracy: **100.0%**, 5-fold CV Mean: **100.0%**.
3. **Gradient Boosting Machine (sklearn `GradientBoostingClassifier`):**
   - Sequential gradient boosted decision stumps.
   - Validation Accuracy: **95.65%**, Log Loss: 0.1859.
4. **XGBoost Classifier:**
   - Regularized second-order gradient boosting.
   - Validation Accuracy: **93.48%**, Log Loss: 0.4283.
5. **LightGBM Classifier:**
   - Leaf-wise tree growth with histogram binning.
   - Validation Accuracy: **73.91%**, Log Loss: 1.3143.
