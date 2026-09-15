# CURX Data Catalog: Source-to-Target Schema Mapping

This document specifies the exact attribute-level mappings from the raw input files in `curx datasets/` to the canonical Supabase relational tables.

---

## 1. Disease & Symptom Mapping

### Source: `curx dataset symptom.zip`
- `Symptom-severity.csv` (`Symptom`, `weight`) 
  → **`public.symptoms`** (`canonical_name`, `clinical_weight`)
- `symptom_Description.csv` (`Disease`, `Description`)
  → **`public.conditions`** (`canonical_name`, `description`)
- `symptom_precaution.csv` (`Disease`, `Precaution_1`..`Precaution_4`)
  → **`public.conditions`** (`precaution_1`, `precaution_2`, `precaution_3`, `precaution_4`)
- `dataset.csv` (`Disease`, `Symptom_1`..`Symptom_17`)
  → **`public.disease_symptoms`** (`condition_id`, `symptom_id`, `frequency_rank`)

---

## 2. Medication Catalog & RxNorm Mapping

### Source: `Drug Dataset.zip` (`Medicine_Details.csv`)
- `Medicine Name` → **`public.medications.canonical_name`**
- `Composition` → **`public.medications.composition`** & parsed into `active_ingredient`
- `Uses` → **`public.medications.uses`**
- `Side_effects` → **`public.medications.side_effects`**
- `Manufacturer` → stored in **`public.medication_source_mappings.source_name`**

### Source: `RxNorm_full_prescribe_09082026.zip` (`RXNCONSO.RRF`)
- `RXCUI` → **`public.medications.rxcui`** & **`public.medication_source_mappings.source_record_id`**
- `STR` → matched against `medications.canonical_name` / `active_ingredient`
- `TTY` → used for concept filtering (`IN` for Ingredient, `BN` for Brand Name)

---

## 3. Human Gene Catalog

### Source: `hgnc_complete_set.txt`
- `hgnc_id` → **`public.genes.hgnc_id`**
- `symbol` → **`public.genes.symbol`**
- `name` → **`public.genes.name`**
- `locus_group` → **`public.genes.locus_group`**
- `locus_type` → **`public.genes.locus_type`**
- `location` → **`public.genes.location`**
- `alias_symbol` (split by `|`) → **`public.genes.alias_symbol`** (`TEXT[]`)
- `alias_name` (split by `|`) → **`public.genes.alias_name`** (`TEXT[]`)

---

## 4. CPIC & ClinPGx Pharmacogenomics

### Source: `cpic guide lines.tsv` & CPIC API
- `Guideline` → Gene and Drug names resolved to `genes.id` and `medications.id`
- Gene + Variant/Phenotype + Drug → **`public.gene_drug_relationships`** (`gene_id`, `medication_id`, `variant_id`, `phenotype`, `recommendation`, `risk_level`)
- Guideline publication URL & identifier → **`public.evidence_sources`** (`source_name='CPIC'`, `url`, `title`)

---

## 5. Drug–Drug Interactions

### Source: `backend/seed_data/drug_drug_interactions.csv`
- `drug_a` → resolved to `medications.id` (`drug_a_id`)
- `drug_b` → resolved to `medications.id` (`drug_b_id`)
- `severity` → **`public.drug_drug_interactions.severity`** (`LOW`, `MODERATE`, `HIGH`, `SEVERE`)
- `mechanism` → **`public.drug_drug_interactions.mechanism`**
- `description` → **`public.drug_drug_interactions.description`**
- `evidence_source` → **`public.evidence_sources`** (`id`)

---

## 6. Condition–Drug Contraindications

### Source: `backend/seed_data/condition_drug_rules.csv`
- `condition_name` → resolved to `conditions.id`
- `medication_name` → resolved to `medications.id`
- `relationship_type` → **`public.condition_drug_relationships.relationship_type`**
- `risk_level` → **`public.condition_drug_relationships.risk_level`** (`LOW`, `MODERATE`, `HIGH`, `SEVERE`)
- `mechanism` → **`public.condition_drug_relationships.mechanism`**
- `rule_id` → **`public.condition_drug_relationships.rule_id`**
- `evidence_source` → **`public.evidence_sources`** (`id`)

---

## 7. openFDA Drug Label Documents

### Source: `drug-label-0001` to `0014` JSON files
- `set_id` → **`public.drug_label_documents.set_id`**
- `id` → **`public.drug_label_documents.spl_id`**
- `effective_time` → **`public.drug_label_documents.effective_time`**
- `openfda.manufacturer_name` → **`public.drug_label_documents.manufacturer_name`**
- `boxed_warning` → **`public.drug_label_documents.boxed_warning`**
- `warnings` / `warnings_and_cautions` → **`public.drug_label_documents.warnings`**
- `contraindications` → **`public.drug_label_documents.contraindications`**
- `indications_and_usage` → **`public.drug_label_documents.indications_and_usage`**
- `adverse_reactions` → **`public.drug_label_documents.adverse_reactions`**
- `drug_interactions` → **`public.drug_label_documents.drug_interactions_text`**
- `dosage_and_administration` → **`public.drug_label_documents.dosage_and_administration`**
- Sections indexed in **`public.drug_label_sections`** (`document_id`, `section_name`, `section_text`)
