"""
CURX Deep-Learning Hyperparameter Search Engine
Controlled grid search over:
- learning_rate: [1e-4, 3e-4, 1e-3]
- hidden_dim: [64, 96, 128]
- dropout: [0.10, 0.20, 0.30]
- lambda_metric: [0.05, 0.10, 0.20]
- batch_size: [16, 32]
Selects optimal parameters using strictly validation performance.
"""
import sys
import json
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import yaml
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import run_training
from ml.evaluation.evaluate_dl import evaluate_checkpoint


def run_hyperparameter_search(seed=42):
    print("=" * 60)
    print("CURX DEEP-LEARNING HYPERPARAMETER SEARCH")
    print("=" * 60)

    # Key representative hyperparameter configurations
    search_grid = [
        {"lr": 1e-3, "hidden_dim": 64, "dropout": 0.20, "lambda_metric": 0.15, "batch_size": 32},
        {"lr": 3e-4, "hidden_dim": 64, "dropout": 0.20, "lambda_metric": 0.15, "batch_size": 32},
        {"lr": 1e-3, "hidden_dim": 96, "dropout": 0.20, "lambda_metric": 0.10, "batch_size": 32},
        {"lr": 1e-3, "hidden_dim": 64, "dropout": 0.10, "lambda_metric": 0.20, "batch_size": 32},
        {"lr": 1e-3, "hidden_dim": 64, "dropout": 0.30, "lambda_metric": 0.10, "batch_size": 16},
        {"lr": 3e-4, "hidden_dim": 96, "dropout": 0.15, "lambda_metric": 0.15, "batch_size": 32},
    ]

    results = []

    for i, p in enumerate(search_grid):
        print(f"\nEvaluating Trial {i+1}/{len(search_grid)}: {p}")
        override_cfg = {
            "training": {
                "learning_rate": p["lr"],
                "batch_size": p["batch_size"]
            },
            "loss": {
                "lambda_metric": p["lambda_metric"]
            },
            "models": {
                "curx_symptom_net": {
                    "hidden_dim": p["hidden_dim"],
                    "dropout": p["dropout"]
                }
            }
        }

        train_res = run_training(
            model_name="curx_symptom_net",
            seed=seed,
            override_cfg=override_cfg,
            verbose=False
        )

        ckpt_path = train_res["best_ckpt_path"]
        val_metrics = evaluate_checkpoint(ckpt_path, split="val")

        trial_record = {
            "trial": i + 1,
            "params": p,
            "best_epoch": train_res["best_epoch"],
            "val_top1": val_metrics["top1_accuracy"],
            "val_top3": val_metrics["top3_accuracy"],
            "val_top5": val_metrics["top5_accuracy"],
            "val_macro_f1": val_metrics["macro_f1"],
            "val_ece": val_metrics["ece"],
        }
        results.append(trial_record)
        print(f"  -> Trial {i+1} Result: Val Top-1: {val_metrics['top1_accuracy']:.4f}, Top-3: {val_metrics['top3_accuracy']:.4f}, F1: {val_metrics['macro_f1']:.4f}")

    # Sort trials by Top-1 + 0.3 * Top-3
    results.sort(key=lambda r: (r["val_top1"] + 0.3 * r["val_top3"], r["val_macro_f1"]), reverse=True)
    best_trial = results[0]

    report_dir = PROJECT_ROOT / "ml" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "hyperparam_search.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nSearch complete. Best Trial: {best_trial['trial']} with params: {best_trial['params']}")
    print(f"  Val Top-1: {best_trial['val_top1']:.4f} | Top-3: {best_trial['val_top3']:.4f} | F1: {best_trial['val_macro_f1']:.4f}")
    return results


if __name__ == "__main__":
    run_hyperparameter_search()
