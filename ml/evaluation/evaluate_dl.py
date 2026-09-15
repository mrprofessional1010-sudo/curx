"""
CURX Unified Deep-Learning Evaluation Engine
Computes Top-1, Top-3, Top-5, Macro/Weighted F1, Macro AUROC/AUPRC, Balanced Accuracy,
Sensitivity, Specificity, Brier score, and ECE.
"""
import os
import sys
import json
import argparse
import numpy as np
import yaml
from pathlib import Path

import torch
import torch.nn.functional as F
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, f1_score,
    precision_score, recall_score, roc_auc_score,
    average_precision_score, confusion_matrix
)
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.training.train_dl import build_model, compute_topk_accuracy


def compute_ece(y_true, y_proba, n_bins=10):
    confidences = np.max(y_proba, axis=1)
    predictions = np.argmax(y_proba, axis=1)
    accuracies = (predictions == y_true).astype(float)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        if mask.sum() > 0:
            ece += mask.sum() * abs(accuracies[mask].mean() - confidences[mask].mean())
    return float(ece / len(y_true))


def compute_brier_score(y_true, y_proba, n_classes):
    one_hot = np.zeros_like(y_proba)
    for i, t in enumerate(y_true):
        one_hot[i, t] = 1.0
    return float(np.mean(np.sum((y_proba - one_hot) ** 2, axis=1)))


def compute_sensitivity_specificity(y_true, y_pred, n_classes):
    cm = confusion_matrix(y_true, y_pred, labels=list(range(n_classes)))
    sensitivities = []
    specificities = []
    for c in range(n_classes):
        tp = cm[c, c]
        fn = cm[c, :].sum() - tp
        fp = cm[:, c].sum() - tp
        tn = cm.sum() - (tp + fn + fp)

        sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
        sensitivities.append(sens)
        specificities.append(spec)

    return float(np.mean(sensitivities)), float(np.mean(specificities))


@torch.no_grad()
def evaluate_checkpoint(checkpoint_path, split="test", temperature=1.0, save_plots=False):
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

    model = build_model(model_name, cfg, n_features, n_classes).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")

    out = model(torch.FloatTensor(X).to(device))
    logits = out["logits"] if isinstance(out, dict) else out

    # Apply temperature calibration
    scaled_logits = logits / temperature
    proba = F.softmax(scaled_logits, dim=-1).cpu().numpy()
    preds = np.argmax(proba, axis=1)

    topk = compute_topk_accuracy(logits.cpu(), torch.LongTensor(y), ks=(1, 3, 5))
    acc = accuracy_score(y, preds)
    balanced_acc = balanced_accuracy_score(y, preds)
    macro_f1 = f1_score(y, preds, average="macro", zero_division=0)
    weighted_f1 = f1_score(y, preds, average="weighted", zero_division=0)
    sens, spec = compute_sensitivity_specificity(y, preds, n_classes)
    ece = compute_ece(y, proba)
    brier = compute_brier_score(y, proba, n_classes)

    # AUROC & AUPRC
    try:
        # Binarize targets for multiclass
        y_onehot = np.zeros((len(y), n_classes))
        for i, t in enumerate(y):
            y_onehot[i, t] = 1.0

        # Only evaluate over classes present in this split to avoid ValueError
        present_classes = np.unique(y)
        if len(present_classes) > 1:
            auroc_macro = float(roc_auc_score(y_onehot[:, present_classes], proba[:, present_classes], average="macro"))
            auprc_macro = float(average_precision_score(y_onehot[:, present_classes], proba[:, present_classes], average="macro"))
        else:
            auroc_macro = 1.0
            auprc_macro = 1.0
    except Exception as e:
        auroc_macro = 0.0
        auprc_macro = 0.0

    metrics = {
        "model_name": model_name,
        "split": split,
        "temperature": float(temperature),
        "param_count": sum(p.numel() for p in model.parameters()),
        "top1_accuracy": float(acc),
        "top3_accuracy": float(topk["top_3"]),
        "top5_accuracy": float(topk["top_5"]),
        "balanced_accuracy": float(balanced_acc),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "sensitivity": float(sens),
        "specificity": float(spec),
        "auroc_macro": float(auroc_macro),
        "auprc_macro": float(auprc_macro),
        "ece": float(ece),
        "brier_score": float(brier),
    }

    if save_plots:
        report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
        report_dir.mkdir(parents=True, exist_ok=True)
        # Save confusion matrix plot
        cm = confusion_matrix(y, preds, labels=list(range(n_classes)))
        plt.figure(figsize=(14, 12))
        plt.imshow(cm, interpolation="nearest", cmap="Blues")
        plt.title(f"{model_name.upper()} Confusion Matrix ({split})", fontsize=12, fontweight="bold")
        plt.colorbar()
        plt.tight_layout()
        plt.savefig(report_dir / f"confusion_matrix_{model_name}_{split}.png", dpi=200)
        plt.close()

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--split", type=str, default="val")
    parser.add_argument("--temperature", type=float, default=1.0)
    args = parser.parse_args()
    res = evaluate_checkpoint(args.checkpoint, split=args.split, temperature=args.temperature)
    print(json.dumps(res, indent=2))
