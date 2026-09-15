"""
CURX ML Baseline Models
Train and evaluate Logistic Regression, Random Forest, XGBoost, and LightGBM
as strong baselines before the deep-learning model.
"""
import os
import sys
import json
import time
import numpy as np
import yaml
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    balanced_accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, log_loss
)
from sklearn.model_selection import StratifiedKFold, cross_val_score

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))


def load_config():
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        return yaml.safe_load(f)


def load_data():
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    X_train = np.load(data_dir / "X_train.npy")
    y_train = np.load(data_dir / "y_train.npy")
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")
    X_test = np.load(data_dir / "X_test.npy")
    y_test = np.load(data_dir / "y_test.npy")
    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)
    return X_train, y_train, X_val, y_val, X_test, y_test, metadata


def evaluate_model(model, X, y, n_classes, class_names, split_name="val"):
    """Compute comprehensive metrics."""
    y_pred = model.predict(X)

    metrics = {
        "split": split_name,
        "accuracy": float(accuracy_score(y, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y, y_pred)),
        "precision_macro": float(precision_score(y, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y, y_pred, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y, y_pred, average="weighted", zero_division=0)),
    }

    # AUROC if model supports predict_proba
    if hasattr(model, "predict_proba"):
        try:
            y_proba = model.predict_proba(X)
            metrics["auroc_ovr"] = float(roc_auc_score(
                y, y_proba, multi_class="ovr", average="macro"
            ))
            metrics["log_loss"] = float(log_loss(y, y_proba))
        except Exception:
            pass

    return metrics, y_pred


