# CURX Machine Learning Training & Fine-Tuning Pipeline

**Pipeline Module:** `ml/scripts/run_pipeline.py`  
**Configuration File:** `ml/config/config.yaml`  
**Execution Runtime:** PyTorch 2.8.0 / Python 3.13  
**Status:** FULLY REPRODUCIBLE & VALIDATED

---

## 1. Pipeline Execution Flowchart

```
[Raw CURX Symptom Matrix: 4,920 rows]
                  │
                  ▼
[1. Deduplication Protocol → 304 Unique Vectors]
                  │
                  ▼
[2. Feature Encoding: 133 Symptoms × Severity Weights]
                  │
                  ▼
[3. Stratified Split (70/15/15) with Seed 42]
       ├── Train: 212 samples
       ├── Validation: 46 samples
       └── Sealed Test: 46 samples
                  │
                  ▼
[4. Train Classical Baselines: LogReg, RF, GBDT, XGB, LGBM]
                  │
                  ▼
[5. Train SymptomTransformer (Epochs: 50, AdamW, Cosine LR)]
                  │
                  ▼
[6. Fine-Tuning Phase (Lower LR: 1e-4, Feature Projection Frozen)]
                  │
                  ▼
[7. Calibration (Validation Temperature Scaling: T = 0.7828)]
                  │
                  ▼
[8. Comprehensive Evaluation on Sealed Test Partition]
                  │
                  ▼
[9. Subgroup Bias Audit & Clinical Category Breakdown]
                  │
                  ▼
[10. Error Analysis & Confusion Matrix Breakdown]
                  │
                  ▼
[11. Versioned Model Artifact Export → models/model_v001/]
```

---

## 2. Training Hyperparameters

The default training parameters are specified in `ml/config/config.yaml`:

| Hyperparameter | Value | Description |
|---|---|---|
| `batch_size` | 32 | Mini-batch sample size |
| `epochs` | 50 | Maximum training epochs |
| `learning_rate` | 0.001 | Initial AdamW learning rate |
| `optimizer` | AdamW | Adaptive moment estimation with decoupled weight decay |
| `weight_decay` | $1.0 \times 10^{-4}$ | $L_2$ parameter regularization |
| `lr_scheduler` | CosineAnnealingLR | Smooth decay to $T_{\max} = 50$, $\eta_{\min} = 10^{-5}$ |
| `early_stopping_patience` | 8 | Epochs without validation loss improvement before stop |
| `gradient_clipping` | 1.0 | Maximum gradient $L_2$ norm to prevent exploding gradients |
| `loss_function` | CrossEntropyLoss | Multi-class cross-entropy with unweighted class distribution |

---

## 3. Fine-Tuning Protocol

Following primary pretraining of the `SymptomTransformer`, a secondary fine-tuning pass is executed:
- **Starting Checkpoint:** `ml/checkpoints/best_model.pt` (selected at epoch with lowest validation loss).
- **Layer Freezing:** Input projection weights $\mathbf{W}_p, \mathbf{b}_p$ are frozen to preserve stable symptom representations.
- **Learning Rate:** Scaled down by $10\times$ to $\eta = 1.0 \times 10^{-4}$.
- **Epochs:** 15 epochs with early stopping patience = 5.
- **Objective:** Fine-tune self-attention query-key projections and classification readout to sharpen class boundaries without representation drift.

---

## 4. Multi-Seed Robustness Verification

To assess training stability and eliminate random split / initialization variance, the entire training protocol was independently evaluated across three fixed seeds:

| Seed | Best Validation Accuracy | Validation Macro F1 | Epoch of Convergence |
|---|---|---|---|
| **42** | 39.13% | 0.2720 | Epoch 47 |
| **123** | 41.30% | 0.3085 | Epoch 42 |
| **2026** | 36.96% | 0.2541 | Epoch 38 |
| **Mean ± Std** | **39.13% ± 2.17%** | **0.2782 ± 0.0276** | **42.3 ± 4.5** |

The modest variance across random seeds ($\pm 2.17\%$) confirms that the training dynamics are stable and not an artifact of an anomalous initialization.

---

## 5. Artifact Directory & Verification Commands

All artifacts are persisted under deterministic paths:
```bash
# Execute full pipeline end-to-end
python -m ml.scripts.run_pipeline

# Run baseline training
python -m ml.training.train_baselines

# Run deep learning training
python -m ml.training.train --config ml/config/config.yaml

# Run temperature calibration
python -m ml.evaluation.calibration

# Run evaluation on test partition
python -m ml.evaluation.evaluate --checkpoint ml/checkpoints/best_model.pt

# Run explainability analysis
python -m ml.explainability.feature_importance
```
