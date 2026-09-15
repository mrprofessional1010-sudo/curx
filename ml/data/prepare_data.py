"""
CURX ML Data Pipeline
Extracts, cleans, deduplicates, and splits the Disease-Symptom Matrix
into train/val/test sets with strict leakage prevention.
"""
import os
import sys
import zipfile
import csv
import io
import json
import hashlib
import numpy as np
import pandas as pd
import yaml
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

PROJECT_ROOT = Path(__file__).resolve().parents[2]

def load_config():
    cfg_path = PROJECT_ROOT / "ml" / "config" / "config.yaml"
    with open(cfg_path, "r") as f:
        return yaml.safe_load(f)

def extract_symptom_dataset(cfg):
    """Extract and parse all CSV files from the symptom zip."""
    zip_path = PROJECT_ROOT / cfg["data"]["source_zip"]
    if not zip_path.exists():
        raise FileNotFoundError(f"Dataset not found: {zip_path}")

    with zipfile.ZipFile(zip_path, "r") as z:
        # Main dataset
        with z.open(cfg["data"]["dataset_csv"]) as f:
            reader = csv.reader(io.TextIOWrapper(f, "utf-8"))
            rows = list(reader)
            header = rows[0]
            data = rows[1:]

        # Severity weights
        with z.open(cfg["data"]["severity_csv"]) as f:
            reader = csv.reader(io.TextIOWrapper(f, "utf-8"))
            sev_rows = list(reader)
            severity = {}
            for r in sev_rows[1:]:
                if len(r) >= 2:
                    sym = r[0].strip().replace("_", " ").lower()
                    try:
                        severity[sym] = int(r[1].strip())
                    except ValueError:
                        severity[sym] = 1

    return header, data, severity

def build_feature_matrix(header, data, severity, use_weights=True):
    """
    Convert wide-format symptom data to a binary (or weighted) feature matrix.
    Each row becomes a 133-dim vector where each dimension = 1 symptom.
    """
    # Collect all unique symptoms
    all_symptoms = set()
    for row in data:
        for cell in row[1:]:
            s = cell.strip().replace("_", " ").lower()
            if s:
                all_symptoms.add(s)

    symptom_list = sorted(all_symptoms)
    symptom_to_idx = {s: i for i, s in enumerate(symptom_list)}

    # Build matrix
    X = np.zeros((len(data), len(symptom_list)), dtype=np.float32)
    y_raw = []

    for i, row in enumerate(data):
        disease = row[0].strip()
        y_raw.append(disease)
        for cell in row[1:]:
            s = cell.strip().replace("_", " ").lower()
            if s and s in symptom_to_idx:
                idx = symptom_to_idx[s]
                if use_weights and s in severity:
                    X[i, idx] = float(severity[s])
                else:
                    X[i, idx] = 1.0

    return X, y_raw, symptom_list

def deduplicate(X, y_raw):
    """
    Remove exact duplicate rows (same disease + same symptom vector).
    Critical for preventing inflated metrics.
    """
    seen = {}
    unique_indices = []
    for i in range(len(X)):
        # Hash the feature vector + label
        key = hashlib.md5(
            X[i].tobytes() + y_raw[i].encode("utf-8")
        ).hexdigest()
        if key not in seen:
            seen[key] = i
            unique_indices.append(i)

    X_dedup = X[unique_indices]
    y_dedup = [y_raw[i] for i in unique_indices]
    n_removed = len(X) - len(unique_indices)
    return X_dedup, y_dedup, n_removed

def split_data(X, y, cfg, seed=42):
    """
    Stratified train/val/test split.
    No patient IDs exist, so we split by unique sample.
    """
    ratios = cfg["data"]["split_ratio"]
    test_ratio = ratios["test"]
    val_ratio = ratios["val"] / (1 - test_ratio)  # relative to train+val

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # First split: train+val vs test
    X_trainval, X_test, y_trainval, y_test, idx_trainval, idx_test = train_test_split(
        X, y_encoded, np.arange(len(X)),
        test_size=test_ratio, random_state=seed, stratify=y_encoded
    )

    # Second split: train vs val
    X_train, X_val, y_train, y_val, idx_train, idx_val = train_test_split(
        X_trainval, y_trainval, idx_trainval,
        test_size=val_ratio, random_state=seed, stratify=y_trainval
    )

    return {
        "X_train": X_train, "y_train": y_train,
        "X_val": X_val, "y_val": y_val,
        "X_test": X_test, "y_test": y_test,
        "idx_train": idx_train, "idx_val": idx_val, "idx_test": idx_test,
        "label_encoder": le,
        "class_names": list(le.classes_),
        "n_classes": len(le.classes_),
    }