def train_baselines():
    """Train all baseline models and report results."""
    cfg = load_config()
    X_train, y_train, X_val, y_val, X_test, y_test, metadata = load_data()
    n_classes = metadata["n_classes"]
    class_names = metadata["class_names"]

    print("=" * 60)
    print("CURX ML BASELINE TRAINING")
    print("=" * 60)
    print(f"Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")
    print(f"Features: {X_train.shape[1]} | Classes: {n_classes}")
    print()

    results = {}

    # 1. Logistic Regression
    print("[1/5] Training Logistic Regression...")
    t0 = time.time()
    lr_cfg = cfg["baselines"]["logistic_regression"]
    lr = LogisticRegression(
        max_iter=lr_cfg["max_iter"], C=lr_cfg["C"],
        solver=lr_cfg["solver"], multi_class=lr_cfg["multi_class"],
        random_state=cfg["seed"]
    )
    lr.fit(X_train, y_train)
    lr_time = time.time() - t0
    lr_metrics, _ = evaluate_model(lr, X_val, y_val, n_classes, class_names, "val")
    lr_metrics["training_time_s"] = lr_time
    results["logistic_regression"] = lr_metrics
    print(f"  Val Accuracy: {lr_metrics['accuracy']:.4f} | F1: {lr_metrics['f1_macro']:.4f} | Time: {lr_time:.1f}s")

    # 2. Random Forest
    print("[2/5] Training Random Forest...")
    t0 = time.time()
    rf_cfg = cfg["baselines"]["random_forest"]
    rf = RandomForestClassifier(
        n_estimators=rf_cfg["n_estimators"],
        max_depth=rf_cfg["max_depth"],
        min_samples_split=rf_cfg["min_samples_split"],
        min_samples_leaf=rf_cfg["min_samples_leaf"],
        random_state=cfg["seed"], n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_time = time.time() - t0
    rf_metrics, _ = evaluate_model(rf, X_val, y_val, n_classes, class_names, "val")
    rf_metrics["training_time_s"] = rf_time
    results["random_forest"] = rf_metrics
    print(f"  Val Accuracy: {rf_metrics['accuracy']:.4f} | F1: {rf_metrics['f1_macro']:.4f} | Time: {rf_time:.1f}s")

    # 3. Gradient Boosting (sklearn)
    print("[3/5] Training Gradient Boosting...")
    t0 = time.time()
    gb_cfg = cfg["baselines"]["gradient_boosting"]
    gb = GradientBoostingClassifier(
        n_estimators=gb_cfg["n_estimators"],
        learning_rate=gb_cfg["learning_rate"],
        max_depth=gb_cfg["max_depth"],
        subsample=gb_cfg["subsample"],
        random_state=cfg["seed"]
    )
    gb.fit(X_train, y_train)
    gb_time = time.time() - t0
    gb_metrics, _ = evaluate_model(gb, X_val, y_val, n_classes, class_names, "val")
    gb_metrics["training_time_s"] = gb_time
    results["gradient_boosting"] = gb_metrics
    print(f"  Val Accuracy: {gb_metrics['accuracy']:.4f} | F1: {gb_metrics['f1_macro']:.4f} | Time: {gb_time:.1f}s")

    # 4. XGBoost
    print("[4/5] Training XGBoost...")
    try:
        import xgboost as xgb
        t0 = time.time()
        xgb_model = xgb.XGBClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=5,
            subsample=0.8, colsample_bytree=0.8,
            random_state=cfg["seed"], use_label_encoder=False,
            eval_metric="mlogloss", verbosity=0
        )
        xgb_model.fit(X_train, y_train)
        xgb_time = time.time() - t0
        xgb_metrics, _ = evaluate_model(xgb_model, X_val, y_val, n_classes, class_names, "val")
        xgb_metrics["training_time_s"] = xgb_time
        results["xgboost"] = xgb_metrics
        print(f"  Val Accuracy: {xgb_metrics['accuracy']:.4f} | F1: {xgb_metrics['f1_macro']:.4f} | Time: {xgb_time:.1f}s")
    except ImportError:
        print("  [SKIPPED] XGBoost not installed")

    # 5. LightGBM
    print("[5/5] Training LightGBM...")
    try:
        import lightgbm as lgb
        t0 = time.time()
        lgb_model = lgb.LGBMClassifier(
            n_estimators=200, learning_rate=0.1, max_depth=5,
            subsample=0.8, colsample_bytree=0.8,
            random_state=cfg["seed"], verbose=-1
        )
        lgb_model.fit(X_train, y_train)
        lgb_time = time.time() - t0
        lgb_metrics, _ = evaluate_model(lgb_model, X_val, y_val, n_classes, class_names, "val")
        lgb_metrics["training_time_s"] = lgb_time
        results["lightgbm"] = lgb_metrics
        print(f"  Val Accuracy: {lgb_metrics['accuracy']:.4f} | F1: {lgb_metrics['f1_macro']:.4f} | Time: {lgb_time:.1f}s")
    except ImportError:
        print("  [SKIPPED] LightGBM not installed")

    # Cross-validation on best baseline
    print("\n[CV] Running 5-fold stratified cross-validation on all baselines...")
    X_all = np.concatenate([X_train, X_val])
    y_all = np.concatenate([y_train, y_val])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=cfg["seed"])

    for name, model_cls, params in [
        ("logistic_regression", LogisticRegression, {"max_iter": 1000, "solver": "lbfgs", "multi_class": "multinomial"}),
        ("random_forest", RandomForestClassifier, {"n_estimators": 200, "n_jobs": -1}),
    ]:
        scores = cross_val_score(model_cls(**params, random_state=cfg["seed"]), X_all, y_all, cv=cv, scoring="accuracy")
        results[name]["cv_mean"] = float(scores.mean())
        results[name]["cv_std"] = float(scores.std())
        results[name]["cv_min"] = float(scores.min())
        results[name]["cv_max"] = float(scores.max())
        print(f"  {name}: CV Accuracy = {scores.mean():.4f} ± {scores.std():.4f}")

    # Save results
    report_dir = PROJECT_ROOT / "ml" / "reports"
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "baseline_results.json", "w") as f:
        json.dump(results, f, indent=2)

    # Summary table
    print("\n" + "=" * 60)
    print("BASELINE RESULTS SUMMARY")
    print("=" * 60)
    print(f"{'Model':<25} {'Accuracy':>10} {'F1-Macro':>10} {'Balanced':>10} {'AUROC':>10}")
    print("-" * 65)
    for name, m in results.items():
        auroc = f"{m.get('auroc_ovr', 0):.4f}" if 'auroc_ovr' in m else "N/A"
        print(f"{name:<25} {m['accuracy']:>10.4f} {m['f1_macro']:>10.4f} {m['balanced_accuracy']:>10.4f} {auroc:>10}")

    return results


if __name__ == "__main__":
    train_baselines()
