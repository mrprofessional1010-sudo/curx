"""
CURX Deep-Learning Model Export Engine
Packages the verified CURXSymptomNet model into models/model_v002_curxsymptomnet/
with complete weights, calibration, metadata, and architecture signatures.
"""
import os
import sys
import json
import shutil
import warnings
warnings.filterwarnings("ignore")
from pathlib import Path
from datetime import datetime, timezone
import torch
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))


def export_curx_model(source_ckpt=None, export_dir_name="model_v002_curxsymptomnet"):
    device = torch.device("cpu")
    if source_ckpt is None:
        source_ckpt = PROJECT_ROOT / "ml" / "checkpoints" / "best_curx_symptom_net_seed42.pt"

    dest_dir = PROJECT_ROOT / "models" / export_dir_name
    dest_dir.mkdir(parents=True, exist_ok=True)

    ckpt = torch.load(source_ckpt, map_location=device, weights_only=False)
    cfg = ckpt["config"]
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    # 1. Copy weights
    shutil.copy(source_ckpt, dest_dir / "best_model.pt")

    # 2. Copy calibration
    cal_src = PROJECT_ROOT / "ml" / "checkpoints" / "calibration_curx_symptom_net.pt"
    if cal_src.exists():
        shutil.copy(cal_src, dest_dir / "calibration.pt")

    # 3. Copy config
    with open(dest_dir / "dl_config.yaml", "w") as f:
        yaml.dump(cfg, f)

    # 4. Copy data metadata and label encoder
    if (data_dir / "metadata.json").exists():
        shutil.copy(data_dir / "metadata.json", dest_dir / "metadata.json")
    if (data_dir / "label_encoder.json").exists():
        shutil.copy(data_dir / "label_encoder.json", dest_dir / "label_encoder.json")

    # 5. Write model_info.json
    model_info = {
        "version": "v002",
        "name": "CURXSymptomNet",
        "model_architecture": "Gated Feature Embedding + Set-Attention Readout + Residual MLP + Class Prototypes",
        "parameters": ckpt.get("param_count", 76694),
        "target_classes": 41,
        "input_features": 133,
        "status": "research_only",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "best_epoch": ckpt.get("best_epoch", None),
        "best_val_metrics": ckpt.get("best_metrics", {}),
        "training_protocol": {
            "optimizer": "AdamW",
            "scheduler": "CosineAnnealingWithWarmup",
            "loss": "Hybrid (CrossEntropy + PrototypeMetricSeparation)",
            "data_augmentation": "Train-Only Symptom Dropout & Noise"
        }
    }

    with open(dest_dir / "model_info.json", "w") as f:
        json.dump(model_info, f, indent=2)

    print(f"Model successfully exported to: {dest_dir}")
    return dest_dir


if __name__ == "__main__":
    export_curx_model()
