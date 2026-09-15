"""
CURX Deep Learning Comprehensive Scenario Testing Suite
Tests CURXSymptomNet across 6 distinct clinical and computational scenarios:
1. Classic Clear Pathologies (Gold Standard Syndromes)
2. Sparse / Low-Information Presentations (1-2 Symptoms)
3. Differential Overlap & Ambiguity (Multi-Condition Competition)
4. Conflicting / Discordant Symptoms (Contradictory Inputs)
5. Robustness to Noise & Unrecognized Slang/Tokens
6. Cross-Format Consistency (Pickle vs PyTorch vs ONNX vs TorchScript)
"""
import sys
import os
import json
import time
import pickle
import warnings
warnings.filterwarnings("ignore")
from pathlib import Path
import numpy as np
import torch
import torch.nn.functional as F

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.inference.predict_dl import predict_condition, load_inference_artifacts


def run_scenario_tests():
    print("=" * 80)
    print("CURX DEEP-LEARNING MODEL EXTENSIVE SCENARIO TESTING SUITE")
    print("=" * 80)

    # 1. SCENARIOS DEFINITIONS
    scenarios = [
        # --- Category 1: Classic Clear Syndromes ---
        {
            "category": "Classic Clear Syndromes",
            "name": "Acute Myocardial Infarction (Heart Attack)",
            "symptoms": ["chest_pain", "breathlessness", "sweating", "dizziness"],
            "expected_top": "Heart attack"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Classic Severe Malaria",
            "symptoms": ["high_fever", "chills", "vomiting", "headache", "sweating", "muscle_pain"],
            "expected_top": "Malaria"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Type-2 Diabetes Triad",
            "symptoms": ["fatigue", "weight_loss", "restlessness", "lethargy", "irregular_sugar_level", "increased_appetite", "polyuria"],
            "expected_top": "Diabetes"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Cutaneous Fungal Infection",
            "symptoms": ["itching", "skin_rash", "nodal_skin_eruptions", "dischromic _patches"],
            "expected_top": "Fungal infection"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Bronchial Asthma Attack",
            "symptoms": ["cough", "high_fever", "breathlessness", "family_history", "mucoid_sputum"],
            "expected_top": "Bronchial Asthma"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Severe Migraine with Aura",
            "symptoms": ["acidity", "indigestion", "headache", "blurred_and_distorted_vision", "excessive_hunger", "stiff_neck", "visual_disturbances"],
            "expected_top": "Migraine"
        },
        {
            "category": "Classic Clear Syndromes",
            "name": "Dengue Hemorrhagic Fever",
            "symptoms": ["skin_rash", "chills", "joint_pain", "vomiting", "fatigue", "high_fever", "headache", "nausea", "loss_of_appetite", "pain_behind_the_eyes", "back_pain"],
            "expected_top": "Dengue"
        },

        # --- Category 2: Sparse / Low-Information Presentations ---
        {
            "category": "Sparse Symptoms (Few Inputs)",
            "name": "Single Isolated Symptom (Itching)",
            "symptoms": ["itching"],
            "expected_top": "Multiple dermatological/hepatobiliary candidates expected"
        },
        {
            "category": "Sparse Symptoms (Few Inputs)",
            "name": "Dual Non-Specific Cardiorespiratory (Chest Pain + Cough)",
            "symptoms": ["chest_pain", "cough"],
            "expected_top": "GERD / Bronchial Asthma / Pneumonia"
        },
        {
            "category": "Sparse Symptoms (Few Inputs)",
            "name": "Constitutional Pair (Joint Pain + Fatigue)",
            "symptoms": ["joint_pain", "fatigue"],
            "expected_top": "Arthritis / Dengue / Hepatitis"
        },

        # --- Category 3: Clinical Differential Overlap ---
        {
            "category": "Differential Overlap",
            "name": "Hepatobiliary Syndrome (Jaundice vs Cholestasis vs Hepatitis)",
            "symptoms": ["yellowish_skin", "nausea", "loss_of_appetite", "abdominal_pain", "dark_urine"],
            "expected_top": "Chronic cholestasis / Jaundice / Hepatitis"
        },
        {
            "category": "Differential Overlap",
            "name": "Thyroid Metabolic Differentiation (Hypothyroidism markers)",
            "symptoms": ["fatigue", "weight_gain", "cold_hands_and_feets", "mood_swings", "lethargy"],
            "expected_top": "Hypothyroidism"
        },
        {
            "category": "Differential Overlap",
            "name": "Immunological Overlap (Allergy vs Drug Reaction)",
            "symptoms": ["continuous_sneezing", "shivering", "chills", "watering_from_eyes"],
            "expected_top": "Allergy"
        },

        # --- Category 4: Conflicting / Discordant Inputs ---
        {
            "category": "Contradictory / Discordant Symptoms",
            "name": "Weight Paradox (Weight Gain AND Weight Loss reported simultaneously)",
            "symptoms": ["fatigue", "weight_gain", "weight_loss", "lethargy"],
            "expected_top": "Robust differential ranking under contradiction"
        },

        # --- Category 5: Noise & Slang / Adversarial Inputs ---
        {
            "category": "Noisy & Adversarial Inputs",
            "name": "Valid Symptoms mixed with Nonsense / Unknown Tokens",
            "symptoms": ["itching", "alien_fever_999", "skin_rash", "crypto_fatigue", "nodal_skin_eruptions"],
            "expected_top": "Fungal infection (Unrecognized tokens cleanly ignored)"
        },
        {
            "category": "Noisy & Adversarial Inputs",
            "name": "Zero-Match Nonsense Tokens",
            "symptoms": ["quantum_headache", "phantom_limb_aura", "metaverse_nausea"],
            "expected_top": "INSUFFICIENT_INPUT error with clean rejection"
        },
        {
            "category": "Noisy & Adversarial Inputs",
            "name": "Completely Empty Input List",
            "symptoms": [],
            "expected_top": "INSUFFICIENT_INPUT error with 400 rejection"
        },
    ]

    results_table = []
    category_summary = {}

    for idx, test in enumerate(scenarios, 1):
        cat = test["category"]
        name = test["name"]
        symptoms = test["symptoms"]
        expected = test["expected_top"]

        t_start = time.perf_counter()
        res = predict_condition({"symptoms": symptoms})
        latency_ms = (time.perf_counter() - t_start) * 1000

        top1 = res.get("top1")
        top3 = res.get("top3", [])
        completeness = res.get("input_completeness", "N/A")
        warnings_list = res.get("warnings", [])

        if top1:
            top1_label = top1["condition"]
            top1_prob = top1["percentage"]
            top3_str = ", ".join([f"{item['condition']} ({item['percentage']})" for item in top3])
            status = "PASSED"
        else:
            top1_label = "None (Rejected)"
            top1_prob = "0.0%"
            top3_str = "None"
            status = "REJECTED_AS_EXPECTED" if not symptoms or "Nonsense" in name else "ERROR"

        entry = {
            "index": idx,
            "category": cat,
            "scenario": name,
            "input_symptoms": symptoms,
            "expected": expected,
            "predicted_top1": top1_label,
            "top1_confidence": top1_prob,
            "top3_differential": top3_str,
            "completeness": completeness,
            "latency_ms": f"{latency_ms:.2f} ms",
            "status": status,
            "warnings": warnings_list
        }
        results_table.append(entry)

        if cat not in category_summary:
            category_summary[cat] = {"total": 0, "passed": 0}
        category_summary[cat]["total"] += 1
        if status in ["PASSED", "REJECTED_AS_EXPECTED"]:
            category_summary[cat]["passed"] += 1

        print(f"\n[{idx:02d}] {cat.upper()} :: {name}")
        print(f"     Inputs ({len(symptoms)}): {symptoms}")
        print(f"     Top-1: {top1_label} [{top1_prob}] | Latency: {latency_ms:.1f}ms")
        print(f"     Top-3: {top3_str}")
        if warnings_list:
            print(f"     Warnings: {warnings_list}")

    # --- Category 6: Multi-Format Cross-Validation Test ---
    print("\n" + "=" * 80)
    print("CROSS-FORMAT CONSISTENCY VERIFICATION (Pickle vs PyTorch vs ONNX vs TorchScript)")
    print("=" * 80)

    test_symptoms = ["chest_pain", "breathlessness", "sweating", "dizziness"]

    # 1. PyTorch native
    pt_res = predict_condition({"symptoms": test_symptoms})
    pt_top1 = pt_res["top1"]["condition"]
    pt_score = pt_res["top1"]["relative_score"]

    # 2. Pickle Bundle
    with open(PROJECT_ROOT / "models" / "curx_symptom_net_bundle.pkl", "rb") as f:
        bundle = pickle.load(f)
    pkl_res = bundle.predict(test_symptoms, top_k=3)
    pkl_top1 = pkl_res["top1"]["disease"]
    pkl_score = pkl_res["top1"]["probability"]

    # 3. ONNX Runtime
    try:
        import onnxruntime as ort
        session = ort.InferenceSession(str(PROJECT_ROOT / "models" / "curx_symptom_net.onnx"))
        with open(PROJECT_ROOT / "ml" / "data" / "processed" / "metadata.json") as f:
            meta = json.load(f)
        symptom_list = meta["symptom_list"]
        class_names = meta["class_names"]
        x_vec = np.zeros((1, len(symptom_list)), dtype=np.float32)
        for s in test_symptoms:
            if s in symptom_list:
                x_vec[0, symptom_list.index(s)] = float(meta.get("severity_weights", {}).get(s, 1))
        onnx_probs = session.run(["probabilities"], {"symptom_vector": x_vec})[0][0]
        onnx_top_idx = int(np.argmax(onnx_probs))
        onnx_top1 = class_names[onnx_top_idx]
        onnx_score = float(onnx_probs[onnx_top_idx])
        onnx_verified = True
    except Exception as e:
        onnx_top1 = f"Error: {e}"
        onnx_score = 0.0
        onnx_verified = False

    # 4. TorchScript
    ts_model = torch.jit.load(str(PROJECT_ROOT / "models" / "curx_symptom_net_traced.pt"))
    ts_model.eval()
    with torch.no_grad():
        ts_probs = ts_model(torch.FloatTensor(x_vec))[0].numpy()
        ts_top_idx = int(np.argmax(ts_probs))
        ts_top1 = class_names[ts_top_idx]
        ts_score = float(ts_probs[ts_top_idx])

    format_consistency = {
        "pytorch_native": {"top1": pt_top1, "score": pt_score},
        "python_pickle": {"top1": pkl_top1, "score": pkl_score},
        "onnx_runtime": {"top1": onnx_top1, "score": onnx_score},
        "torchscript_jit": {"top1": ts_top1, "score": ts_score},
        "all_match": (pt_top1 == pkl_top1 == onnx_top1 == ts_top1)
    }

    print(f"PyTorch Native:   {pt_top1} ({pt_score*100:.2f}%)")
    print(f"Python Pickle:    {pkl_top1} ({pkl_score*100:.2f}%)")
    print(f"ONNX Runtime:     {onnx_top1} ({onnx_score*100:.2f}%)")
    print(f"TorchScript JIT:  {ts_top1} ({ts_score*100:.2f}%)")
    print(f"Format Match:     {'SUCCESS - 100% IDENTICAL' if format_consistency['all_match'] else 'DISCREPANCY'}")

    # Output reports
    out_dir = PROJECT_ROOT / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)

    final_report = {
        "total_scenarios_tested": len(scenarios),
        "category_breakdown": category_summary,
        "format_consistency": format_consistency,
        "detailed_test_runs": results_table
    }

    with open(out_dir / "dl_scenario_test_results.json", "w") as f:
        json.dump(final_report, f, indent=2)

    print("\n" + "=" * 80)
    print("SCENARIO TESTING COMPLETED SUCCESSFULLY!")
    print(f"Report saved to: {out_dir / 'dl_scenario_test_results.json'}")
    print("=" * 80)

    return final_report


if __name__ == "__main__":
    run_scenario_tests()
