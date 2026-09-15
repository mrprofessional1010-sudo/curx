"""
CURX ML Error Analysis
Analyzes false positives, false negatives, confusion patterns, low-confidence cases.
"""
import sys
import json
import numpy as np
import torch
import torch.nn.functional as F
import yaml
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from pathlib import Path
from collections import Counter
from sklearn.metrics import confusion_matrix

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer


def run_error_analysis(checkpoint_path=None, split="test"):
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    if checkpoint_path is None:
        checkpoint_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"

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

    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")
    class_names = metadata["class_names"]
    symptom_list = metadata["symptom_list"]

    with torch.no_grad():
        logits = model(torch.FloatTensor(X).to(device))
        y_proba = F.softmax(logits, dim=-1).cpu().numpy()
        y_pred = np.argmax(y_proba, axis=1)
        confidences = np.max(y_proba, axis=1)

    print("=" * 60)
    print("CURX ERROR ANALYSIS")
    print("=" * 60)

    # Misclassified samples
    errors = np.where(y != y_pred)[0]
    correct = np.where(y == y_pred)[0]

    print(f"\n  Total samples: {len(y)}")
    print(f"  Correct: {len(correct)} ({100*len(correct)/len(y):.1f}%)")
    print(f"  Errors: {len(errors)} ({100*len(errors)/len(y):.1f}%)")

    # Confusion pairs
    confusion_pairs = Counter()
    for idx in errors:
        true_name = class_names[y[idx]]
        pred_name = class_names[y_pred[idx]]
        confusion_pairs[(true_name, pred_name)] += 1

    print(f"\n  Most confused pairs:")
    for (true, pred), count in confusion_pairs.most_common(10):
        print(f"    {true} → {pred}: {count}")

    # Low-confidence predictions
    low_conf_threshold = 0.5
    low_conf_mask = confidences < low_conf_threshold
    print(f"\n  Low-confidence predictions (<{low_conf_threshold}): {low_conf_mask.sum()}")
    print(f"    Of which incorrect: {((y != y_pred) & low_conf_mask).sum()}")

    # Per-class error rates
    print(f"\n  Per-class error rates:")
    class_errors = {}
    for c in range(len(class_names)):
        mask = y == c
        if mask.sum() == 0:
            continue
        err_rate = float((y[mask] != y_pred[mask]).sum() / mask.sum())
        class_errors[class_names[c]] = {
            "n_samples": int(mask.sum()),
            "n_errors": int((y[mask] != y_pred[mask]).sum()),
            "error_rate": err_rate,
            "mean_confidence": float(confidences[mask].mean()),
        }

    for name, info in sorted(class_errors.items(), key=lambda x: -x[1]["error_rate"]):
        if info["error_rate"] > 0:
            print(f"    {name}: {info['error_rate']*100:.1f}% error rate ({info['n_errors']}/{info['n_samples']})")

    # Feature analysis of errors: which symptoms are present in misclassified samples
    error_analysis = {
        "total_samples": len(y),
        "total_correct": len(correct),
        "total_errors": len(errors),
        "accuracy": float(len(correct) / len(y)),
        "confusion_pairs": [{"true": t, "predicted": p, "count": c} for (t, p), c in confusion_pairs.most_common(20)],
        "low_confidence_count": int(low_conf_mask.sum()),
        "low_confidence_incorrect": int(((y != y_pred) & low_conf_mask).sum()),
        "per_class_errors": class_errors,
        "confidence_stats": {
            "mean_correct": float(confidences[correct].mean()) if len(correct) > 0 else None,
            "mean_incorrect": float(confidences[errors].mean()) if len(errors) > 0 else None,
            "std_correct": float(confidences[correct].std()) if len(correct) > 0 else None,
            "std_incorrect": float(confidences[errors].std()) if len(errors) > 0 else None,
        },
        "failure_modes": [],
    }

    # Identify failure modes
    if len(errors) > 0:
        # Mode 1: Diseases with overlapping symptom profiles
        for (true, pred), count in confusion_pairs.most_common(5):
            error_analysis["failure_modes"].append(
                f"Confusion between '{true}' and '{pred}' ({count} cases) — likely overlapping symptom profiles"
            )
        # Mode 2: Low-confidence errors
        if low_conf_mask.sum() > 0:
            error_analysis["failure_modes"].append(
                f"{low_conf_mask.sum()} low-confidence predictions — model uncertainty on ambiguous symptom sets"
            )

    # Save
    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "error_analysis.json", "w") as f:
        json.dump(error_analysis, f, indent=2)
    print(f"\n  Error analysis saved: {report_dir / 'error_analysis.json'}")

    # Confidence histogram
    fig, ax = plt.subplots(figsize=(10, 6))
    if len(correct) > 0:
        ax.hist(confidences[correct], bins=20, alpha=0.6, label="Correct", color="green")
    if len(errors) > 0:
        ax.hist(confidences[errors], bins=20, alpha=0.6, label="Incorrect", color="red")
    ax.set_xlabel("Prediction Confidence")
    ax.set_ylabel("Count")
    ax.set_title("Confidence Distribution: Correct vs Incorrect")
    ax.legend()
    plt.tight_layout()
    plt.savefig(report_dir / "confidence_histogram.png", dpi=150)
    plt.close()
    print(f"  Saved: {report_dir / 'confidence_histogram.png'}")

    return error_analysis


if __name__ == "__main__":
    run_error_analysis()
