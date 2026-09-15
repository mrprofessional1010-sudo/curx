from backend.ingestion.supabase_client import insert_records, get_records

def seed_demo_patient():
    print("[Demo Patient Seeding] Setting up verified clinical demo profile...")
    
    # Check if demo patient exists
    existing = get_records("patients", select="id,full_name,is_demo", limit=10)
    demo_patients = [p for p in (existing or []) if p.get("is_demo")]
    
    if demo_patients:
        patient_id = demo_patients[0]["id"]
        print(f"[Demo Patient Seeding] Demo patient already exists: {patient_id}")
        return {"patient_id": patient_id}

    # Insert new demo patient
    new_patient = insert_records("patients", [{
        "full_name": "Elena Rostova (Clinical Test Profile)",
        "age": 64,
        "gender": "Female",
        "clinical_notes": "Post-MI patient with atrial fibrillation, recurrent osteoarthritis flare-ups, and mild dyspepsia. Monitored for multi-axis pharmacogenomic and DDI risk.",
        "is_demo": True
    }])

    if not new_patient:
        raise Exception("Failed to create demo patient record")

    patient_id = new_patient[0]["id"]
    print(f"[Demo Patient Seeding] Created patient record: {patient_id}")

    # Fetch lookups
    db_meds = get_records("medications", select="id,canonical_name", limit=2000)
    db_genes = get_records("genes", select="id,symbol", limit=1000)
    db_conds = get_records("conditions", select="id,canonical_name", limit=200)
    db_syms = get_records("symptoms", select="id,canonical_name", limit=500)
    db_vars = get_records("genetic_variants", select="id,gene_id,variant_name", limit=200)

    med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or [])}
    gene_map = {g["symbol"].upper(): g["id"] for g in (db_genes or [])}
    cond_map = {c["canonical_name"].lower(): c["id"] for c in (db_conds or [])}
    sym_map = {s["canonical_name"].lower(): s["id"] for s in (db_syms or [])}

    # 1. Prescribe active medications (Warfarin, Ibuprofen, Omeprazole, Clopidogrel)
    patient_meds = []
    for med_name, dosage, freq in [
        ("Warfarin", "5mg", "Once daily at bedtime"),
        ("Ibuprofen", "400mg", "Twice daily with meals as needed"),
        ("Omeprazole", "20mg", "Once daily before breakfast"),
        ("Clopidogrel", "75mg", "Once daily")
    ]:
        m_id = med_map.get(med_name.lower())
        if m_id:
            patient_meds.append({
                "patient_id": patient_id,
                "medication_id": m_id,
                "dosage": dosage,
                "frequency": freq
            })

    if patient_meds:
        insert_records("patient_medications", patient_meds)

    # 2. Patient Variants (CYP2C9 *1/*3, VKORC1 -1639G>A, CYP2C19 *1/*2)
    patient_vars = []
    for g_sym, v_name, dip, pheno in [
        ("CYP2C9", "*3", "*1/*3", "CYP2C9 Intermediate Metabolizer"),
        ("VKORC1", "-1639G>A", "G/A", "VKORC1 High Sensitivity"),
        ("CYP2C19", "*2", "*1/*2", "CYP2C19 Intermediate Metabolizer")
    ]:
        g_id = gene_map.get(g_sym)
        v_id = None
        for v in (db_vars or []):
            if v["gene_id"] == g_id and v["variant_name"] == v_name:
                v_id = v["id"]
                break
        if g_id:
            patient_vars.append({
                "patient_id": patient_id,
                "gene_id": g_id,
                "variant_id": v_id,
                "diplotype": dip,
                "phenotype": pheno
            })

    if patient_vars:
        insert_records("patient_variants", patient_vars)

    # 3. Patient Conditions (Peptic Ulcer Disease, Atrial Fibrillation)
    patient_conds = []
    for c_name in ["peptic ulcer", "atrial fibrillation", "hypertension", "gerd"]:
        for k, v in cond_map.items():
            if c_name in k:
                patient_conds.append({
                    "patient_id": patient_id,
                    "condition_id": v
                })
                break

    if patient_conds:
        insert_records("patient_conditions", patient_conds)

    # 4. Patient Symptoms (chest pain, fatigue, nausea)
    patient_syms = []
    for s_name in ["chest pain", "fatigue", "nausea", "vomiting", "itching"]:
        for k, v in sym_map.items():
            if s_name in k:
                patient_syms.append({
                    "patient_id": patient_id,
                    "symptom_id": v
                })
                break

    if patient_syms:
        insert_records("patient_symptoms", patient_syms)

    print(f"[Demo Patient Seeding] Successfully configured demo patient {patient_id} with multi-axis clinical factors.")
    return {"patient_id": patient_id}

if __name__ == "__main__":
    seed_demo_patient()
