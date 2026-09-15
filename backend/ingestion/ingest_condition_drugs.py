import os
import csv
from backend.ingestion.supabase_client import insert_records, get_records

def ingest_condition_drugs(filepath: str = "backend/seed_data/condition_drug_rules.csv"):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Condition-drug file not found at {filepath}")

    print(f"[CDR Ingestion] Reading {filepath}...")
    db_conds = get_records("conditions", select="id,canonical_name", limit=200)
    db_meds = get_records("medications", select="id,canonical_name", limit=2000)
    db_ev = get_records("evidence_sources", select="id,source_record_id", limit=100)

    cond_map = {c["canonical_name"].lower(): c["id"] for c in (db_conds or [])}
    med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or [])}

    ev_default_id = None
    for e in (db_ev or []):
        if "CDR" in e.get("source_record_id", ""):
            ev_default_id = e["id"]
            break

    cdr_records = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cond_str = row.get("condition_name", "").strip().lower()
            med_str = row.get("medication_name", "").strip().lower()
            rel_type = row.get("relationship_type", "").strip()
            risk_level = row.get("risk_level", "").strip().upper()
            mech = row.get("mechanism", "").strip()
            rule_id = row.get("rule_id", "").strip()
            ev_src = row.get("evidence_source", "").strip()

            c_id = cond_map.get(cond_str)
            # fuzzy / partial fallback if exact name differs
            if not c_id:
                for k, v in cond_map.items():
                    if k in cond_str or cond_str in k:
                        c_id = v
                        break

            m_id = med_map.get(med_str)
            if not m_id:
                for k, v in med_map.items():
                    if k in med_str or med_str in k:
                        m_id = v
                        break

            if c_id and m_id:
                cdr_records.append({
                    "condition_id": c_id,
                    "medication_id": m_id,
                    "relationship_type": rel_type,
                    "risk_level": risk_level if risk_level in ["LOW", "MODERATE", "HIGH", "SEVERE"] else "HIGH",
                    "mechanism": mech,
                    "rule_id": rule_id,
                    "evidence_id": ev_default_id,
                    "source": ev_src,
                    "source_record_id": rule_id
                })

    print(f"[CDR Ingestion] Inserting {len(cdr_records)} condition-drug contraindication rules...")
    insert_records("condition_drug_relationships", cdr_records)

    return {"cdr_count": len(cdr_records)}

if __name__ == "__main__":
    ingest_condition_drugs()
