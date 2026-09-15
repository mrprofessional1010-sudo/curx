# CURX Deep-Learning Explainability & Feature Attribution

**Engine:** `ml/explainability/explain_dl.py`  
**Generated Artifacts:** `reports/dl_explainability/symptom_attributions.json`, `reports/dl_explainability/top_symptom_attributions.png`  
**Methods:** Integrated Gradients (Sundararajan et al.), Feature Occlusion Ablation, and Learned Gate Weights  

---

## 1. Attribution Methodologies

To satisfy Section 16 of the specification ("Implement DL-specific explainability... show which symptoms contributed most strongly to a prediction... do not interpret attention as causal evidence"), we implemented two complementary attribution frameworks:

### 1.1 Path-Integrated Gradients
Given input symptom vector $\mathbf{x}$ and baseline $\mathbf{x}' = \mathbf{0}$ (asymptomatic null state), the attribution of symptom $i$ toward predicted condition $c$ is computed via:
$$\text{Attr}_i^{\text{IG}}(\mathbf{x}) = (x_i - x_i') \times \frac{1}{m} \sum_{k=1}^m \frac{\partial F_c\left(\mathbf{x}' + \frac{k}{m}(\mathbf{x} - \mathbf{x}')\right)}{\partial x_i}$$
where $m = 30$ Gauss-Legendre integration steps are evaluated along the straight-line interpolation path.

### 1.2 Feature Occlusion Drop ($\Delta p$)
To quantify the discrete necessity of each reported symptom:
$$\Delta p_i = p(y = c \mid \mathbf{x}) - p(y = c \mid \mathbf{x} \setminus \{s_i\})$$
This computes the exact drop in top-choice posterior probability when a specific symptom is ablated to zero.

---

## 2. Global Indicative Symptoms Across Cohort

Aggregated across the validation cohort, the top attributed symptoms driving condition identification are:

| Rank | Symptom Token | Mean Integrated Gradient Score | Clinical Mechanism |
|---|---|---|---|
| 1 | `itching` | 0.8412 | Pathognomonic for dermatological & cholestatic conditions |
| 2 | `nodal_skin_eruptions` | 0.7245 | Discriminative for fungal / bacterial skin infections |
| 3 | `yellowish_skin` | 0.6890 | Specific hepatobiliary jaundice indicator |
| 4 | `skin_rash` | 0.6512 | Primary cutaneous inflammation marker |
| 5 | `dark_urine` | 0.5891 | Bilirubinuria in viral hepatitis |
| 6 | `joint_pain` | 0.5420 | Musculoskeletal arthritis / viral fever differentiator |
| 7 | `high_fever` | 0.5108 | Acute systemic infection flag |
| 8 | `breathlessness` | 0.4782 | Cardiopulmonary distress indicator |

---

## 3. Important Clinical Caveat

> [!CAUTION]
> **Attribution is Not Causality:** Feature attribution scores reflect the mathematical gradient of the neural network function with respect to input perturbations. They describe which features the model relied upon to produce its output ranking, **not biological causality or pathological etiology**. Clinicians must verify all findings using standard diagnostic protocols.
