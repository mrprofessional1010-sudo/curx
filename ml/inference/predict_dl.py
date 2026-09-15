"""
CURX Deep-Learning Offline & API Inference Engine
Conforms to strict production schema with:
- Relative condition ranking (Top-1, Top-3, Top-5)
- Calibrated probability estimates
- Symptom feature attribution
- Input completeness checks
- Research-only safety disclaimers
"""
import sys
import json
import argparse
import warnings
warnings.filterwarnings("ignore")
from datetime import datetime, timezone
from pathlib import Path
import numpy as np

import torch
import torch.nn.functional as F
import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import build_model


def load_inference_artifacts(checkpoint_path=None):
    device = torch.device("cpu")
    if checkpoint_path is None:
        ckpt_candidates = [
            PROJECT_ROOT / "models" / "model_v002_curxsymptomnet" / "best_model.pt",
            PROJECT_ROOT / "ml" / "checkpoints" / "best_curx_symptom_net_seed42.pt",
        ]
        for c in ckpt_candidates:
            if c.exists():
                checkpoint_path = c
                break
        if checkpoint_path is None:
            raise FileNotFoundError("No trained deep learning checkpoint found.")

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

    # Load calibration temperature
    temperature = 1.0
    cal_candidates = [
        PROJECT_ROOT / "models" / "model_v002_curxsymptomnet" / "calibration.pt",
        PROJECT_ROOT / "ml" / "checkpoints" / f"calibration_{model_name}.pt"
    ]
    for cal_p in cal_candidates:
        if cal_p.exists():
            cal_data = torch.load(cal_p, map_location=device, weights_only=False)
            temperature = float(cal_data.get("temperature", 1.0))
            break

    return model, metadata, temperature, device, model_name


def encode_symptom_input(symptom_names, metadata):
    symptom_list = metadata["symptom_list"]
    severity = metadata.get("severity_weights", {})
    symptom_to_idx = {s: i for i, s in enumerate(symptom_list)}

    x = np.zeros(len(symptom_list), dtype=np.float32)
    matched = []
    unmatched = []

    for s in symptom_names:
        s_clean = s.strip().replace("_", " ").lower()
        if s_clean in symptom_to_idx:
            idx = symptom_to_idx[s_clean]
            weight = severity.get(s_clean, 1)
            x[idx] = float(weight)
            matched.append(s_clean)
        else:
            unmatched.append(s_clean)

    return x, matched, unmatched


def predict_condition(input_data, checkpoint_path=None):
    """
    Evaluates input symptoms and outputs strict relative condition ranking schema.
    """
    model, metadata, temperature, device, model_name = load_inference_artifacts(checkpoint_path)
    class_names = metadata["class_names"]
    symptom_list = metadata["symptom_list"]

    symptoms = input_data.get("symptoms", [])
    if not symptoms or not isinstance(symptoms, list):
        return {
            "model_version": "v002_curxsymptomnet",
            "model_status": "research_only",
            "top1": None,
            "top3": [],
            "top5": [],
            "probabilities": [],
            "calibration": {"status": "uncalibrated", "temperature": 1.0},
            "feature_attributions": [],
            "input_completeness": "INSUFFICIENT_INPUT",
            "warnings": ["No symptoms provided in input request."]
        }

    x_np, matched, unmatched = encode_symptom_input(symptoms, metadata)
    completeness_ratio = len(matched) / max(len(symptoms), 1)

    if len(matched) == 0:
        return {
            "model_version": "v002_curxsymptomnet",
            "model_status": "research_only",
            "top1": None,
            "top3": [],
            "top5": [],
            "probabilities": [],
            "calibration": {"status": "calibrated", "temperature": temperature},
            "feature_attributions": [],
            "input_completeness": "ZERO_MATCH",
            "warnings": [f"None of the provided symptoms matched the medical vocabulary: {unmatched}"]
        }

    x_tensor = torch.FloatTensor(x_np).unsqueeze(0).to(device)

    with torch.no_grad():
        out = model(x_tensor)
        logits = out["logits"] if isinstance(out, dict) else out
        scaled_logits = logits / temperature
        proba = F.softmax(scaled_logits, dim=-1).cpu().numpy()[0]

    # Integrated gradients / occlusion attribution on active matched symptoms
    x_tensor_grad = x_tensor.clone().requires_grad_(True)
    out_grad = model(x_tensor_grad)
    logits_grad = out_grad["logits"] if isinstance(out_grad, dict) else out_grad
    top1_idx = int(np.argmax(proba))
    logits_grad[0, top1_idx].backward()
    grads = x_tensor_grad.grad.cpu().numpy()[0]
    raw_attr = x_np * grads

    active_indices = np.where(x_np > 0)[0]
    attributions = [
        {
            "symptom": symptom_list[i],
            "attribution_score": float(abs(raw_attr[i])),
            "direction": "positive" if raw_attr[i] >= 0 else "negative"
        }
        for i in sorted(active_indices, key=lambda idx: abs(raw_attr[idx]), reverse=True)
    ]

    # Rank classes
    sorted_indices = np.argsort(proba)[::-1]
    
    def format_entry(idx, rank):
        return {
            "rank": rank,
            "condition": class_names[idx],
            "relative_score": float(proba[idx]),
            "percentage": f"{proba[idx]*100:.1f}%"
        }

    top1 = format_entry(sorted_indices[0], 1)
    top3 = [format_entry(sorted_indices[i], i + 1) for i in range(min(3, len(class_names)))]
    top5 = [format_entry(sorted_indices[i], i + 1) for i in range(min(5, len(class_names)))]

    all_probabilities = [
        {"condition": class_names[i], "probability": float(proba[i])}
        for i in sorted_indices
    ]

    warnings_list = []
    if unmatched:
        warnings_list.append(f"Unrecognized symptoms ignored: {unmatched}")
    if completeness_ratio < 0.5:
        warnings_list.append(f"Low completeness: only {len(matched)} of {len(symptoms)} symptoms mapped.")
    if proba[sorted_indices[0]] < 0.30:
        warnings_list.append("Low relative certainty across all 41 conditions. Clinical review recommended.")

    return {
        "model_version": "v002_curxsymptomnet",
        "model_architecture": model_name,
        "model_status": "research_only",
        "top1": top1,
        "top3": top3,
        "top5": top5,
        "probabilities": all_probabilities[:10],
        "calibration": {
            "method": "temperature_scaling",
            "temperature": float(temperature),
            "status": "calibrated" if temperature != 1.0 else "uncalibrated"
        },
        "feature_attributions": attributions,
        "input_completeness": f"{len(matched)}/{len(symptoms)} ({completeness_ratio*100:.0f}%)",
        "matched_symptoms": matched,
        "unmatched_symptoms": unmatched,
        "clinical_role": "Relative condition ranking / hypothesis generation",
        "disclaimer": "RESEARCH ONLY: This relative condition ranking is generated for clinical decision support research. It is not an autonomous diagnostic tool and must not be used for primary diagnosis or prescription.",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "warnings": warnings_list
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, required=True, help="Input JSON path")
    parser.add_argument("--checkpoint", type=str, default=None)
    args = parser.parse_args()

    with open(args.input) as f:
        data = json.load(f)

    result = predict_condition(data, checkpoint_path=args.checkpoint)
    print(json.dumps(result, indent=2))
