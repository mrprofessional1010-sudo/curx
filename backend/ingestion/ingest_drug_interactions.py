import os
import csv
from backend.ingestion.supabase_client import insert_records, get_records

def ingest_drug_interactions(filepath: str = "backend/seed_data/drug_drug_interactions.csv"):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Interaction file not found at {filepath}")

    print(f"[DDI Ingestion] Reading {filepath}...")
    db_meds = get_records("medications", select="id,canonical_name", limit=2000)
    db_ev = get_records("evidence_sources", select="id,source_record_id", limit=100)

    med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or [])}
    ev_default_id = None
    for e in (db_ev or []):
        if "DDI" in e.get("source_record_id", ""):
            ev_default_id = e["id"]
            break

    ddi_records = []
    seen_pairs = set()

    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            drug_a_str = row.get("drug_a", "").strip().lower()
            drug_b_str = row.get("drug_b", "").strip().lower()
            sev = row.get("severity", "").strip().upper()
            itype = row.get("interaction_type", "").strip()
            mech = row.get("mechanism", "").strip()
            desc = row.get("description", "").strip()
            ev_src = row.get("evidence_source", "").strip()

            id_a = med_map.get(drug_a_str)
            id_b = med_map.get(drug_b_str)

            if not id_a or not id_b or id_a == id_b:
                continue

            pair_key = tuple(sorted([id_a, id_b]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            ddi_records.append({
                "drug_a_id": id_a,
                "drug_b_id": id_b,
                "interaction_type": itype,
                "severity": sev if sev in ["LOW", "MODERATE", "HIGH", "SEVERE"] else "MODERATE",
                "mechanism": mech,
                "description": desc,
                "evidence_id": ev_default_id,
                "source_metadata": {"source": ev_src}
            })

    print(f"[DDI Ingestion] Inserting {len(ddi_records)} drug-drug interaction pairs...")
    insert_records("drug_drug_interactions", ddi_records)

    return {"ddi_count": len(ddi_records)}

if __name__ == "__main__":
    ingest_drug_interactions()
