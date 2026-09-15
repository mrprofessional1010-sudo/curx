# Comprehensive Deep-Learning Failure Analysis: SymptomTransformer

**Document ID:** `CURX-DL-FAILURE-001`  
**Analyzed Model:** `SymptomTransformer v001`  
**Observed Clean Test Performance:** Top-1 Accuracy: 34.78%, Macro F1: 0.2250, Macro AUROC: 0.9620  
**Baseline Classical ML Reference:** $L_2$ Logistic Regression: 97.83% Top-1 Accuracy  
**Date:** September 2026  
**Status:** COMPLETED AUDIT

---

## 1. Executive Summary

The initial deep-learning architecture (`SymptomTransformer`) severely underperformed classical convex linear models (34.78% vs 97.83% Top-1 test accuracy) despite high ranking capacity (Macro AUROC 0.9620).

A forensic audit of `symptom_transformer.py` revealed that this was **not** a fundamental inability of deep neural networks to learn the symptom mapping, but rather **severe structural mismatch** between standard Natural Language Processing (NLP) Transformer paradigms and the sparse tabular/set semantics of clinical symptom profiles:
1. **Global Mean-Pooling Signal Dilution:** Averaging latent representations across all 133 positions diluted active symptom signals by $\sim 26\times$ against 125 inactive zero tokens.
2. **False Positional Encodings:** Injected arbitrary positional bias into an unordered symptom set.
3. **Severe Parameter-to-Sample Disproportion:** 111,465 parameters trained on only 212 deduplicated samples (525:1 ratio) without tabular regularization.
4. **Lack of Prototype Metric Geometry:** Cross-entropy on high-dimensional uncalibrated logits failed to structure cluster centroids for 41 fine-grained classes.

---

## 2. Factor-by-Factor Architectural Breakdown

### 2.1 Parameter Count vs. Dataset Size Disproportion
- **Deduplicated Training Samples ($N_{\text{train}}$):** 212 samples.
- **Number of Classes ($C$):** 41 classes ($\approx 5.1$ samples per class).
- **`SymptomTransformer` Parameters:** 111,465 parameters.
- **Parameter-to-Sample Ratio:** **$525.7 : 1$**.
- **Impact:** While modern deep learning can operate in overparameterized regimes with billions of tokens, tabular neural networks without convolutional or spatial inductive biases overfit or under-converge when trained on $\sim 200$ samples without structural constraints or metric regularization.

### 2.2 Input Representation & The 133-Token Fallacy
- **Implementation in `FeatureEmbedding`:**
  ```python
  x = x.unsqueeze(-1)          # (batch, 133, 1)
  x = self.weight_embed(x)      # (batch, 133, embed_dim)
  x = x + self.pos_embed        # Injected 1D sequence position!
  ```
- **The Flaw:**
  The model treated each symptom column as a sequential token in a sentence of length $L = 133$. In reality, a patient with 4 symptoms has an **unordered set** of present symptoms.
- **Positional Encoding Harm:** `self.pos_embed` assigned unique positional embeddings to index 0 (`itching`) vs index 132 (`yellow_crust_ooze`). This forced the self-attention mechanism to waste capacity learning that column index ordering is arbitrary.

### 2.3 Catastrophic Signal Dilution via Global Average Pooling
- **Implementation in `SymptomTransformer.forward`:**
  ```python
  x = self.norm(x)
  x = x.mean(dim=1)             # Global average across all 133 feature tokens
  x = self.head(x)              # Linear(hidden_dim, 41)
  ```
- **Mathematical Impact:**
  Let $S_k$ be the set of active symptoms for sample $k$, with $|S_k| \approx 3 \text{ to } 7$ (mean $4.8$).
  The input vector has $\approx 128$ zeros.
  The global mean over sequence length 133 is:
  $$\mathbf{h}_{\text{pooled}} = \frac{1}{133} \left( \sum_{j \in S_k} \mathbf{h}_j + \sum_{j \notin S_k} \mathbf{h}_{\text{zero}, j} \right)$$
  The active symptom vectors $\sum_{j \in S_k} \mathbf{h}_j$ were scaled down by a factor of $\frac{1}{133}$! The 128 inactive zero embeddings dominated the pooled vector by a ratio of $\approx 26.6 : 1$, virtually destroying the discriminative signature of rare pathognomonic symptoms.

