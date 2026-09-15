import os
import csv
from backend.ingestion.supabase_client import insert_records, get_records

def ingest_cpic_clinpgx():
    print("[CPIC/ClinPGx Ingestion] Loading genes, medications, and creating evidence sources...")
    
    # 1. Fetch DB gene and medication lookups
    db_genes = get_records("genes", select="id,symbol", limit=1000)
    db_meds = get_records("medications", select="id,canonical_name", limit=2000)

    gene_map = {g["symbol"].upper(): g["id"] for g in (db_genes or [])}
    med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or [])}

    # 2. Ingest Evidence Sources
    evidence_items = [
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_WARFARIN_2017",
            "title": "Clinical Pharmacogenetics Implementation Consortium (CPIC) Guideline for Pharmacogenetics-Guided Warfarin Dosing: 2017 Update",
            "url": "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-vkorc1-cyp4f2/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "28198005"}
        },
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_CLOPIDOGREL_2022",
            "title": "CPIC Guideline for CYP2C19 Genotype and Clopidogrel Therapy: 2022 Update",
            "url": "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "35032035"}
        },
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_STATINS_2022",
            "title": "CPIC Guideline for SLCO1B1, ABCG2, and CYP2C9 Genotypes and Statin-Associated Musculoskeletal Symptoms",
            "url": "https://cpicpgx.org/guidelines/guideline-for-statins/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "35152405"}
        },
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_FLUOROPYRIMIDINES_2020",
            "title": "CPIC Guideline for Dihydropyrimidine Dehydrogenase Genotype and Fluoropyrimidine Dosing",
            "url": "https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "29152729"}
        },
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_CODEINE_2014",
            "title": "CPIC Guideline for CYP2D6 and Codeine Therapy",
            "url": "https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "24458010"}
        },
        {
            "source_name": "CPIC",
            "source_record_id": "CPIC_ABACAVIR_2014",
            "title": "CPIC Guidelines for HLA-B Genotype and Abacavir Dosing",
            "url": "https://cpicpgx.org/guidelines/guideline-for-abacavir-and-hla-b/",
            "evidence_type": "Clinical Practice Guideline",
            "source_metadata": {"level": "1A", "pubmed_id": "24561393"}
        },
        {
            "source_name": "ClinPGx",
            "source_record_id": "CLINPGX_VKORC1_WARFARIN",
            "title": "PharmGKB Clinical Annotation: VKORC1 -1639G>A sensitivity to Warfarin",
            "url": "https://www.pharmgkb.org/chemical/PA451906/clinicalAnnotation",
            "evidence_type": "Curated Clinical Annotation",
            "source_metadata": {"level": "1A", "annotation_id": "PA451906"}
        },
        {
            "source_name": "CURX_Curated",
            "source_record_id": "CURX_DDI_RULES_V1",
            "title": "CURX Validated Drug-Drug Interaction Knowledgebase",
            "url": "https://curx.ai/clinical-evidence/ddi",
            "evidence_type": "Deterministic Rule Registry",
            "source_metadata": {"version": "1.0", "curator": "CURX Clinical Safety Board"}
        },
        {
            "source_name": "CURX_Curated",
            "source_record_id": "CURX_CDR_RULES_V1",
            "title": "CURX Curated Condition-Drug Contraindication Registry",
            "url": "https://curx.ai/clinical-evidence/cdr",
            "evidence_type": "Deterministic Rule Registry",
            "source_metadata": {"version": "1.0", "curator": "CURX Clinical Safety Board"}
        }
    ]

    print(f"[CPIC/ClinPGx Ingestion] Inserting {len(evidence_items)} evidence sources...")
    insert_records("evidence_sources", evidence_items)
    
    db_evidence = get_records("evidence_sources", select="id,source_record_id", limit=100)
    ev_map = {e["source_record_id"]: e["id"] for e in (db_evidence or [])}

    # 3. Ingest Genetic Variants
    variants = [
        {"gene": "CYP2C9", "variant_name": "*2", "rs_id": "rs1799853", "phenotype": "Decreased function allele (*2)", "clinical_significance": "Impaired S-warfarin & NSAID clearance"},
        {"gene": "CYP2C9", "variant_name": "*3", "rs_id": "rs1057910", "phenotype": "No function allele (*3)", "clinical_significance": "Marked reduction in S-warfarin clearance (<10%)"},
        {"gene": "VKORC1", "variant_name": "-1639G>A", "rs_id": "rs9923231", "phenotype": "High sensitivity variant (A allele)", "clinical_significance": "Lower VKORC1 expression; heightened warfarin sensitivity"},
        {"gene": "CYP2C19", "variant_name": "*2", "rs_id": "rs4244285", "phenotype": "Loss-of-function allele (*2)", "clinical_significance": "Poor metabolizer; failure to bioactivate clopidogrel"},
        {"gene": "CYP2C19", "variant_name": "*3", "rs_id": "rs4986893", "phenotype": "Loss-of-function allele (*3)", "clinical_significance": "Poor metabolizer; reduced active metabolite formation"},
        {"gene": "SLCO1B1", "variant_name": "*5", "rs_id": "rs4149056", "phenotype": "Decreased hepatic uptake allele (521T>C)", "clinical_significance": "Elevated statin plasma concentrations; severe myopathy risk"},
        {"gene": "DPYD", "variant_name": "*2A", "rs_id": "rs3918290", "phenotype": "Non-functional splice site variant (IVS14+1G>A)", "clinical_significance": "Fatal fluoropyrimidine toxicity / myelosuppression"},
        {"gene": "TPMT", "variant_name": "*3A", "rs_id": "rs1800460", "phenotype": "No function allele (460G>A, 719A>G)", "clinical_significance": "Severe azathioprine/6-MP bone marrow suppression"},
        {"gene": "HLA-B", "variant_name": "*57:01", "rs_id": "HLA-B*57:01", "phenotype": "Abacavir hypersensitivity allele", "clinical_significance": "Severe, potentially fatal hypersensitivity reaction"},
        {"gene": "CYP2D6", "variant_name": "*4", "rs_id": "rs3892097", "phenotype": "Null allele (*4)", "clinical_significance": "Inability to convert codeine/tramadol to active analgesic metabolites"}
    ]

    variant_records = []
    for v in variants:
        g_id = gene_map.get(v["gene"])
        if g_id:
            variant_records.append({
                "gene_id": g_id,
                "variant_name": v["variant_name"],
                "rs_id": v["rs_id"],
                "phenotype": v["phenotype"],
                "clinical_significance": v["clinical_significance"]
            })

    print(f"[CPIC/ClinPGx Ingestion] Inserting {len(variant_records)} genetic variants...")
    insert_records("genetic_variants", variant_records)

    db_variants = get_records("genetic_variants", select="id,gene_id,variant_name", limit=200)
    var_map = {f"{v['gene_id']}_{v['variant_name']}": v["id"] for v in (db_variants or [])}

    # 4. Ingest Gene-Drug Relationships
    pgx_relationships = [
        {
            "gene": "CYP2C9",
            "drug": "warfarin",
            "variant": "*2",
            "phenotype": "CYP2C9 Intermediate Metabolizer (*1/*2, *1/*3)",
            "recommendation": "Reduce expected initial warfarin dose by 25-50%. Monitor INR closely during initiation.",
            "risk_level": "HIGH",
            "evidence_id": ev_map.get("CPIC_WARFARIN_2017"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-vkorc1-cyp4f2/"
        },
        {
            "gene": "CYP2C9",
            "drug": "warfarin",
            "variant": "*3",
            "phenotype": "CYP2C9 Poor Metabolizer (*2/*3, *3/*3)",
            "recommendation": "High risk of bleeding. Substantially reduce initial dose by 50-70% or consider alternative non-CYP2C9 oral anticoagulation.",
            "risk_level": "SEVERE",
            "evidence_id": ev_map.get("CPIC_WARFARIN_2017"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-warfarin-and-cyp2c9-vkorc1-cyp4f2/"
        },
        {
            "gene": "VKORC1",
            "drug": "warfarin",
            "variant": "-1639G>A",
            "phenotype": "VKORC1 High Sensitivity (A/A or G/A)",
            "recommendation": "High pharmacodynamic sensitivity to vitamin K epoxide reductase inhibition. Initiate with lower starting dose.",
            "risk_level": "HIGH",
            "evidence_id": ev_map.get("CLINPGX_VKORC1_WARFARIN"),
            "url": "https://www.pharmgkb.org/chemical/PA451906/clinicalAnnotation"
        },
        {
            "gene": "CYP2C19",
            "drug": "clopidogrel",
            "variant": "*2",
            "phenotype": "CYP2C19 Poor Metabolizer (*2/*2, *2/*3)",
            "recommendation": "Significantly diminished antiplatelet response and increased cardiovascular event rates. Avoid clopidogrel; use prasugrel or ticagrelor.",
            "risk_level": "SEVERE",
            "evidence_id": ev_map.get("CPIC_CLOPIDOGREL_2022"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-clopidogrel-and-cyp2c19/"
        },
        {
            "gene": "SLCO1B1",
            "drug": "simvastatin",
            "variant": "*5",
            "phenotype": "SLCO1B1 Decreased Function (*5 carrier)",
            "recommendation": "High risk of severe statin-associated myopathy and rhabdomyolysis. Prescribe lower dose (<20mg) or switch to rosuvastatin/pravastatin.",
            "risk_level": "HIGH",
            "evidence_id": ev_map.get("CPIC_STATINS_2022"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-statins/"
        },
        {
            "gene": "SLCO1B1",
            "drug": "atorvastatin",
            "variant": "*5",
            "phenotype": "SLCO1B1 Decreased Function (*5 carrier)",
            "recommendation": "Moderate increase in systemic exposure. Titrate carefully and monitor for muscle symptoms.",
            "risk_level": "MODERATE",
            "evidence_id": ev_map.get("CPIC_STATINS_2022"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-statins/"
        },
        {
            "gene": "DPYD",
            "drug": "fluorouracil",
            "variant": "*2A",
            "phenotype": "DPYD Poor Metabolizer (*2A/*2A)",
            "recommendation": "Extreme risk of life-threatening 5-FU toxicity (severe mucositis, neutropenic sepsis). Avoid 5-FU/capecitabine.",
            "risk_level": "SEVERE",
            "evidence_id": ev_map.get("CPIC_FLUOROPYRIMIDINES_2020"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-fluoropyrimidines-and-dpyd/"
        },
        {
            "gene": "HLA-B",
            "drug": "abacavir",
            "variant": "*57:01",
            "phenotype": "HLA-B*57:01 Positive",
            "recommendation": "Contraindicated. Extreme risk of multisystem hypersensitivity syndrome. Use non-abacavir antiretroviral regimen.",
            "risk_level": "SEVERE",
            "evidence_id": ev_map.get("CPIC_ABACAVIR_2014"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-abacavir-and-hla-b/"
        },
        {
            "gene": "CYP2D6",
            "drug": "tramadol",
            "variant": "*4",
            "phenotype": "CYP2D6 Poor Metabolizer (*4/*4)",
            "recommendation": "Ineffective analgesia due to failure of active metabolite (M1) formation. Avoid tramadol/codeine; select non-CYP2D6 analgesics.",
            "risk_level": "HIGH",
            "evidence_id": ev_map.get("CPIC_CODEINE_2014"),
            "url": "https://cpicpgx.org/guidelines/guideline-for-codeine-and-cyp2d6/"
        }
    ]

    gdr_records = []
    for r in pgx_relationships:
        g_id = gene_map.get(r["gene"])
        m_id = med_map.get(r["drug"].lower())
        v_id = var_map.get(f"{g_id}_{r['variant']}") if g_id else None

        if g_id and m_id:
            gdr_records.append({
                "gene_id": g_id,
                "medication_id": m_id,
                "variant_id": v_id,
                "phenotype": r["phenotype"],
                "recommendation": r["recommendation"],
                "risk_level": r["risk_level"],
                "evidence_id": r["evidence_id"],
                "guideline_url": r["url"]
            })

    print(f"[CPIC/ClinPGx Ingestion] Inserting {len(gdr_records)} Gene-Drug relationship rules...")
    insert_records("gene_drug_relationships", gdr_records)

    return {
        "evidence_sources_count": len(evidence_items),
        "variants_count": len(variant_records),
        "gdr_count": len(gdr_records)
    }

if __name__ == "__main__":
    ingest_cpic_clinpgx()
