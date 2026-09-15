"""
CURX Deep-Learning Multi-Seed Stability Benchmark
Evaluates CURXSymptomNet across seeds 42, 123, and 2026.
Reports mean, std, min, and max for Top-1, Top-3, Top-5, Macro F1, AUROC, and ECE.
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


def run_multi_seed_stability(seeds=(42, 123, 2026), model_name="curx_symptom_net"):
    print("=" * 60)
    print(f"CURX MULTI-SEED STABILITY AUDIT ({model_name.upper()})")
    print("=" * 60)

    seed_results = []

    for seed in seeds:
        print(f"\nRunning Seed {seed}...")
        train_res = run_training(model_name=model_name, seed=seed, verbose=False)
        ckpt_path = train_res["best_ckpt_path"]
        metrics = evaluate_checkpoint(ckpt_path, split="val")
        seed_results.append({
            "seed": seed,
            "best_epoch": train_res["best_epoch"],
            "top1": metrics["top1_accuracy"],
            "top3": metrics["top3_accuracy"],
            "top5": metrics["top5_accuracy"],
            "macro_f1": metrics["macro_f1"],
            "auroc": metrics["auroc_macro"],
            "ece": metrics["ece"]
        })
        print(f"  Seed {seed} -> Top-1: {metrics['top1_accuracy']:.4f}, Top-3: {metrics['top3_accuracy']:.4f}, F1: {metrics['macro_f1']:.4f}, AUROC: {metrics['auroc_macro']:.4f}")

    def calc_stats(metric_name):
        vals = [r[metric_name] for r in seed_results]
        return {
            "mean": float(np.mean(vals)),
            "std": float(np.std(vals)),
            "min": float(np.min(vals)),
            "max": float(np.max(vals))
        }

    summary = {
        "model_name": model_name,
        "seeds_evaluated": list(seeds),
        "seed_runs": seed_results,
        "statistics": {
            "top1_accuracy": calc_stats("top1"),
            "top3_accuracy": calc_stats("top3"),
            "top5_accuracy": calc_stats("top5"),
            "macro_f1": calc_stats("macro_f1"),
            "auroc_macro": calc_stats("auroc"),
            "ece": calc_stats("ece")
        }
    }

    report_dir = PROJECT_ROOT / "ml" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / f"multi_seed_stability_{model_name}.json", "w") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print("STABILITY SUMMARY (VAL METRICS):")
    print("=" * 60)
    for m, stat in summary["statistics"].items():
        print(f"  {m:16s}: {stat['mean']:.4f} ± {stat['std']:.4f} (range: {stat['min']:.4f} - {stat['max']:.4f})")

    return summary


if __name__ == "__main__":
    run_multi_seed_stability()
