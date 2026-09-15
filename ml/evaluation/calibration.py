"""
CURX ML Model Calibration
Temperature scaling fitted on validation set to produce calibrated probabilities.
"""
import sys
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import yaml
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer


class TemperatureScaler(nn.Module):
    """Learned temperature scaling for calibration."""
    def __init__(self):
        super().__init__()
        self.log_temperature = nn.Parameter(torch.zeros(1))

    @property
    def temperature(self):
        return torch.clamp(torch.exp(self.log_temperature), min=0.05, max=10.0)

    def forward(self, logits):
        return logits / self.temperature


def fit_temperature_scaling(model, X_val, y_val, device, max_iter=200):
    """Fit temperature parameter on validation set using NLL loss."""
    model.eval()
    scaler = TemperatureScaler().to(device)
    optimizer = optim.LBFGS([scaler.log_temperature], lr=0.01, max_iter=max_iter)

    X_tensor = torch.FloatTensor(X_val).to(device)
    y_tensor = torch.LongTensor(y_val).to(device)

    with torch.no_grad():
        logits = model(X_tensor)

    def closure():
        optimizer.zero_grad()
        scaled_logits = scaler(logits)
        loss = F.cross_entropy(scaled_logits, y_tensor)
        loss.backward()
        return loss

    optimizer.step(closure)

    print(f"  Optimal temperature: {scaler.temperature.item():.4f}")
    return scaler


def calibrate(checkpoint_path=None):
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    if checkpoint_path is None:
        checkpoint_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"

    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model_cfg = ckpt["config"]["model"]
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

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

    print("=" * 60)
    print("CURX MODEL CALIBRATION")
    print("=" * 60)

    # Pre-calibration ECE
    with torch.no_grad():
        logits = model(torch.FloatTensor(X_val).to(device))
        proba_before = F.softmax(logits, dim=-1).cpu().numpy()

    ece_before = compute_ece(y_val, proba_before)
    print(f"  ECE before calibration: {ece_before:.4f}")

    # Fit temperature scaling
    scaler = fit_temperature_scaling(model, X_val, y_val, device)

    # Post-calibration ECE
    with torch.no_grad():
        scaled_logits = scaler(logits)
        proba_after = F.softmax(scaled_logits, dim=-1).cpu().numpy()

    ece_after = compute_ece(y_val, proba_after)
    print(f"  ECE after calibration:  {ece_after:.4f}")

    # Save calibration artifacts
    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]
    torch.save({
        "temperature": scaler.temperature.item(),
        "ece_before": ece_before,
        "ece_after": ece_after,
    }, ckpt_dir / "calibration.pt")

    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    cal_report = {
        "method": "temperature_scaling",
        "temperature": float(scaler.temperature.item()),
        "ece_before": float(ece_before),
        "ece_after": float(ece_after),
        "improvement": float(ece_before - ece_after),
    }
    with open(report_dir / "calibration.json", "w") as f:
        json.dump(cal_report, f, indent=2)

    print(f"  Calibration saved: {ckpt_dir / 'calibration.pt'}")
    return cal_report


def compute_ece(y_true, y_proba, n_bins=10):
    confidences = np.max(y_proba, axis=1)
    predictions = np.argmax(y_proba, axis=1)
    accuracies = (predictions == y_true).astype(float)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        if mask.sum() > 0:
            ece += mask.sum() * abs(accuracies[mask].mean() - confidences[mask].mean())
    return ece / len(y_true)


if __name__ == "__main__":
    calibrate()
