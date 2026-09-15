"""
CURX ML Evaluation Script
Comprehensive metrics on unseen test set: accuracy, precision, recall, F1,
sensitivity, specificity, AUROC, AUPRC, balanced accuracy, Brier score, ECE.
"""
import os
import sys
import json
import argparse
import numpy as np
import torch
import torch.nn.functional as F
import yaml
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    balanced_accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, average_precision_score, brier_score_loss,
    roc_curve, precision_recall_curve
)
from sklearn.preprocessing import label_binarize

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer


def load_config():
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        return yaml.safe_load(f)


def load_model(checkpoint_path, device):
    """Load trained model from checkpoint."""
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    cfg = ckpt["config"]
    model_cfg = cfg["model"]

    with open(PROJECT_ROOT / "ml" / "data" / "processed" / "metadata.json") as f:
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
    return model, metadata, ckpt


def compute_metrics(y_true, y_pred, y_proba, n_classes, class_names):
    """Compute comprehensive evaluation metrics."""
    metrics = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_weighted": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
    }

    # AUROC (one-vs-rest)
    y_bin = label_binarize(y_true, classes=list(range(n_classes)))
    try:
        metrics["auroc_macro"] = float(roc_auc_score(y_bin, y_proba, average="macro", multi_class="ovr"))
        metrics["auroc_weighted"] = float(roc_auc_score(y_bin, y_proba, average="weighted", multi_class="ovr"))
    except Exception:
        metrics["auroc_macro"] = None
        metrics["auroc_weighted"] = None

    # AUPRC
    try:
        metrics["auprc_macro"] = float(average_precision_score(y_bin, y_proba, average="macro"))
    except Exception:
        metrics["auprc_macro"] = None

    # Brier score (multi-class: mean of per-class Brier scores)
    try:
        brier = 0.0
        for c in range(n_classes):
            brier += brier_score_loss(y_bin[:, c], y_proba[:, c])
        metrics["brier_score"] = float(brier / n_classes)
    except Exception:
        metrics["brier_score"] = None

    # Expected Calibration Error
    try:
        metrics["ece"] = float(expected_calibration_error(y_true, y_proba))
    except Exception:
        metrics["ece"] = None

    # Per-class metrics
    per_class = {}
    report = classification_report(y_true, y_pred, target_names=class_names,
                                    output_dict=True, zero_division=0)
    for cls_name in class_names:
        if cls_name in report:
            per_class[cls_name] = report[cls_name]
    metrics["per_class"] = per_class

    return metrics


def expected_calibration_error(y_true, y_proba, n_bins=10):
    """Compute Expected Calibration Error."""
    confidences = np.max(y_proba, axis=1)
    predictions = np.argmax(y_proba, axis=1)
    accuracies = (predictions == y_true).astype(float)

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        if mask.sum() > 0:
            bin_acc = accuracies[mask].mean()
            bin_conf = confidences[mask].mean()
            ece += mask.sum() * abs(bin_acc - bin_conf)
    return ece / len(y_true)


def plot_confusion_matrix(y_true, y_pred, class_names, save_path):
    """Plot and save confusion matrix."""
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(16, 14))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names, ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("Confusion Matrix")
    plt.xticks(rotation=45, ha="right", fontsize=7)
    plt.yticks(fontsize=7)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Saved: {save_path}")


def plot_roc_curves(y_true, y_proba, n_classes, class_names, save_path):
    """Plot macro-averaged ROC curve."""
    y_bin = label_binarize(y_true, classes=list(range(n_classes)))
    fig, ax = plt.subplots(figsize=(10, 8))

    # Plot per-class with reduced alpha
    for i in range(min(n_classes, 10)):  # Plot first 10 for readability
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_proba[:, i])
        ax.plot(fpr, tpr, alpha=0.3, linewidth=1)

    # Macro average
    all_fpr = np.linspace(0, 1, 100)
    mean_tpr = np.zeros_like(all_fpr)
    for i in range(n_classes):
        fpr, tpr, _ = roc_curve(y_bin[:, i], y_proba[:, i])
        mean_tpr += np.interp(all_fpr, fpr, tpr)
    mean_tpr /= n_classes
    macro_auc = roc_auc_score(y_bin, y_proba, average="macro", multi_class="ovr")
    ax.plot(all_fpr, mean_tpr, "b-", linewidth=2, label=f"Macro ROC (AUC={macro_auc:.3f})")

    ax.plot([0, 1], [0, 1], "k--", alpha=0.5)
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC Curve (Macro-Averaged)")
    ax.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Saved: {save_path}")