### 2.4 Attention Dispersion & Quadratic Overhead
- The self-attention matrix was $(133 \times 133) = 17,689$ pairwise attention weights per head, per layer.
- Over 95% of pairwise relationships were between zero-valued feature tokens.
- The attention distributions became diffuse and entropy-dominated because softmax over 133 positions spread probability mass thin across irrelevant zero features.

### 2.5 Classifier Head & Metric Geometry Deficit
- `SymptomTransformer` utilized a standard linear projection: $\mathbf{z} = \mathbf{W}_{\text{head}} \mathbf{h} + \mathbf{b}$.
- With only $\approx 5$ training examples per class, standard cross-entropy pushes hyperplane decision boundaries outward without enforcing tight intra-class cluster compactness or maximizing inter-class prototype margins in embedding space.
- In contrast, a prototype/metric-learning head explicitly optimizes each class centroid as a reference prototype vector in latent space.

### 2.6 Learning Dynamics: Underfitting & High Training Loss
From `ml/reports/training_history.json`:
- Initial Training Loss: 4.39 (random guess for 41 classes is $-\ln(1/41) \approx 3.71$).
- Final Training Loss at Epoch 47: **2.0689** (still very high!).
- Final Training Accuracy: **47.16%**.
- Final Validation Accuracy: **39.13%**.
- **Diagnosis:** The model was **underfitting the training data**. It could not even drive training loss toward zero because the $26\times$ pooling dilution and diffuse attention over 133 tokens prevented the network from forming clean linearly separable representations of the sparse symptoms.

---

## 3. Comparative Summary: What Went Wrong

| Architectural Dimension | `SymptomTransformer` (Flawed) | Required Redesign (`CURXSymptomNet`) |
|---|---|---|
| **Input Representation** | Sequence of 133 1D tokens | Gated, severity-weighted dense embedding vector |
| **Feature Ordering** | False positional encodings | Permutation-invariant set aggregation |
| **Pooling Mechanism** | Global mean across 133 positions | Attention-weighted gating / sparse set readout |
| **Parameter Count** | ~111k params (too large, poorly allocated) | ~15k–35k params (compact, dense capacity) |
| **Signal-to-Noise Ratio** | Diluted $26\times$ by inactive zero tokens | Gated: inactive symptoms masked to zero contribution |
| **Classification Head** | Plain linear cross-entropy | Disease Prototype Embeddings + Cosine Metric Learning |
| **Loss Formulation** | Unregularized Cross-Entropy | Hybrid $\mathcal{L}_{\text{CE}} + \lambda \mathcal{L}_{\text{metric}}$ |
| **Data Augmentation** | None (only 212 raw train vectors) | Train-only symptom masking & clinical dropout |

---

## 4. Architectural Prescription for `CURXSymptomNet`

1. **Feature Gating:** Apply learned gating $\mathbf{g} = \sigma(\mathbf{W}_g \mathbf{x} + \mathbf{b}_g)$ so that inactive symptoms cannot inject noise into latent embeddings.
2. **Deep Sets / Set Attention:** Treat symptoms as an unordered set; compute attention weights conditioned solely on active features.
3. **Compact Residual Blocks:** Use 2–3 residual MLP blocks with skip connections, LayerNorm, and GELU activations.
4. **Disease Prototypes:** Introduce 41 learnable class prototype vectors $\mathbf{c}_1, \dots, \mathbf{c}_{41} \in \mathbb{R}^d$.
5. **Metric-Calibrated Logits:** Calculate logits via temperature-scaled cosine similarity $s(x, c_j) = \frac{\mathbf{h} \cdot \mathbf{c}_j}{\|\mathbf{h}\| \|\mathbf{c}_j\|} \cdot \tau$.
6. **Train-Only Augmentation:** Apply symptom dropout (randomly masking 1 active symptom with $p=0.15$) to train data to teach the network robustness to partial symptom reporting.