def compute_class_weights(y_train, n_classes):
    """Compute inverse-frequency class weights for imbalanced training."""
    counts = np.bincount(y_train, minlength=n_classes).astype(np.float32)
    # Prevent division by zero for missing classes
    counts = np.maximum(counts, 1.0)
    weights = len(y_train) / (n_classes * counts)
    return weights

def save_artifacts(splits, symptom_list, severity, cfg):
    """Save all preprocessed data and metadata for reproducibility."""
    out_dir = PROJECT_ROOT / cfg["data"]["output_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    # Save numpy arrays
    np.save(out_dir / "X_train.npy", splits["X_train"])
    np.save(out_dir / "y_train.npy", splits["y_train"])
    np.save(out_dir / "X_val.npy", splits["X_val"])
    np.save(out_dir / "y_val.npy", splits["y_val"])
    np.save(out_dir / "X_test.npy", splits["X_test"])
    np.save(out_dir / "y_test.npy", splits["y_test"])

    # Save split indices
    np.save(out_dir / "idx_train.npy", splits["idx_train"])
    np.save(out_dir / "idx_val.npy", splits["idx_val"])
    np.save(out_dir / "idx_test.npy", splits["idx_test"])

    # Save class weights
    class_weights = compute_class_weights(splits["y_train"], splits["n_classes"])
    np.save(out_dir / "class_weights.npy", class_weights)

    # Save metadata
    metadata = {
        "symptom_list": symptom_list,
        "severity_weights": severity,
        "class_names": splits["class_names"],
        "n_classes": splits["n_classes"],
        "n_features": len(symptom_list),
        "train_size": len(splits["X_train"]),
        "val_size": len(splits["X_val"]),
        "test_size": len(splits["X_test"]),
        "class_distribution": {
            "train": {splits["class_names"][c]: int(cnt) for c, cnt in
                      zip(*np.unique(splits["y_train"], return_counts=True))},
            "val": {splits["class_names"][c]: int(cnt) for c, cnt in
                    zip(*np.unique(splits["y_val"], return_counts=True))},
            "test": {splits["class_names"][c]: int(cnt) for c, cnt in
                     zip(*np.unique(splits["y_test"], return_counts=True))},
        },
    }
    with open(out_dir / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Save label encoder mapping
    le_mapping = {int(i): name for i, name in enumerate(splits["class_names"])}
    with open(out_dir / "label_encoder.json", "w") as f:
        json.dump(le_mapping, f, indent=2)

    print(f"[Data Pipeline] Artifacts saved to {out_dir}")
    return out_dir

def run_pipeline(seed=None):
    """Execute the full data preparation pipeline."""
    cfg = load_config()
    if seed is None:
        seed = cfg["seed"]

    print("=" * 60)
    print("CURX ML DATA PIPELINE")
    print("=" * 60)

    # Step 1: Extract
    print("\n[1/5] Extracting symptom dataset...")
    header, data, severity = extract_symptom_dataset(cfg)
    print(f"  Raw rows: {len(data)}")
    print(f"  Columns: {len(header)}")
    print(f"  Severity weights: {len(severity)} symptoms")

    # Step 2: Build feature matrix
    print("\n[2/5] Building feature matrix...")
    use_weights = cfg["preprocessing"]["use_severity_weights"]
    X, y_raw, symptom_list = build_feature_matrix(header, data, severity, use_weights)
    print(f"  Feature matrix shape: {X.shape}")
    print(f"  Unique symptoms: {len(symptom_list)}")
    print(f"  Unique diseases: {len(set(y_raw))}")

    # Step 3: Deduplicate
    print("\n[3/5] Deduplicating...")
    X_dedup, y_dedup, n_removed = deduplicate(X, y_raw)
    print(f"  Removed {n_removed} duplicate rows")
    print(f"  Remaining unique samples: {len(X_dedup)}")

    # Step 4: Split
    print("\n[4/5] Stratified train/val/test split...")
    splits = split_data(X_dedup, y_dedup, cfg, seed=seed)
    print(f"  Train: {len(splits['X_train'])} samples")
    print(f"  Val:   {len(splits['X_val'])} samples")
    print(f"  Test:  {len(splits['X_test'])} samples")
    print(f"  Classes: {splits['n_classes']}")

    # Step 5: Save
    print("\n[5/5] Saving artifacts...")
    out_dir = save_artifacts(splits, symptom_list, severity, cfg)

    # Summary
    print("\n" + "=" * 60)
    print("DATA PIPELINE COMPLETE")
    print("=" * 60)
    print(f"  Total unique samples: {len(X_dedup)}")
    print(f"  Features: {len(symptom_list)}")
    print(f"  Classes: {splits['n_classes']}")
    print(f"  Train/Val/Test: {len(splits['X_train'])}/{len(splits['X_val'])}/{len(splits['X_test'])}")
    print(f"  Artifacts: {out_dir}")

    return splits, symptom_list, severity

if __name__ == "__main__":
    run_pipeline()
