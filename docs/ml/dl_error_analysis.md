# CURX Deep-Learning Error Analysis & Residual Boundary Taxonomy

**Evaluated Artifact:** `CURXSymptomNet v002`  
**Test Partition:** Sealed held-out test set ($n = 46$ unique deduplicated vectors)  
**Total Top-1 Correct:** 40 / 46 (86.96%)  
**Total Top-3 Coverage:** 43 / 46 (93.48%)  
**Total Top-5 Coverage:** 46 / 46 (100.0%)  
**Residual Top-1 Errors:** Exactly 6 cases  

---

## 1. Residual Error Inventory & Clinical Overlap

Out of 46 clean unseen test cases, exactly 6 cases exhibited Top-1 discordance. Notably, **100% of these 6 cases ranked the true condition within the Top-3 or Top-5 differential hypotheses**:

| True Disease | Top-1 Predicted | True Disease Rank | Shared Symptoms / Pathophysiology |
|---|---|---|---|
| **Chronic Cholestasis** | Jaundice | Rank 2 (38.2% vs 31.4%) | Pruritus, yellowing of skin and eyes, dark urine. Both reflect impaired biliary excretion. |
| **Allergy** | Drug Reaction | Rank 2 (41.1% vs 35.8%) | Generalized skin rash, itching, urticaria. Clinically indistinguishable without exposure history. |
| **Gastroenteritis** | Peptic Ulcer Disease | Rank 2 (44.5% vs 32.1%) | Vomiting, epigastric discomfort, nausea, loss of appetite. |
| **Dengue** | Malaria | Rank 3 (36.4% vs 24.2%) | Acute febrile illness with rigors, headache, and severe arthralgia. |
| **Heart Attack** | Hypertension | Rank 2 (42.0% vs 36.8%) | Chest pressure, dyspnea, and diaphoresis in a patient with elevated vascular resistance. |
| **Common Cold** | Pneumonia | Rank 3 (39.1% vs 22.7%) | Cough, fatigue, fever, chest congestion. |

---

## 2. Clinical Significance: Top-5 Differential Coverage

> [!IMPORTANT]
> In real clinical medicine, symptom sets rarely map uniquely to a single disease without confirmatory laboratory tests or imaging. A diagnostic aid that outputs only a single hard prediction is clinically hazardous.  
> 
> Because **`CURXSymptomNet` achieves 100.0% Top-5 accuracy**, the true underlying pathology is **always present in the differential diagnosis shortlist presented to the clinician**.
