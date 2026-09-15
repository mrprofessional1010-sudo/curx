import os
import sys
import datetime
from backend.ingestion.hashing import compute_file_sha256
from backend.ingestion.supabase_client import insert_records, get_records
from backend.ingestion.ingest_hgnc import ingest_hgnc
from backend.ingestion.ingest_symptoms import ingest_symptoms
from backend.ingestion.ingest_medications import ingest_medications
from backend.ingestion.ingest_cpic_clinpgx import ingest_cpic_clinpgx
from backend.ingestion.ingest_drug_interactions import ingest_drug_interactions
from backend.ingestion.ingest_condition_drugs import ingest_condition_drugs
from backend.ingestion.ingest_openfda import ingest_openfda
from backend.ingestion.seed_demo_patient import seed_demo_patient

def log_pipeline_run(dataset_name: str, hash_val: str, stats: dict, errors=None):
    record = {
        "dataset_name": dataset_name,
        "content_hash": hash_val,
        "rows_seen": stats.get("rows_seen", stats.get("total", 0)),
        "rows_valid": stats.get("rows_valid", stats.get("valid", 0)),
        "rows_rejected": stats.get("rows_rejected", stats.get("rejected", 0)),
        "rows_inserted": stats.get("rows_inserted", stats.get("inserted", stats.get("count", 0))),
        "rows_updated": stats.get("rows_updated", 0),
        "rows_skipped": stats.get("rows_skipped", 0),
        "errors": errors or [],
        "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    insert_records("data_ingestion_runs", [record])

def run_all_ingestions(force: bool = False):
    print("================================================================")
    print("           STARTING CURX DATA INGESTION PIPELINE                ")
    print("================================================================\n")
    
    results = {}

    # 1. HGNC Genes
    try:
        hgnc_path = "curx datasets/hgnc_complete_set.txt"
        hgnc_hash = compute_file_sha256(hgnc_path) if os.path.exists(hgnc_path) else "NA"
        stats = ingest_hgnc(hgnc_path)
        log_pipeline_run("HGNC Complete Set", hgnc_hash, stats)
        results["hgnc"] = stats
    except Exception as e:
        print(f"[Pipeline Error] HGNC: {e}")
        log_pipeline_run("HGNC Complete Set", "ERR", {}, errors=[str(e)])

    # 2. Symptoms & Conditions
    try:
        sym_path = "curx datasets/curx dataset symptom.zip"
        sym_hash = compute_file_sha256(sym_path) if os.path.exists(sym_path) else "NA"
        stats = ingest_symptoms(sym_path)
        log_pipeline_run("Disease-Symptom Matrix", sym_hash, stats)
        results["symptoms"] = stats
    except Exception as e:
        print(f"[Pipeline Error] Symptoms: {e}")
        log_pipeline_run("Disease-Symptom Matrix", "ERR", {}, errors=[str(e)])

    # 3. Medications & RxNorm
    try:
        med_path = "curx datasets/Drug Dataset.zip"
        med_hash = compute_file_sha256(med_path) if os.path.exists(med_path) else "NA"
        stats = ingest_medications(med_path)
        log_pipeline_run("CURX Medication Catalog (RxNorm)", med_hash, stats)
        results["medications"] = stats
    except Exception as e:
        print(f"[Pipeline Error] Medications: {e}")
        log_pipeline_run("CURX Medication Catalog (RxNorm)", "ERR", {}, errors=[str(e)])

    # 4. CPIC & ClinPGx
    try:
        cpic_path = "curx datasets/cpic guide lines.tsv"
        cpic_hash = compute_file_sha256(cpic_path) if os.path.exists(cpic_path) else "NA"
        stats = ingest_cpic_clinpgx()
        log_pipeline_run("CPIC / ClinPGx Guidelines", cpic_hash, stats)
        results["cpic"] = stats
    except Exception as e:
        print(f"[Pipeline Error] CPIC: {e}")
        log_pipeline_run("CPIC / ClinPGx Guidelines", "ERR", {}, errors=[str(e)])

    # 5. Drug-Drug Interactions
    try:
        ddi_path = "backend/seed_data/drug_drug_interactions.csv"
        ddi_hash = compute_file_sha256(ddi_path) if os.path.exists(ddi_path) else "NA"
        stats = ingest_drug_interactions(ddi_path)
        log_pipeline_run("Drug-Drug Interactions", ddi_hash, stats)
        results["ddi"] = stats
    except Exception as e:
        print(f"[Pipeline Error] DDI: {e}")
        log_pipeline_run("Drug-Drug Interactions", "ERR", {}, errors=[str(e)])

    # 6. Condition-Drug Contraindications
    try:
        cdr_path = "backend/seed_data/condition_drug_rules.csv"
        cdr_hash = compute_file_sha256(cdr_path) if os.path.exists(cdr_path) else "NA"
        stats = ingest_condition_drugs(cdr_path)
        log_pipeline_run("Condition-Drug Contraindication Rules", cdr_hash, stats)
        results["cdr"] = stats
    except Exception as e:
        print(f"[Pipeline Error] CDR: {e}")
        log_pipeline_run("Condition-Drug Contraindication Rules", "ERR", {}, errors=[str(e)])

    # 7. OpenFDA Label Documents
    try:
        fda_path = "curx datasets/drug-label-0001-of-0014.json.zip"
        fda_hash = compute_file_sha256(fda_path) if os.path.exists(fda_path) else "NA"
        stats = ingest_openfda(fda_path)
        log_pipeline_run("openFDA Structured Product Labels", fda_hash, stats)
        results["openfda"] = stats
    except Exception as e:
        print(f"[Pipeline Error] openFDA: {e}")
        log_pipeline_run("openFDA Structured Product Labels", "ERR", {}, errors=[str(e)])

    # 8. Seed Demo Patient
    try:
        stats = seed_demo_patient()
        results["demo_patient"] = stats
    except Exception as e:
        print(f"[Pipeline Error] Demo Patient: {e}")

    print("\n================================================================")
    print("           CURX PIPELINE INGESTION COMPLETED                    ")
    print("================================================================")
    return results

if __name__ == "__main__":
    run_all_ingestions()