def plot_calibration_curve(y_true, y_proba, save_path, n_bins=10):
    """Plot reliability diagram."""
    confidences = np.max(y_proba, axis=1)
    predictions = np.argmax(y_proba, axis=1)
    accuracies = (predictions == y_true).astype(float)

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_accs = []
    bin_confs = []
    bin_counts = []

    for i in range(n_bins):
        mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        if mask.sum() > 0:
            bin_accs.append(accuracies[mask].mean())
            bin_confs.append(confidences[mask].mean())
            bin_counts.append(mask.sum())

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.bar(bin_confs, bin_accs, width=0.08, alpha=0.6, color="steelblue", edgecolor="navy")
    ax.plot([0, 1], [0, 1], "k--", alpha=0.5, label="Perfect calibration")
    ax.set_xlabel("Mean Predicted Confidence")
    ax.set_ylabel("Fraction of Positives (Accuracy)")
    ax.set_title("Calibration (Reliability Diagram)")
    ax.legend()
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    print(f"  Saved: {save_path}")


def evaluate(checkpoint_path=None, split="test"):
    """Run full evaluation on the specified split."""
    cfg = load_config()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    if checkpoint_path is None:
        checkpoint_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"

    print("=" * 60)
    print(f"CURX MODEL EVALUATION ({split} set)")
    print("=" * 60)

    # Load model
    model, metadata, ckpt = load_model(checkpoint_path, device)
    n_classes = metadata["n_classes"]
    class_names = metadata["class_names"]
    print(f"  Checkpoint: {checkpoint_path}")
    print(f"  Epoch: {ckpt['epoch']} | Val Acc: {ckpt['val_acc']:.4f}")

    # Load data
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")
    print(f"  {split.upper()} set: {len(X)} samples")

    # Inference
    X_tensor = torch.FloatTensor(X).to(device)
    with torch.no_grad():
        logits = model(X_tensor)
        y_proba = F.softmax(logits, dim=-1).cpu().numpy()
        y_pred = np.argmax(y_proba, axis=1)

    # Compute metrics
    metrics = compute_metrics(y, y_pred, y_proba, n_classes, class_names)
    metrics["split"] = split
    metrics["checkpoint"] = str(checkpoint_path)
    metrics["seed"] = ckpt.get("seed", "unknown")

    # Print summary
    print(f"\n{'Metric':<30} {'Value':>10}")
    print("-" * 42)
    for key in ["accuracy", "balanced_accuracy", "f1_macro", "f1_weighted",
                 "precision_macro", "recall_macro", "auroc_macro", "auprc_macro",
                 "brier_score", "ece"]:
        val = metrics.get(key)
        if val is not None:
            print(f"  {key:<28} {val:>10.4f}")

    # Save plots
    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)

    plot_confusion_matrix(y, y_pred, class_names, report_dir / f"confusion_matrix_{split}.png")
    plot_roc_curves(y, y_proba, n_classes, class_names, report_dir / f"roc_curve_{split}.png")
    plot_calibration_curve(y, y_proba, report_dir / f"calibration_curve_{split}.png")

    # Save metrics JSON
    # Remove non-serializable items
    metrics_save = {k: v for k, v in metrics.items() if k != "per_class"}
    metrics_save["per_class"] = metrics["per_class"]
    with open(report_dir / f"metrics_{split}.json", "w") as f:
        json.dump(metrics_save, f, indent=2)

    print(f"\n  Metrics saved: {report_dir / f'metrics_{split}.json'}")
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default=None)
    parser.add_argument("--split", type=str, default="test", choices=["val", "test"])
    args = parser.parse_args()
    evaluate(checkpoint_path=args.checkpoint, split=args.split)
