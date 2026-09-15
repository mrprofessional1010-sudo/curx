"""
CURX ML Master Pipeline Runner
Runs the full pipeline: data prep -> baselines -> DL training -> fine-tuning
-> calibration -> evaluation -> bias audit -> error analysis -> model export.
"""
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import json
import time
import traceback
import numpy as np
import yaml
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))


def run_full_pipeline():
    """Execute the complete CURX ML pipeline."""
    start = time.time()
    results = {}
    cfg_path = PROJECT_ROOT / "ml" / "config" / "config.yaml"
    with open(cfg_path) as f:
        cfg = yaml.safe_load(f)

    print("=" * 60)
    print("  CURX DEEP LEARNING PIPELINE -- FULL EXECUTION")
    print("=" * 60)
    print(f"  Started: {datetime.now().isoformat()}")
    print()

    # ─── Step 1: Data Pipeline ───
    print("-" * 60)
    print("STEP 1: DATA PIPELINE")
    print("-" * 60)
    try:
        from ml.data.prepare_data import run_pipeline as prepare_data
        splits, symptom_list, severity = prepare_data(seed=cfg["seed"])
        results["data_pipeline"] = "SUCCESS"
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["data_pipeline"] = f"FAILED: {e}"
        return results

    # ─── Step 2: Baseline Models ───
    print("\n" + "-" * 60)
    print("STEP 2: BASELINE MODELS")
    print("-" * 60)
    try:
        from ml.training.train_baselines import train_baselines
        baseline_results = train_baselines()
        results["baselines"] = baseline_results
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["baselines"] = f"FAILED: {e}"

    # ─── Step 3: Deep Learning Training ───
    print("\n" + "-" * 60)
    print("STEP 3: DEEP LEARNING TRAINING")
    print("-" * 60)
    try:
        from ml.training.train import train
        history = train(seed=cfg["seed"], model_type="transformer")
        results["dl_training"] = {
            "best_epoch": history["best_epoch"],
            "best_val_acc": history["best_val_acc"],
            "total_epochs": history["total_epochs"],
        }
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["dl_training"] = f"FAILED: {e}"

    # ─── Step 4: Fine-Tuning ───
    print("\n" + "-" * 60)
    print("STEP 4: FINE-TUNING")
    print("-" * 60)
    try:
        from ml.training.fine_tune import fine_tune
        fine_tune()
        results["fine_tuning"] = "SUCCESS"
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["fine_tuning"] = f"FAILED: {e}"

    # ─── Step 5: Calibration ───
    print("\n" + "-" * 60)
    print("STEP 5: CALIBRATION")
    print("-" * 60)
    try:
        from ml.evaluation.calibration import calibrate
        cal_report = calibrate()
        results["calibration"] = cal_report
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["calibration"] = f"FAILED: {e}"

    # ─── Step 6: Evaluation (Val) ───
    print("\n" + "-" * 60)
    print("STEP 6: EVALUATION (VALIDATION SET)")
    print("-" * 60)
    try:
        from ml.evaluation.evaluate import evaluate
        val_metrics = evaluate(split="val")
        results["val_metrics"] = {k: v for k, v in val_metrics.items() if k != "per_class"}
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["val_metrics"] = f"FAILED: {e}"

    # ─── Step 7: Final Test Evaluation ───
    print("\n" + "-" * 60)
    print("STEP 7: FINAL TEST SET EVALUATION (UNSEEN)")
    print("-" * 60)
    try:
        test_metrics = evaluate(split="test")
        results["test_metrics"] = {k: v for k, v in test_metrics.items() if k != "per_class"}
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["test_metrics"] = f"FAILED: {e}"

    # ─── Step 8: Bias Audit ───
    print("\n" + "-" * 60)
    print("STEP 8: BIAS / FAIRNESS AUDIT")
    print("-" * 60)
    try:
        from ml.evaluation.bias_audit import run_bias_audit
        bias_report = run_bias_audit(split="test")
        results["bias_audit"] = "COMPLETE"
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["bias_audit"] = f"FAILED: {e}"

    # ─── Step 9: Error Analysis ───
    print("\n" + "-" * 60)
    print("STEP 9: ERROR ANALYSIS")
    print("-" * 60)
    try:
        from ml.evaluation.error_analysis import run_error_analysis
        error_report = run_error_analysis(split="test")
        results["error_analysis"] = "COMPLETE"
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["error_analysis"] = f"FAILED: {e}"

    # ─── Step 10: Multi-Seed Robustness ───
    print("\n" + "-" * 60)
    print("STEP 10: MULTI-SEED ROBUSTNESS TEST")
    print("-" * 60)
    try:
        from ml.training.train import train as dl_train
        from ml.evaluation.evaluate import evaluate as dl_evaluate
        seed_results = []
        for seed in cfg["seeds_for_robustness"]:
            print(f"\n  --- Seed {seed} ---")
            # Re-prepare data with this seed
            from ml.data.prepare_data import run_pipeline as prep
            prep(seed=seed)
            h = dl_train(seed=seed, model_type="transformer")
            m = dl_evaluate(split="val")
            seed_results.append({
                "seed": seed,
                "best_val_acc": h["best_val_acc"],
                "val_f1_macro": m.get("f1_macro", 0),
            })
            print(f"  Seed {seed}: val_acc={h['best_val_acc']:.4f}")

        accs = [s["best_val_acc"] for s in seed_results]
        results["robustness"] = {
            "seeds": seed_results,
            "mean_acc": float(np.mean(accs)),
            "std_acc": float(np.std(accs)),
            "min_acc": float(np.min(accs)),
            "max_acc": float(np.max(accs)),
        }
        print(f"\n  Robustness: {np.mean(accs):.4f} ± {np.std(accs):.4f}")
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["robustness"] = f"FAILED: {e}"

    # ─── Step 11: Model Export ───
    print("\n" + "-" * 60)
    print("STEP 11: MODEL EXPORT")
    print("-" * 60)
    try:
        export_model(cfg, results)
        results["model_export"] = "SUCCESS"
    except Exception as e:
        print(f"  ERROR: {e}")
        traceback.print_exc()
        results["model_export"] = f"FAILED: {e}"

    # ─── Final Summary ───
    elapsed = time.time() - start
    print("\n" + "=" * 60)
    print("  PIPELINE COMPLETE -- FINAL SUMMARY")
    print("=" * 60)

    # Determine 99% target status
    test_acc = None
    if isinstance(results.get("test_metrics"), dict):
        test_acc = results["test_metrics"].get("accuracy")

    target_status = "NOT EVALUATED"
    if test_acc is not None:
        if test_acc >= 0.99:
            target_status = "ACHIEVED"
        else:
            target_status = "NOT ACHIEVED"

    summary = {
        "model_task": "Multiclass Disease Classification (41 classes)",
        "model_architecture": "SymptomTransformer (Tabular Transformer)",
        "dataset_size": "304 unique samples (after dedup from 4920)",
        "features": "133 symptom features (severity-weighted)",
        "pipeline_status": {step: ("SUCCESS" if v == "SUCCESS" or v == "COMPLETE" or isinstance(v, dict) else str(v)) for step, v in results.items()},
        "test_accuracy": test_acc,
        "99_percent_target": target_status,
        "elapsed_seconds": elapsed,
        "timestamp": datetime.now().isoformat(),
    }

    if target_status == "NOT ACHIEVED" and test_acc is not None:
        summary["99_percent_note"] = (
            f"99% target not achieved without compromising validation integrity. "
            f"Best defensible test accuracy: {test_acc*100:.2f}%. "
            f"Limiting factor: only 304 unique samples across 41 classes (~7.4 per class)."
        )

    print(json.dumps(summary, indent=2))

    # Save final summary
    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    with open(report_dir / "pipeline_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    return summary


def export_model(cfg, results):
    """Export final model with all artifacts to versioned directory."""
    import shutil

    model_dir = PROJECT_ROOT / cfg["paths"]["models"] / "model_v001"
    model_dir.mkdir(parents=True, exist_ok=True)

    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"

    # Copy model checkpoint
    for fname in ["best_model.pt", "best_model_finetuned.pt", "calibration.pt"]:
        src = ckpt_dir / fname
        if src.exists():
            shutil.copy2(src, model_dir / fname)

    # Copy metadata and label encoder
    for fname in ["metadata.json", "label_encoder.json"]:
        src = data_dir / fname
        if src.exists():
            shutil.copy2(src, model_dir / fname)

    # Copy config
    shutil.copy2(PROJECT_ROOT / "ml" / "config" / "config.yaml", model_dir / "config.yaml")

    # Write model info
    info = {
        "version": "v001",
        "architecture": "SymptomTransformer",
        "created": datetime.now().isoformat(),
        "status": "research_only",
        "pipeline_results": {k: str(v)[:200] for k, v in results.items()},
    }
    with open(model_dir / "model_info.json", "w") as f:
        json.dump(info, f, indent=2)

    print(f"  Model exported to: {model_dir}")


if __name__ == "__main__":
    run_full_pipeline()
