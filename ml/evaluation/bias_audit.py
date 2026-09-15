"""
CURX ML Bias / Fairness Audit
Evaluates model performance across clinically relevant subgroups.
Since no demographic patient data exists, groups diseases by clinical category.
"""
import sys
import json
import argparse
import numpy as np
import torch
import torch.nn.functional as F
import yaml
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer

# Clinical subgroups for disease categories
DISEASE_SUBGROUPS = {
    "Infectious": [
        "Fungal infection", "AIDS", "Chicken pox", "Dengue", "Typhoid",
        "Malaria", "Tuberculosis", "Common Cold", "Pneumonia", "Impetigo",
        "hepatitis A", "Hepatitis B", "Hepatitis C", "Hepatitis D", "Hepatitis E"
    ],
    "Gastrointestinal": [
        "GERD", "Peptic ulcer diseae", "Gastroenteritis", "Jaundice",
        "Chronic cholestasis", "Alcoholic hepatitis",
        "Dimorphic hemmorhoids(piles)"
    ],
    "Cardiovascular": [
        "Hypertension", "Heart attack", "Varicose veins"
    ],
    "Endocrine_Metabolic": [
        "Diabetes", "Hypothyroidism", "Hyperthyroidism", "Hypoglycemia"
    ],
    "Musculoskeletal": [
        "Cervical spondylosis", "Osteoarthristis", "Arthritis"
    ],
    "Neurological": [
        "Migraine", "Paralysis (brain hemorrhage)",
        "(vertigo) Paroymsal  Positional Vertigo"
    ],
    "Dermatological": [
        "Acne", "Psoriasis"
    ],
    "Respiratory": [
        "Bronchial Asthma"
    ],
    "Other": [
        "Drug Reaction", "Allergy", "Urinary tract infection"
    ]
}


def run_bias_audit(checkpoint_path=None, split="test"):
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    if checkpoint_path is None:
        checkpoint_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"

    # Load model
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model_cfg = ckpt["config"]["model"]
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    model = SymptomTransformer(
        n_features=metadata["n_features"],
        n_classes=metadata["n_classes"],
        hidden_dim=model_cfg["hidden_dim"],
        num_layers=model_cfg["num_layers"],
        num_heads=model_cfg["num_heads"],
        dropout=model_cfg["dropout"],
    ).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    # Load data
    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")
    class_names = metadata["class_names"]

    # Predict
    with torch.no_grad():
        logits = model(torch.FloatTensor(X).to(device))
        y_pred = logits.argmax(dim=-1).cpu().numpy()

    print("=" * 60)
    print("CURX BIAS / FAIRNESS AUDIT")
    print("=" * 60)

    # Build disease → subgroup mapping
    disease_to_group = {}
    for group, diseases in DISEASE_SUBGROUPS.items():
        for d in diseases:
            disease_to_group[d] = group

    # Map class indices to subgroups
    sample_groups = []
    for idx in y:
        disease_name = class_names[idx]
        group = disease_to_group.get(disease_name, "Unknown")
        sample_groups.append(group)
    sample_groups = np.array(sample_groups)

    # Per-subgroup metrics
    subgroup_results = {}
    print(f"\n{'Subgroup':<25} {'N':>5} {'Accuracy':>10} {'F1':>10} {'Precision':>10} {'Recall':>10}")
    print("-" * 72)

    for group in sorted(set(sample_groups)):
        mask = sample_groups == group
        if mask.sum() < 2:
            continue
        y_g = y[mask]
        y_p = y_pred[mask]

        acc = float(accuracy_score(y_g, y_p))
        f1 = float(f1_score(y_g, y_p, average="macro", zero_division=0))
        prec = float(precision_score(y_g, y_p, average="macro", zero_division=0))
        rec = float(recall_score(y_g, y_p, average="macro", zero_division=0))

        subgroup_results[group] = {
            "n_samples": int(mask.sum()),
            "accuracy": acc,
            "f1_macro": f1,
            "precision_macro": prec,
            "recall_macro": rec,
        }
        print(f"  {group:<23} {mask.sum():>5} {acc:>10.4f} {f1:>10.4f} {prec:>10.4f} {rec:>10.4f}")

    # Disparity analysis
    accuracies = [v["accuracy"] for v in subgroup_results.values() if v["n_samples"] >= 2]
    if accuracies:
        max_acc = max(accuracies)
        min_acc = min(accuracies)
        disparity = max_acc - min_acc

        print(f"\n{'=' * 60}")
        print("DISPARITY ANALYSIS")
        print(f"{'=' * 60}")
        print(f"  Max subgroup accuracy: {max_acc:.4f}")
        print(f"  Min subgroup accuracy: {min_acc:.4f}")
        print(f"  Accuracy disparity:    {disparity:.4f}")

        if disparity > 0.15:
            print("  ⚠️  WARNING: Significant performance disparity detected (>15%)")
        elif disparity > 0.05:
            print("  ⚡ NOTICE: Moderate performance disparity detected (>5%)")
        else:
            print("  ✓  Subgroup performance appears reasonably balanced")

    # Save results
    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    audit_report = {
        "split": split,
        "subgroup_results": subgroup_results,
        "disparity": {
            "max_accuracy": max_acc if accuracies else None,
            "min_accuracy": min_acc if accuracies else None,
            "accuracy_gap": disparity if accuracies else None,
        },
        "known_biases": [
            "No demographic/patient-level data available — bias audit limited to disease category subgroups",
            "Dataset is perfectly balanced (120 rows/disease) — class imbalance bias is minimal",
            "Symptom vocabulary may underrepresent rare conditions",
            "All data sourced from a single clinical symptom benchmark — no geographic diversity"
        ],
        "mitigations": [
            "Class-weighted loss used during training",
            "Stratified splitting ensures proportional representation",
            "Per-subgroup metrics reported transparently"
        ],
        "remaining_limitations": [
            "Cannot audit for age, sex, or ethnic bias — data does not contain these attributes",
            "Small sample size per disease limits subgroup reliability",
            "Knowledge-base data, not real patient encounters"
        ]
    }
    with open(report_dir / "bias_audit.json", "w") as f:
        json.dump(audit_report, f, indent=2)
    print(f"\n  Audit saved: {report_dir / 'bias_audit.json'}")

    return audit_report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default=None)
    parser.add_argument("--split", type=str, default="test")
    args = parser.parse_args()
    run_bias_audit(checkpoint_path=args.checkpoint, split=args.split)
