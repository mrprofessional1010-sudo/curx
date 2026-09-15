"""
CURX Deep-Learning Model Calibration
Learned Temperature Scaling fitted strictly on validation set logits.
"""
import sys
import json
import warnings
warnings.filterwarnings("ignore")
import numpy as np
import yaml
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import build_model
from ml.evaluation.evaluate_dl import compute_ece


class TemperatureScaler(nn.Module):
    """Temperature scaler with log parameterization for positivity guarantee."""
    def __init__(self):
        super().__init__()
        self.log_temp = nn.Parameter(torch.zeros(1))

    @property
    def temperature(self):
        return torch.clamp(torch.exp(self.log_temp), min=0.05, max=10.0)

    def forward(self, logits):
        return logits / self.temperature


def calibrate_checkpoint(checkpoint_path, save_plots=True):
    device = torch.device("cpu")
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    
    cfg = ckpt["config"]
    model_name = ckpt.get("model_name", "curx_symptom_net")
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    n_features = metadata["n_features"]
    n_classes = metadata["n_classes"]

    model = build_model(model_name, cfg, n_features, n_classes).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    # Load validation split
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")

    with torch.no_grad():
        out = model(torch.FloatTensor(X_val).to(device))
        logits = out["logits"]
        proba_uncal = F.softmax(logits, dim=-1).cpu().numpy()

    ece_before = compute_ece(y_val, proba_uncal)

    # Fit temperature scaling via NLL
    scaler = TemperatureScaler().to(device)
    optimizer = optim.LBFGS([scaler.log_temp], lr=0.01, max_iter=200)

    y_tensor = torch.LongTensor(y_val).to(device)

    def closure():
        optimizer.zero_grad()
        loss = F.cross_entropy(scaler(logits), y_tensor)
        loss.backward()
        return loss

    optimizer.step(closure)
    opt_temp = float(scaler.temperature.item())

    with torch.no_grad():
        proba_cal = F.softmax(scaler(logits), dim=-1).cpu().numpy()

    ece_after = compute_ece(y_val, proba_cal)

    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]

    cal_artifact = {
        "model_name": model_name,
        "temperature": opt_temp,
        "ece_before": float(ece_before),
        "ece_after": float(ece_after),
        "improvement": float(ece_before - ece_after)
    }

    torch.save(cal_artifact, ckpt_dir / f"calibration_{model_name}.pt")
    with open(report_dir / f"calibration_{model_name}.json", "w") as f:
        json.dump(cal_artifact, f, indent=2)

    if save_plots:
        # Save reliability diagram
        conf_before = np.max(proba_uncal, axis=1)
        conf_after = np.max(proba_cal, axis=1)
        plt.figure(figsize=(8, 5))
        plt.hist(conf_before, bins=10, alpha=0.5, label=f"Uncalibrated (ECE={ece_before:.4f})", color="red")
        plt.hist(conf_after, bins=10, alpha=0.5, label=f"Calibrated (ECE={ece_after:.4f}, T={opt_temp:.3f})", color="green")
        plt.xlabel("Confidence")
        plt.ylabel("Sample Count")
        plt.title(f"Reliability Histogram ({model_name.upper()})", fontsize=11, fontweight="bold")
        plt.legend()
        plt.tight_layout()
        plt.savefig(report_dir / f"reliability_{model_name}.png", dpi=200)
        plt.close()

    print(f"Calibration complete for {model_name}:")
    print(f"  ECE Before: {ece_before:.4f}")
    print(f"  Optimal Temperature: {opt_temp:.4f}")
    print(f"  ECE After:  {ece_after:.4f}")

    return cal_artifact


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default="ml/checkpoints/best_curx_symptom_net_seed42.pt")
    args = parser.parse_args()
    calibrate_checkpoint(args.checkpoint)
