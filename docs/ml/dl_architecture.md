# CURX Deep-Learning Architecture Redesign Specification

**Model Suite:** `CURXSymptomNet`, `ResidualMLP`, `DeepSetsSymptomNet`, `PrototypeNetwork`  
**Primary Production Candidate:** `CURXSymptomNet` (`v002`)  
**Domain:** Sparse Tabular / Set-Based Multiclass Disease Classification  
**Date:** September 2026  

---

## 1. Architectural Motivation & Paradigm Shift

The original `SymptomTransformer` treated 133 symptom features as a sequential sentence of 133 1D tokens, applying positional encodings and global mean pooling. As established in `docs/ml/dl_failure_analysis.md`, this diluted active symptom signals by $26.6\times$ and degraded test accuracy to 34.78%.

To solve this, we formulated symptoms as an **unordered, sparse set** with non-linear feature interactions and engineered four specialized tabular architectures:

```
                  ┌──────────────────────────────────────────────┐
                  │ 133-Dimensional Severity Symptom Vector x    │
                  └──────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │ 1. Learnable Identity     │                   │ 2. Feature Gating Layer   │
   │    Embedding Table        │                   │    g = σ(W_g x + b_g)     │
   └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                 │                                               │
                 └───────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Gated Active Symptom Tokens h_i = x_i · g_i  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Permutation-Invariant Set-Attention Readout  │
                  │ (Learned Query Q attending over active tokens)│
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Compact Pre-LayerNorm Residual MLP Blocks    │
                  │ (2 layers, hidden_dim=64, GELU, Dropout 0.2) │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Latent Patient Representation z ∈ ℝ⁶⁴        │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 41 Disease Prototype Embeddings c_1...c_41    │
                  │ Cosine Similarity: s_k = (z · c_k) / (||z||) │
                  │ Scaled Logits: z_k = τ · s_k + b_k           │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Post-Hoc Temperature Calibration (T = 0.4353)│
                  │ Calibrated Probability Distribution p ∈ Δ⁴¹  │
                  └──────────────────────────────────────────────┘
```

---

## 2. Specification of Evaluated Deep-Learning Architectures

### Architecture A: Compact Residual MLP (`residual_mlp.py`)
- **Philosophy:** Tabular inductive bias with skip connections to maintain linear separability while modeling non-linear interactions.
- **Layers:** Feature Gating $\rightarrow$ Input Projection (133 $\rightarrow$ 64) $\rightarrow$ 2 Residual Blocks (Pre-LayerNorm, GELU, Dropout 0.2) $\rightarrow$ LayerNorm $\rightarrow$ Classifier Head (64 $\rightarrow$ 41).
- **Parameter Count:** 46,215 parameters.
- **Validation Top-1 Accuracy:** **100.0%**.

### Architecture B: Deep Sets Symptom Encoder (`deep_sets.py`)
- **Philosophy:** Permutation-invariant set aggregation based on Zaheer et al. Elements are encoded individually via $\phi$ and aggregated through learned attention pooling without sequence order.
- **Components:** Learnable symptom identity embeddings (embed_dim=32), element encoder $\phi$, masked attention pooling over active features, set decoder $\rho$.
- **Parameter Count:** 37,689 parameters.
- **Validation Top-1 Accuracy:** **97.83%** (Top-3: 100.0%).

### Architecture C: Prototype Network (`prototype_network.py`)
- **Philosophy:** Metric learning via class centroids in hyperspherical cosine space with learnable temperature $\tau$.
- **Components:** MLP Encoder (133 $\rightarrow$ 64 $\rightarrow$ 32) $\rightarrow$ 41 class prototype embeddings $\mathbf{c}_1, \dots, \mathbf{c}_{41} \in \mathbb{R}^{32}$ $\rightarrow$ Cosine similarity $\times \tau$.
- **Parameter Count:** 18,177 parameters.
- **Validation Top-1 Accuracy:** **100.0%**.

### Architecture D (Primary): `CURXSymptomNet` (`curx_symptom_net.py`)
- **Philosophy:** Full hybrid integration combining feature gating, set-attention readout, residual MLP latent representations, and hyperspherical disease prototypes.
- **Parameters:** ~76k–141k parameters (depending on attention head width and gating dimension).
- **Loss:** Hybrid $\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{CE}} + 0.15 \mathcal{L}_{\text{metric}}$.
- **Validation Top-1 Accuracy:** **100.0%**, Top-3: **100.0%**, Top-5: **100.0%**, Macro AUROC: **1.0000**.
- **Sealed Test Top-1 Accuracy:** **86.96%**, Top-3: **93.48%**, Top-5: **100.0%**, Macro AUROC: **0.9995**.
