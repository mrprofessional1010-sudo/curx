"""
CURX ML Offline Inference Script
Predicts disease from symptom input using the trained model with strict output schema.
"""
import sys
import json
import argparse
import numpy as np
import torch
import torch.nn.functional as F
import yaml
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer


def load_model_and_metadata(checkpoint_path=None):
    with open(PROJECT_ROOT / "ml" / "config" / "config.yaml") as f:
        cfg = yaml.safe_load(f)

    device = torch.device("cpu")
    if checkpoint_path is None:
        # Prefer fine-tuned, fall back to best
        ft_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model_finetuned.pt"
        base_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"
        checkpoint_path = ft_path if ft_path.exists() else base_path

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

    # Load calibration temperature if available
    cal_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "calibration.pt"
    temperature = 1.0
    if cal_path.exists():
        cal = torch.load(cal_path, map_location=device, weights_only=False)
        temperature = cal["temperature"]

    return model, metadata, temperature, device


def encode_symptoms(symptom_names, metadata):
    """Convert a list of symptom strings into the feature vector."""
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


def predict(input_data, checkpoint_path=None):
    """
    Run prediction on input symptoms.

    Args:
        input_data: dict with "symptoms" key containing list of symptom strings
        checkpoint_path: optional path to model checkpoint

    Returns:
        Strict prediction schema dict
    """
    model, metadata, temperature, device = load_model_and_metadata(checkpoint_path)
    class_names = metadata["class_names"]

    symptoms = input_data.get("symptoms", [])
    if not symptoms:
        return {
            "model_version": "v001",
            "prediction": None,
            "confidence": "INSUFFICIENT_INPUT",
            "input_completeness": 0.0,
            "prediction_validity": "INVALID",
            "warnings": ["No symptoms provided"],
            "model_status": "research_only",
        }

    # Encode
    x, matched, unmatched = encode_symptoms(symptoms, metadata)
    completeness = len(matched) / max(len(symptoms), 1)

    if len(matched) == 0:
        return {
            "model_version": "v001",
            "prediction": None,
            "confidence": "INSUFFICIENT_INPUT",
            "input_completeness": 0.0,
            "prediction_validity": "INVALID",
            "warnings": [f"None of the provided symptoms matched the vocabulary: {unmatched}"],
            "model_status": "research_only",
        }

    # Predict
    x_tensor = torch.FloatTensor(x).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(x_tensor)
        # Apply temperature scaling
        scaled_logits = logits / temperature
        proba = F.softmax(scaled_logits, dim=-1).cpu().numpy()[0]

    # Top predictions
    top_k = min(5, len(class_names))
    top_indices = np.argsort(proba)[::-1][:top_k]

    top_predictions = []
    for idx in top_indices:
        top_predictions.append({
            "label": class_names[idx],
            "probability": float(proba[idx]),
        })

    max_prob = float(proba[top_indices[0]])
    if max_prob >= 0.8:
        confidence = "HIGH"
    elif max_prob >= 0.5:
        confidence = "MODERATE"
    else:
        confidence = "LOW"

    validity = "VALID" if completeness >= 0.5 and max_prob >= 0.3 else "LOW_CONFIDENCE"

    warnings = []
    if unmatched:
        warnings.append(f"Unrecognized symptoms: {unmatched}")
    if completeness < 0.5:
        warnings.append(f"Only {len(matched)}/{len(symptoms)} symptoms matched vocabulary")
    if max_prob < 0.3:
        warnings.append("Very low prediction confidence — result should not be relied upon")

    return {
        "model_version": "v001",
        "prediction": {
            "label": class_names[top_indices[0]],
            "probability": max_prob,
        },
        "top_predictions": top_predictions,
        "confidence": confidence,
        "calibration": {
            "method": "temperature_scaling",
            "temperature": float(temperature),
            "status": "calibrated" if temperature != 1.0 else "uncalibrated",
        },
        "input_completeness": float(completeness),
        "prediction_validity": validity,
        "matched_symptoms": matched,
        "unmatched_symptoms": unmatched,
        "explanation": {
            "top_features": matched[:10],
        },
        "warnings": warnings,
        "model_status": "research_only",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CURX ML Offline Prediction")
    parser.add_argument("--input", type=str, required=True, help="Path to input JSON")
    parser.add_argument("--model", type=str, default=None, help="Path to model checkpoint")
    parser.add_argument("--output", type=str, default="prediction.json", help="Output JSON path")
    args = parser.parse_args()

    with open(args.input) as f:
        input_data = json.load(f)

    result = predict(input_data, checkpoint_path=args.model)

    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(json.dumps(result, indent=2))
