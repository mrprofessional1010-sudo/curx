"""
CURX Systematic Deep-Learning Ablation Study Engine
Compares all 4 new architectures against baseline SymptomTransformer,
plus targeted component ablations on CURXSymptomNet.
"""
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

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import run_training
from ml.evaluation.evaluate_dl import evaluate_checkpoint


def run_ablation_suite(seed=42):
    print("=" * 70)
    print("CURX DEEP-LEARNING ABLATION SUITE (SEED 42)")
    print("=" * 70)

    ablation_configs = [
        {
            "name": "1. Baseline SymptomTransformer",
            "model_name": "symptom_transformer",
            "overrides": {}
        },
        {
            "name": "2. Compact Residual MLP",
            "model_name": "residual_mlp",
            "overrides": {}
        },
        {
            "name": "3. Deep Sets Encoder",
            "model_name": "deep_sets",
            "overrides": {}
        },
        {
            "name": "4. Prototype Network",
            "model_name": "prototype_network",
            "overrides": {}
        },
        {
            "name": "5. CURXSymptomNet (Full Primary)",
            "model_name": "curx_symptom_net",
            "overrides": {}
        },
        {
            "name": "6. CURXSymptomNet (No Attention)",
            "model_name": "curx_symptom_net",
            "overrides": {
                "models": {"curx_symptom_net": {"use_attention": False}}
            }
        },
        {
            "name": "7. CURXSymptomNet (No Prototypes / Metric Loss)",
            "model_name": "curx_symptom_net",
            "overrides": {
                "loss": {"lambda_metric": 0.0},
                "models": {"curx_symptom_net": {"use_prototypes": False}}
            }
        },
        {
            "name": "8. CURXSymptomNet (No Feature Gating)",
            "model_name": "curx_symptom_net",
            "overrides": {
                "models": {"curx_symptom_net": {"use_gating": False}}
            }
        },
        {
            "name": "9. CURXSymptomNet (No Augmentation)",
            "model_name": "curx_symptom_net",
            "overrides": {
                "augmentation": {"enabled": False}
            }
        }
    ]

    results = []

    for item in ablation_configs:
        name = item["name"]
        m_name = item["model_name"]
        overrides = item["overrides"]
        print(f"\nExecuting: {name}...")

        # Train model
        train_res = run_training(
            model_name=m_name,
            seed=seed,
            override_cfg=overrides,
            verbose=False
        )

        ckpt_path = train_res["best_ckpt_path"]
        # Evaluate on validation split
        val_metrics = evaluate_checkpoint(ckpt_path, split="val")

        summary_entry = {
            "experiment": name,
            "model_name": m_name,
            "param_count": train_res["param_count"],
            "best_epoch": train_res["best_epoch"],
            "val_top1": val_metrics["top1_accuracy"],
            "val_top3": val_metrics["top3_accuracy"],
            "val_top5": val_metrics["top5_accuracy"],
            "val_macro_f1": val_metrics["macro_f1"],
            "val_auroc": val_metrics["auroc_macro"],
            "val_ece": val_metrics["ece"],
            "val_brier": val_metrics["brier_score"]
        }
        results.append(summary_entry)
        print(f"  Result -> Top-1: {val_metrics['top1_accuracy']:.4f} | "
              f"Top-3: {val_metrics['top3_accuracy']:.4f} | "
              f"Top-5: {val_metrics['top5_accuracy']:.4f} | "
              f"F1: {val_metrics['macro_f1']:.4f} | "
              f"AUROC: {val_metrics['auroc_macro']:.4f}")

    # Save results
    report_dir = PROJECT_ROOT / "ml" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "ablation_results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Plot comparison bar chart
    labels = [r["experiment"].split(". ")[1] for r in results]
    top1s = [r["val_top1"] for r in results]
    top3s = [r["val_top3"] for r in results]
    f1s = [r["val_macro_f1"] for r in results]

    x = np.arange(len(labels))
    width = 0.25

    plt.figure(figsize=(14, 7))
    plt.bar(x - width, top1s, width, label="Val Top-1 Acc", color="#2563eb")
    plt.bar(x, top3s, width, label="Val Top-3 Acc", color="#10b981")
    plt.bar(x + width, f1s, width, label="Val Macro F1", color="#f59e0b")

    plt.ylabel("Validation Score", fontsize=11)
    plt.title("CURX Deep-Learning Architecture & Component Ablation Benchmark", fontsize=13, fontweight="bold")
    plt.xticks(x, labels, rotation=25, ha="right", fontsize=9)
    plt.ylim(0, 1.05)
    plt.grid(axis="y", linestyle="--", alpha=0.5)
    plt.legend(loc="upper left")
    plt.tight_layout()
    plt.savefig(report_dir / "ablation_comparison.png", dpi=200)
    plt.close()

    print(f"\nAblation suite complete. Results saved to {report_dir / 'ablation_results.json'}")
    return results


if __name__ == "__main__":
    run_ablation_suite()
