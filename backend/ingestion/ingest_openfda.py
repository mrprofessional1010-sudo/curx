import os
import zipfile
import json
from backend.ingestion.supabase_client import insert_records, get_records

def ingest_openfda(zip_path: str = "curx datasets/drug-label-0001-of-0014.json.zip", max_records: int = 50):
    if not os.path.exists(zip_path):
        print(f"[openFDA Ingestion] Notice: {zip_path} not found, skipping.")
        return {"documents_count": 0}

    print(f"[openFDA Ingestion] Reading sample labels from {zip_path}...")
    db_meds = get_records("medications", select="id,canonical_name", limit=2000)
    med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or [])}

    doc_records = []
    seen_set_ids = set()

    with zipfile.ZipFile(zip_path, "r") as z:
        for name in z.namelist():
            if name.endswith(".json"):
                with z.open(name) as f:
                    data = json.load(f)
                    results = data.get("results", [])
                    for item in results:
                        set_id = item.get("set_id")
                        if not set_id or set_id in seen_set_ids:
                            continue

                        openfda = item.get("openfda", {})
                        generic_names = openfda.get("generic_name", [])
                        substance_names = openfda.get("substance_name", [])
                        brand_names = openfda.get("brand_name", [])
                        manufacturer = openfda.get("manufacturer_name", [""])[0] if openfda.get("manufacturer_name") else ""

                        all_names = [n.lower() for n in generic_names + substance_names + brand_names]
                        matched_med_id = None
                        for name_cand in all_names:
                            for m_name, m_id in med_map.items():
                                if m_name in name_cand or name_cand in m_name:
                                    matched_med_id = m_id
                                    break
                            if matched_med_id:
                                break

                        # Even if unlinked to a specific small catalog item, pick a primary med or link to first available
                        if not matched_med_id and db_meds:
                            matched_med_id = db_meds[0]["id"]

                        def get_text(field):
                            val = item.get(field, [])
                            if isinstance(val, list):
                                return " ".join(val[:3])[:2000]
                            return str(val)[:2000]

                        boxed = get_text("boxed_warning")
                        warnings = get_text("warnings") or get_text("warnings_and_cautions")
                        contra = get_text("contraindications")
                        indic = get_text("indications_and_usage")
                        adv = get_text("adverse_reactions")
                        ddi_text = get_text("drug_interactions")
                        dosage = get_text("dosage_and_administration")

                        if not (warnings or contra or indic):
                            continue

                        seen_set_ids.add(set_id)
                        doc_records.append({
                            "medication_id": matched_med_id,
                            "set_id": set_id,
                            "spl_id": item.get("id", ""),
                            "effective_time": item.get("effective_time", ""),
                            "manufacturer_name": manufacturer,
                            "boxed_warning": boxed,
                            "warnings": warnings,
                            "contraindications": contra,
                            "indications_and_usage": indic,
                            "adverse_reactions": adv,
                            "drug_interactions_text": ddi_text,
                            "dosage_and_administration": dosage
                        })

                        if len(doc_records) >= max_records:
                            break

    print(f"[openFDA Ingestion] Inserting {len(doc_records)} structured drug label documents...")
    insert_records("drug_label_documents", doc_records, on_conflict="set_id")

    return {"documents_count": len(doc_records)}

if __name__ == "__main__":
    ingest_openfda()
