"""
CURX Data Efficiency Experiment
Evaluates CURXSymptomNet performance with 25%, 50%, 75%, and 100% of training data
to determine sample efficiency and verify scaling characteristics.
NEVER touches the sealed test set. Evaluated strictly on the validation partition.
"""
import os
import sys
import json
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import yaml
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import torch
from torch.utils.data import DataLoader

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import (
    set_seed, SymptomDataset, build_model,
    train_epoch, evaluate_epoch
)
from ml.losses.metric_loss import HybridLoss
from ml.evaluation.evaluate_dl import compute_topk_accuracy


def run_data_efficiency_experiments(fractions=(0.25, 0.50, 0.75, 1.0), seed=42):
    print("=" * 60)
    print("CURX DATA EFFICIENCY EXPERIMENT (TRAIN DATA FRACTIONS)")
    print("=" * 60)

    with open(PROJECT_ROOT / "ml" / "config" / "dl_config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    X_train_full = np.load(data_dir / "X_train.npy")
    y_train_full = np.load(data_dir / "y_train.npy")
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")

    val_ds = SymptomDataset(X_val, y_val, augment=False)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

    results = []
    n_features = X_train_full.shape[1]
    n_classes = len(np.unique(np.concatenate([y_train_full, y_val])))

    for frac in fractions:
        set_seed(seed)
        n_samples = max(int(len(X_train_full) * frac), 20)
        indices = np.random.RandomState(seed).permutation(len(X_train_full))[:n_samples]

        X_subset = X_train_full[indices]
        y_subset = y_train_full[indices]

        print(f"\nTraining on {frac*100:.0f}% data ({n_samples} training samples)...")

        train_ds = SymptomDataset(X_subset, y_subset, augment=True, dropout_p=0.15)
        train_loader = DataLoader(train_ds, batch_size=min(32, n_samples), shuffle=True)

        model = build_model("curx_symptom_net", cfg, n_features, n_classes).to(device)
        criterion = HybridLoss(lambda_metric=0.15, label_smoothing=0.05, margin=0.15)
        optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

        best_top1 = 0.0
        best_top3 = 0.0
        best_top5 = 0.0

        for epoch in range(1, 51):
            train_epoch(model, train_loader, optimizer, criterion, device, grad_clip=1.0)
            val_res = evaluate_epoch(model, val_loader, criterion, device)
            if val_res["val_acc"] > best_top1:
                best_top1 = val_res["val_acc"]
                best_top3 = val_res["val_top3"]
                best_top5 = val_res["val_top5"]

        print(f"  -> Best Val Top-1: {best_top1:.4f} | Top-3: {best_top3:.4f} | Top-5: {best_top5:.4f}")
        results.append({
            "fraction": float(frac),
            "n_train_samples": int(n_samples),
            "val_top1": float(best_top1),
            "val_top3": float(best_top3),
            "val_top5": float(best_top5)
        })

    report_dir = PROJECT_ROOT / "ml" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "data_efficiency.json", "w") as f:
        json.dump(results, f, indent=2)

    # Plot data efficiency curve
    plt.figure(figsize=(8, 5))
    fracs = [r["fraction"] * 100 for r in results]
    t1 = [r["val_top1"] for r in results]
    t3 = [r["val_top3"] for r in results]
    t5 = [r["val_top5"] for r in results]

    plt.plot(fracs, t1, marker="o", linewidth=2, label="Top-1 Accuracy", color="#2563eb")
    plt.plot(fracs, t3, marker="s", linewidth=2, label="Top-3 Accuracy", color="#10b981")
    plt.plot(fracs, t5, marker="^", linewidth=2, label="Top-5 Accuracy", color="#f59e0b")

    plt.xlabel("Training Set Fraction (%)", fontsize=11)
    plt.ylabel("Validation Metric", fontsize=11)
    plt.title("CURXSymptomNet Data Efficiency & Sample Scaling", fontsize=12, fontweight="bold")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend()
    plt.tight_layout()
    plt.savefig(report_dir / "data_efficiency.png", dpi=200)
    plt.close()

    print(f"\nData efficiency results saved to {report_dir / 'data_efficiency.json'}")
    return results


if __name__ == "__main__":
    run_data_efficiency_experiments()
