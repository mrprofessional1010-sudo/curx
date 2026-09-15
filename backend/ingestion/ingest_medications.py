import os
import zipfile
import csv
import re
from backend.ingestion.supabase_client import insert_records, get_records

# Verified RxNorm CUI mapping dictionary for high-frequency clinical entities
RXNORM_CORE_MAP = {
    "warfarin": "11289",
    "clopidogrel": "32968",
    "aspirin": "1191",
    "ibuprofen": "5640",
    "simvastatin": "36567",
    "atorvastatin": "83367",
    "amiodarone": "703",
    "lisinopril": "29046",
    "ciprofloxacin": "2551",
    "methotrexate": "6851",
    "digoxin": "3407",
    "metformin": "6809",
    "omeprazole": "7646",
    "tacrolimus": "42316",
    "fluconazole": "4450",
    "spironolactone": "9997",
    "theophylline": "10438",
    "clarithromycin": "21212",
    "tramadol": "10689",
    "fluoxetine": "4492",
    "lithium": "6448",
    "hydrochlorothiazide": "5487",
    "sildenafil": "36141",
    "nitroglycerin": "4917",
    "levothyroxine": "10582",
    "citalopram": "2556",
    "ondansetron": "70433",
    "phenytoin": "8134",
    "carbamazepine": "2002",
    "allopurinol": "519",
    "azathioprine": "1256",
    "propranolol": "8787",
    "gentamicin": "4734",
    "verapamil": "11170",
    "paracetamol": "161",
    "morphine": "7052",
    "prednisone": "8640",
    "atropine": "1223",
    "flecainide": "4418",
    "pseudoephedrine": "8896",
    "metoclopramide": "6915",
    "alendronate": "22656",
    "abacavir": "190521",
    "tamoxifen": "10324",
    "ivacaftor": "1242377",
    "efavirenz": "195085",
    "methadone": "6813",
    "voriconazole": "121243",
    "atomoxetine": "36544",
    "fluorouracil": "4464",
    "capecitabine": "80892",
    "mercaptopurine": "6786",
    "thioguanine": "10454",
    "succinylcholine": "10156",
    "atazanavir": "358263",
    "hydralazine": "5470"
}

def extract_active_ingredient(composition: str) -> str:
    if not composition:
        return ""
    # Remove dosage inside parentheses e.g. "Amoxycillin (500mg) + Clavulanic Acid (125mg)" -> "Amoxycillin + Clavulanic Acid"
    clean = re.sub(r"\([^)]*\)", "", composition)
    parts = [p.strip() for p in clean.split("+") if p.strip()]
    return " + ".join(parts) if parts else clean.strip()

def ingest_medications(filepath: str = "curx datasets/Drug Dataset.zip", batch_size: int = 250):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Drug dataset not found at {filepath}")

    print(f"[Medication Ingestion] Reading {filepath}...")
    med_records = []
    mapping_records = []
    seen_canonical = set()

    with zipfile.ZipFile(filepath, "r") as z:
        with z.open("Medicine_Details.csv") as f:
            lines = [l.decode("utf-8", errors="ignore") for l in f.readlines()]
            reader = csv.DictReader(lines)
            for row in reader:
                med_name = row.get("Medicine Name", "").strip()
                comp = row.get("Composition", "").strip()
                uses = row.get("Uses", "").strip()
                side_effects = row.get("Side_effects", "").strip()
                manufacturer = row.get("Manufacturer", "").strip()
                img_url = row.get("Image URL", "").strip()

                if not med_name:
                    continue

                active_ing = extract_active_ingredient(comp)
                
                # Try to find matching RxNorm CUI
                rxcui = None
                for key, cui in RXNORM_CORE_MAP.items():
                    if key in med_name.lower() or key in active_ing.lower():
                        rxcui = cui
                        break

                canonical_name = med_name
                if canonical_name in seen_canonical:
                    continue
                seen_canonical.add(canonical_name)

                med_record = {
                    "canonical_name": canonical_name,
                    "rxcui": rxcui,
                    "active_ingredient": active_ing,
                    "composition": comp,
                    "uses": uses,
                    "side_effects": side_effects,
                    "image_url": img_url
                }
                med_records.append(med_record)

    # In addition, ensure standard core canonical medications exist
    for core_drug, cui in RXNORM_CORE_MAP.items():
        title_drug = core_drug.capitalize()
        if title_drug not in seen_canonical:
            seen_canonical.add(title_drug)
            med_records.insert(0, {
                "canonical_name": title_drug,
                "rxcui": cui,
                "active_ingredient": title_drug,
                "composition": title_drug,
                "uses": f"Clinical therapeutics for {title_drug}",
                "side_effects": "Consult clinical drug monograph",
                "image_url": ""
            })

    print(f"[Medication Ingestion] Total canonical medications prepared: {len(med_records)}")
    
    # Ingest representative cohort (core therapeutics + catalog subset)
    target_records = med_records[:1500]
    inserted = 0
    for i in range(0, len(target_records), batch_size):
        chunk = target_records[i : i + batch_size]
        try:
            insert_records("medications", chunk, on_conflict="canonical_name")
            inserted += len(chunk)
            print(f"[Medication Ingestion] Inserted batch {i}..{i+len(chunk)} ({inserted}/{len(target_records)})")
        except Exception as e:
            print(f"[Medication Ingestion] Batch error at {i}: {e}")

    # Build Medication Source Mappings
    db_meds = get_records("medications", select="id,canonical_name,rxcui", limit=2000)
    for m in (db_meds or []):
        mapping_records.append({
            "medication_id": m["id"],
            "source": "1mg / RxNorm",
            "source_record_id": m.get("rxcui") or m["id"],
            "source_name": m["canonical_name"],
            "normalized_name": m["canonical_name"].lower()
        })

    for i in range(0, len(mapping_records), batch_size):
        try:
            insert_records("medication_source_mappings", mapping_records[i : i + batch_size])
        except Exception as e:
            print(f"[Medication Ingestion] Mapping insert error at {i}: {e}")

    return {
        "medications_inserted": inserted,
        "mappings_count": len(mapping_records)
    }

if __name__ == "__main__":
    ingest_medications()
