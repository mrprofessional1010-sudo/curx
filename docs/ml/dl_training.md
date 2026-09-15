# CURX Deep-Learning Training Strategy & Optimization

**Module:** `ml/training/train_dl.py`  
**Configuration:** `ml/config/dl_config.yaml`  
**Framework:** PyTorch 2.8.0 / Python 3.13  

---

## 1. Training Philosophy for Sparse Tabular Sets

Standard mini-batch stochastic gradient descent without tabular inductive constraints often leads to high sample variance when trained on small, deduplicated medical datasets (212 training samples). To guarantee robust convergence without overfitting or underfitting, we instituted a multi-pronged training strategy:

1. **Train-Only Clinical Data Augmentation:**
   - **Symptom Dropout ($p = 0.15$):** For patients presenting with $\ge 3$ symptoms, one symptom is randomly dropped during training iterations. This simulates real-world clinical presentations where patients omit secondary complaints, teaching the network to rely on core syndromic patterns.
   - **Severity Perturbation ($\sigma = 0.02$):** Continuous perturbation applied strictly to active features to prevent rigid threshold reliance.
   - **Leakage Barrier:** Validation ($n = 46$) and Sealed Test ($n = 46$) sets are **never augmented**.
2. **Cosine Annealing with Linear Warmup:**
   - 5 epochs of linear warmup from $\eta = 10^{-5}$ to $\eta_{\text{max}} = 10^{-3}$.
   - Smooth cosine decay toward $\eta_{\text{min}} = 10^{-5}$ over remaining epochs.
3. **Decoupled Weight Decay ($L_2$ Regularization):**
   - AdamW with $\beta_1 = 0.9, \beta_2 = 0.999$, weight decay $\lambda = 1.0 \times 10^{-4}$.
4. **Gradient Norm Clipping:**
   - Threshold $\tau_{\text{clip}} = 1.0$ to stabilize multi-head attention and prototype gradient backpropagation.

---

## 2. Hybrid Metric Loss Formulation

$$\mathcal{L}_{\text{total}} = \mathcal{L}_{\text{CE}}(\hat{\mathbf{y}}, \mathbf{y}) + \lambda_{\text{metric}} \left( \mathcal{L}_{\text{compactness}} + 0.5 \cdot \mathcal{L}_{\text{separation}} \right)$$

- **$\mathcal{L}_{\text{CE}}$ (Cross-Entropy with Label Smoothing 0.05):**
  Prevents the network from producing overconfident, uncalibrated logit spikes on small sample sizes.
- **$\mathcal{L}_{\text{compactness}}$ (Intra-Class Cosine Compactness):**
  $$\mathcal{L}_{\text{compactness}} = \frac{1}{B} \sum_{i=1}^B \left( 1 - \frac{\mathbf{z}_i \cdot \mathbf{c}_{y_i}}{\|\mathbf{z}_i\| \|\mathbf{c}_{y_i}\|} \right)$$
  Forces embeddings $\mathbf{z}_i$ toward their ground-truth prototype $\mathbf{c}_{y_i}$.
- **$\mathcal{L}_{\text{separation}}$ (Inter-Prototype Angular Margin):**
  $$\mathcal{L}_{\text{separation}} = \frac{1}{\binom{C}{2}} \sum_{j \ne k} \max\left(0, \frac{\mathbf{c}_j \cdot \mathbf{c}_k}{\|\mathbf{c}_j\| \|\mathbf{c}_k\|} - m\right)^2$$
  Penalizes distinct condition prototypes if their cosine similarity exceeds margin $m = 0.15$.

---

## 3. Convergence & Learning Dynamics

Across 100 maximum epochs:
- Best validation score was consistently achieved between **Epoch 32 and Epoch 42**.
- Early stopping triggered around **Epoch 48–54** (patience = 12).
- Training loss smoothly decreased from $4.12$ to $< 0.15$, demonstrating complete resolution of the underfitting that afflicted the original transformer.
