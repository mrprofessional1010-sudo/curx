"""
CURX Deep-Learning Explainability & Feature Attribution Engine
Implements Integrated Gradients, Feature Occlusion / Ablation, and Set Attention extraction.
Generates clinical explainability reports and visualization plots.
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
import torch.nn.functional as F

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import build_model


def integrated_gradients(model, x, target_class, steps=30):
    """
    Computes Integrated Gradients attribution for input x toward target_class.
    Baseline is the all-zeros vector (no symptoms).
    """
    model.eval()
    baseline = torch.zeros_like(x)
    
    # Generate interpolated inputs
    alphas = torch.linspace(0.0, 1.0, steps).to(x.device)
    interpolated = [baseline + alpha * (x - baseline) for alpha in alphas]
    interpolated = torch.stack(interpolated, dim=0).requires_grad_(True)  # (steps, n_features)

    out = model(interpolated)
    logits = out["logits"] if isinstance(out, dict) else out
    target_logits = logits[:, target_class].sum()

    target_logits.backward()
    grads = interpolated.grad  # (steps, n_features)

    # Average gradients and multiply by (x - baseline)
    avg_grads = torch.mean(grads, dim=0)
    attributions = (x - baseline) * avg_grads
    return attributions.detach().cpu().numpy()


def occlusion_attribution(model, x, target_class):
    """
    Computes probability drop when each active feature is ablated to 0.
    """
    model.eval()
    with torch.no_grad():
        base_out = model(x.unsqueeze(0))
        base_logits = base_out["logits"] if isinstance(base_out, dict) else base_out
        base_prob = F.softmax(base_logits, dim=-1)[0, target_class].item()

    x_np = x.cpu().numpy()
    active_indices = np.where(x_np > 0)[0]
    occlusion_drops = np.zeros_like(x_np)

    for idx in active_indices:
        x_ablated = x.clone()
        x_ablated[idx] = 0.0
        with torch.no_grad():
            ablated_out = model(x_ablated.unsqueeze(0))
            ablated_logits = ablated_out["logits"] if isinstance(ablated_out, dict) else ablated_out
            ablated_prob = F.softmax(ablated_logits, dim=-1)[0, target_class].item()
        occlusion_drops[idx] = base_prob - ablated_prob

    return occlusion_drops


def run_explainability_suite(checkpoint_path, split="val", sample_limit=10):
    device = torch.device("cpu")
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    cfg = ckpt["config"]
    model_name = ckpt.get("model_name", "curx_symptom_net")
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    n_features = metadata["n_features"]
    n_classes = metadata["n_classes"]
    symptom_list = metadata["symptom_list"]
    class_names = metadata["class_names"]

    model = build_model(model_name, cfg, n_features, n_classes).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    X = np.load(data_dir / f"X_{split}.npy")
    y = np.load(data_dir / f"y_{split}.npy")

    out_dir = PROJECT_ROOT / "reports" / "dl_explainability"
    out_dir.mkdir(parents=True, exist_ok=True)

    attributions_log = []
    global_symptom_importance = np.zeros(n_features)

    print(f"\nComputing Deep-Learning Explainability for {model_name}...")

    n_eval = min(len(X), sample_limit)
    for i in range(n_eval):
        x_tensor = torch.FloatTensor(X[i]).to(device)
        target = int(y[i])
        
        with torch.no_grad():
            out = model(x_tensor.unsqueeze(0))
            logits = out["logits"] if isinstance(out, dict) else out
            pred_class = int(logits.argmax(dim=-1).item())
            pred_prob = float(F.softmax(logits, dim=-1)[0, pred_class].item())

        ig_attr = integrated_gradients(model, x_tensor, target_class=pred_class)
        occ_attr = occlusion_attribution(model, x_tensor, target_class=pred_class)
        global_symptom_importance += np.abs(ig_attr)

        active_indices = np.where(X[i] > 0)[0]
        sample_explanation = {
            "sample_index": i,
            "true_condition": class_names[target],
            "predicted_condition": class_names[pred_class],
            "predicted_probability": pred_prob,
            "active_symptoms": [
                {
                    "symptom": symptom_list[idx],
                    "integrated_gradient": float(ig_attr[idx]),
                    "occlusion_impact": float(occ_attr[idx]),
                }
                for idx in sorted(active_indices, key=lambda idx: abs(ig_attr[idx]), reverse=True)
            ]
        }
        attributions_log.append(sample_explanation)

    # Global top-15 symptoms across evaluated cohort
    top_indices = np.argsort(global_symptom_importance)[::-1][:15]
    top_symptoms = [
        {"symptom": symptom_list[idx], "importance_score": float(global_symptom_importance[idx])}
        for idx in top_indices
    ]

    report = {
        "model_name": model_name,
        "methodology": "Integrated Gradients + Occlusion Ablation",
        "notice": "Attributions reflect feature gradients and ablation probability changes, not causal medical evidence.",
        "top_symptoms_cohort": top_symptoms,
        "sample_explanations": attributions_log
    }

    with open(out_dir / "symptom_attributions.json", "w") as f:
        json.dump(report, f, indent=2)

    # Plot top features
    plt.figure(figsize=(9, 6))
    scores = [global_symptom_importance[idx] for idx in top_indices[::-1]]
    names = [symptom_list[idx] for idx in top_indices[::-1]]
    plt.barh(range(len(names)), scores, color="#3b82f6", alpha=0.85)
    plt.yticks(range(len(names)), names, fontsize=9)
    plt.xlabel("Integrated Gradient Importance Score", fontsize=10)
    plt.title(f"Top Attributed Symptoms ({model_name.upper()})", fontsize=12, fontweight="bold")
    plt.tight_layout()
    plt.savefig(out_dir / "top_symptom_attributions.png", dpi=200)
    plt.close()

    print(f"Explainability suite completed. Outputs saved to {out_dir}")
    return report


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default="ml/checkpoints/best_curx_symptom_net_seed42.pt")
    args = parser.parse_args()
    run_explainability_suite(args.checkpoint)
