import os
import zipfile
import csv
from backend.ingestion.supabase_client import insert_records, get_records

def ingest_symptoms(filepath: str = "curx datasets/curx dataset symptom.zip"):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Symptom zip not found at {filepath}")

    print(f"[Symptom Ingestion] Opening {filepath}...")
    
    with zipfile.ZipFile(filepath, "r") as z:
        # 1. Parse Disease Descriptions & Precautions
        descriptions = {}
        with z.open("symptom_Description.csv") as f:
            reader = csv.reader([line.decode("utf-8", errors="ignore") for line in f.readlines()])
            next(reader)
            for row in reader:
                if len(row) >= 2:
                    disease = row[0].strip()
                    desc = row[1].strip()
                    descriptions[disease] = desc

        precautions = {}
        with z.open("symptom_precaution.csv") as f:
            reader = csv.reader([line.decode("utf-8", errors="ignore") for line in f.readlines()])
            next(reader)
            for row in reader:
                if len(row) >= 5:
                    disease = row[0].strip()
                    precautions[disease] = [row[1].strip(), row[2].strip(), row[3].strip(), row[4].strip()]

        # Combine into Conditions records
        all_diseases = set(list(descriptions.keys()) + list(precautions.keys()))
        condition_records = []
        for dis in all_diseases:
            p = precautions.get(dis, ["", "", "", ""])
            condition_records.append({
                "canonical_name": dis,
                "description": descriptions.get(dis, f"Clinical condition {dis}"),
                "precaution_1": p[0] if len(p) > 0 else "",
                "precaution_2": p[1] if len(p) > 1 else "",
                "precaution_3": p[2] if len(p) > 2 else "",
                "precaution_4": p[3] if len(p) > 3 else "",
            })

        print(f"[Symptom Ingestion] Inserting {len(condition_records)} conditions...")
        insert_records("conditions", condition_records, on_conflict="canonical_name")

        # 2. Parse Symptoms & Weights
        symptom_weights = {}
        with z.open("Symptom-severity.csv") as f:
            reader = csv.reader([line.decode("utf-8", errors="ignore") for line in f.readlines()])
            next(reader)
            for row in reader:
                if len(row) >= 2:
                    sym = row[0].strip().replace("_", " ").strip()
                    try:
                        w = int(row[1].strip())
                    except:
                        w = 1
                    symptom_weights[sym] = w

        symptom_records = []
        for s_name, s_weight in symptom_weights.items():
            symptom_records.append({
                "canonical_name": s_name,
                "clinical_weight": s_weight
            })

        print(f"[Symptom Ingestion] Inserting {len(symptom_records)} symptoms...")
        insert_records("symptoms", symptom_records, on_conflict="canonical_name")

        # Query back condition and symptom maps for foreign key linkages
        conditions_db = get_records("conditions", select="id,canonical_name", limit=200)
        symptoms_db = get_records("symptoms", select="id,canonical_name", limit=500)

        cond_map = {c["canonical_name"].lower(): c["id"] for c in (conditions_db or [])}
        sym_map = {s["canonical_name"].lower(): s["id"] for s in (symptoms_db or [])}

        # 3. Parse Disease-Symptom Matrix
        disease_symptom_pairs = set()
        with z.open("dataset.csv") as f:
            reader = csv.reader([line.decode("utf-8", errors="ignore") for line in f.readlines()])
            next(reader)
            for row in reader:
                if not row:
                    continue
                disease = row[0].strip()
                cond_id = cond_map.get(disease.lower())
                if not cond_id:
                    continue
                for sym_raw in row[1:]:
                    s_clean = sym_raw.strip().replace("_", " ").strip()
                    if s_clean:
                        sym_id = sym_map.get(s_clean.lower())
                        if sym_id:
                            disease_symptom_pairs.add((cond_id, sym_id))

        ds_records = [
            {"condition_id": cid, "symptom_id": sid, "frequency_rank": 1}
            for cid, sid in disease_symptom_pairs
        ]

        print(f"[Symptom Ingestion] Inserting {len(ds_records)} disease-symptom linkages...")
        for i in range(0, len(ds_records), 200):
            insert_records("disease_symptoms", ds_records[i : i + 200])

    return {
        "conditions_count": len(condition_records),
        "symptoms_count": len(symptom_records),
        "linkages_count": len(ds_records)
    }

if __name__ == "__main__":
    ingest_symptoms()
