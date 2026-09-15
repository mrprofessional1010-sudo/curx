"""
CURX Deep-Learning Subgroup Bias & Fairness Audit
Evaluates performance across clinical organ-system categories.
"""
import sys
import json
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import yaml
from pathlib import Path

import torch
import torch.nn.functional as F
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import build_model


# Standard ICD-10 organ system taxonomy mapping
CLINICAL_CATEGORIES = {
    "Infectious": [
        "Fungal infection", "Allergy", "GERD", "Chronic cholestasis", "Drug Reaction",
        "Peptic ulcer diseae", "AIDS", "Gastroenteritis", "Bronchial Asthma",
        "Hypertension", "Migraine", "Cervical spondylosis", "Paralysis (brain hemorrhage)",
        "Jaundice", "Malaria", "Chicken pox", "Dengue", "Typhoid", "hepatitis A",
        "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E", "Alcoholic hepatitis",
        "Tuberculosis", "Common Cold", "Pneumonia", "Dimorphic hemmorhoids(piles)",
        "Heart attack", "Varicose veins", "Hypothyroidism", "Hyperthyroidism",
        "Hypoglycemia", "Osteoarthristis", "Arthritis",
        "(vertigo) Paroymsal  Positional Vertigo", "Acne",
        "Urinary tract infection", "Psoriasis", "Impetigo", "Diabetes"
    ]
}

# Refined organ-system mapping
ORGAN_SYSTEMS = {
    "Dermatological": ["Acne", "Psoriasis", "Impetigo", "Fungal infection"],
    "Infectious_Systemic": ["Chicken pox", "Dengue", "Typhoid", "Malaria", "Tuberculosis", "Common Cold", "Pneumonia", "AIDS"],
    "Hepatobiliary": ["Jaundice", "Chronic cholestasis", "Alcoholic hepatitis", "hepatitis A", "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E"],
    "Gastrointestinal": ["GERD", "Peptic ulcer diseae", "Gastroenteritis", "Dimorphic hemmorhoids(piles)"],
    "Cardiovascular": ["Hypertension", "Heart attack", "Varicose veins"],
    "Endocrine_Metabolic": ["Diabetes", "Hypothyroidism", "Hyperthyroidism", "Hypoglycemia"],
    "Musculoskeletal": ["Osteoarthristis", "Arthritis", "Cervical spondylosis"],
    "Neurological": ["Migraine", "Paralysis (brain hemorrhage)", "(vertigo) Paroymsal  Positional Vertigo"]
}


def run_bias_audit(checkpoint_path, split="val", temperature=1.0):
    device = torch.device("cpu")
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    cfg = ckpt["config"]
    model_name = ckpt.get("model_name", "curx_symptom_net")
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    n_features = metadata["n_features"]
    n_classes = metadata["n_classes"]
    class_names = metadata["class_names"]
    name_to_idx = {name: i for i, name in enumerate(class_names)}

    model = build_model(model_name, cfg, n_features, n_classes).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")

    with torch.no_grad():
        out = model(torch.FloatTensor(X).to(device))
        logits = out["logits"] if isinstance(out, dict) else out
        proba = F.softmax(logits / temperature, dim=-1).cpu().numpy()
        preds = np.argmax(proba, axis=1)

    subgroup_results = {}
    all_accuracies = []

    for system_name, diseases in ORGAN_SYSTEMS.items():
        system_indices = [name_to_idx[d] for d in diseases if d in name_to_idx]
        mask = np.isin(y, system_indices)
        n_samples = int(mask.sum())

        if n_samples > 0:
            sub_y = y[mask]
            sub_preds = preds[mask]
            acc = accuracy_score(sub_y, sub_preds)
            f1 = f1_score(sub_y, sub_preds, average="macro", zero_division=0)
            all_accuracies.append(acc)

            subgroup_results[system_name] = {
                "n_samples": n_samples,
                "accuracy": float(acc),
                "macro_f1": float(f1),
                "represented_diseases": [d for d in diseases if d in name_to_idx and (y == name_to_idx[d]).sum() > 0]
            }

    disparity = {
        "max_accuracy": float(np.max(all_accuracies)) if all_accuracies else 0.0,
        "min_accuracy": float(np.min(all_accuracies)) if all_accuracies else 0.0,
        "accuracy_gap": float(np.max(all_accuracies) - np.min(all_accuracies)) if all_accuracies else 0.0
    }

    report = {
        "model_name": model_name,
        "split": split,
        "temperature": float(temperature),
        "subgroup_results": subgroup_results,
        "disparity": disparity
    }

    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / f"bias_audit_{model_name}_{split}.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"Bias audit complete for {model_name} on {split}:")
    for sys_name, res in subgroup_results.items():
        print(f"  {sys_name:22s} ({res['n_samples']:2d} samples) -> Acc: {res['accuracy']:.4f}, F1: {res['macro_f1']:.4f}")
    print(f"  Disparity Gap: {disparity['accuracy_gap']:.4f}")

    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--split", type=str, default="val")
    parser.add_argument("--temperature", type=float, default=1.0)
    args = parser.parse_args()
    run_bias_audit(args.checkpoint, split=args.split, temperature=args.temperature)
