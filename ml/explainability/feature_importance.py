"""
CURX ML Feature Importance & Explainability
Computes permutation feature importance and per-disease top indicative symptoms.
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

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer


def compute_permutation_importance(model, X, y, device, n_repeats=5, random_state=42):
    """Calculate permutation feature importance on dataset."""
    rng = np.random.RandomState(random_state)
    model.eval()
    
    # Baseline accuracy
    X_tensor = torch.FloatTensor(X).to(device)
    with torch.no_grad():
        baseline_preds = model(X_tensor).argmax(dim=-1).cpu().numpy()
    baseline_acc = np.mean(baseline_preds == y)
    
    n_features = X.shape[1]
    importances = np.zeros((n_features, n_repeats))
    
    for feat_idx in range(n_features):
        for rep in range(n_repeats):
            X_permuted = X.copy()
            X_permuted[:, feat_idx] = rng.permutation(X_permuted[:, feat_idx])
            with torch.no_grad():
                perm_preds = model(torch.FloatTensor(X_permuted).to(device)).argmax(dim=-1).cpu().numpy()
            perm_acc = np.mean(perm_preds == y)
            importances[feat_idx, rep] = baseline_acc - perm_acc
            
    mean_imp = np.mean(importances, axis=1)
    std_imp = np.std(importances, axis=1)
    return baseline_acc, mean_imp, std_imp


def compute_class_symptom_affinity(model, symptom_list, class_names, device):
    """
    Compute which individual symptoms most strongly activate each disease class
    by passing single-symptom one-hot probes through the model.
    """
    model.eval()
    n_features = len(symptom_list)
    eye = torch.eye(n_features).to(device)
    with torch.no_grad():
        logits = model(eye)
        probs = F.softmax(logits, dim=-1).cpu().numpy()  # (n_features, n_classes)
        
    top_per_class = {}
    for c_idx, c_name in enumerate(class_names):
        symptom_scores = probs[:, c_idx]
        top_indices = np.argsort(symptom_scores)[::-1][:5]
        top_per_class[c_name] = [
            {"symptom": symptom_list[s_idx], "activation_score": float(symptom_scores[s_idx])}
            for s_idx in top_indices
        ]
        
    return top_per_class


def run_explainability():
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    ckpt_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"

    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    model_cfg = ckpt["config"]["model"]

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    symptom_list = metadata["symptom_list"]
    class_names = metadata["class_names"]

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

    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")

    print("Computing permutation feature importance...")
    baseline_acc, mean_imp, std_imp = compute_permutation_importance(model, X_val, y_val, device)

    # Sort features by importance
    sorted_idx = np.argsort(mean_imp)[::-1]
    top_k = 25
    top_features = [
        {
            "symptom": symptom_list[i],
            "mean_importance": float(mean_imp[i]),
            "std_importance": float(std_imp[i]),
        }
        for i in sorted_idx[:top_k]
    ]

    print("Computing class symptom activations...")
    class_affinities = compute_class_symptom_affinity(model, symptom_list, class_names, device)

    reports_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    reports_dir.mkdir(parents=True, exist_ok=True)

    # Plot top 20 features
    plt.figure(figsize=(10, 8))
    top_20_idx = sorted_idx[:20][::-1]
    plt.barh(range(20), mean_imp[top_20_idx], xerr=std_imp[top_20_idx], color="#10b981", alpha=0.85, capsize=3)
    plt.yticks(range(20), [symptom_list[i] for i in top_20_idx], fontsize=9)
    plt.xlabel("Mean Accuracy Drop Upon Permutation", fontsize=10)
    plt.title("Top 20 Indicative Symptom Features (Permutation Importance)", fontsize=12, fontweight="bold")
    plt.tight_layout()
    plt.savefig(reports_dir / "feature_importance.png", dpi=300)
    plt.close()

    result = {
        "baseline_accuracy": float(baseline_acc),
        "top_features": top_features,
        "class_symptom_affinities": class_affinities,
    }

    with open(reports_dir / "feature_importance.json", "w") as f:
        json.dump(result, f, indent=2)

    print(f"Explainability report saved to: {reports_dir / 'feature_importance.json'}")
    print(f"Importance plot saved to: {reports_dir / 'feature_importance.png'}")
    return result


if __name__ == "__main__":
    run_explainability()
