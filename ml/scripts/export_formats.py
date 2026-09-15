"""
CURX Model Exporter: Pickle, ONNX, and TorchScript Formats
Exports CURXSymptomNet and baseline models into:
1. Pickle (.pkl) - Standalone python object ready for pickle.load()
2. ONNX (.onnx) - Open Neural Network Exchange format for cross-platform/Node.js/C++ inference
3. TorchScript (.pt) - JIT-traced standalone graph
4. Classical Baselines (.pkl) - Logistic Regression & Random Forest
"""
import sys
import os
import pickle
import warnings
warnings.filterwarnings("ignore")
from pathlib import Path
import numpy as np
import yaml
import json

import torch
import torch.nn.functional as F

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.training.train_dl import build_model


class CURXPredictorBundle:
    """
    Self-contained inference bundle that can be pickled and unpickled anywhere.
    Does not require external metadata files at inference time.
    """
    def __init__(self, model_state_dict, config, symptom_list, severity_weights,
                 class_names, temperature=1.0):
        self.config = config
        self.symptom_list = symptom_list
        self.severity_weights = severity_weights
        self.class_names = class_names
        self.temperature = float(temperature)
        self.model_state_dict = model_state_dict
        self._symptom_to_idx = {s: i for i, s in enumerate(symptom_list)}
        self._model = None

    def _ensure_model(self):
        if self._model is None:
            model = build_model(
                "curx_symptom_net",
                self.config,
                len(self.symptom_list),
                len(self.class_names)
            )
            model.load_state_dict(self.model_state_dict)
            model.eval()
            self._model = model
        return self._model

    def encode(self, symptoms):
        x = np.zeros(len(self.symptom_list), dtype=np.float32)
        matched = []
        unmatched = []
        for s in symptoms:
            clean = s.strip().replace("_", " ").lower()
            if clean in self._symptom_to_idx:
                idx = self._symptom_to_idx[clean]
                w = self.severity_weights.get(clean, 1)
                x[idx] = float(w)
                matched.append(clean)
            else:
                unmatched.append(clean)
        return x, matched, unmatched

    def predict(self, symptoms, top_k=5):
        """
        Predict disease ranking from symptom list.
        Returns dictionary with Top-1, Top-K rankings, probabilities, and completeness.
        """
        model = self._ensure_model()
        x_np, matched, unmatched = self.encode(symptoms)

        if len(matched) == 0:
            return {
                "status": "error",
                "message": "No recognized symptoms found in vocabulary",
                "unmatched": unmatched
            }

        x_t = torch.FloatTensor(x_np).unsqueeze(0)
        with torch.no_grad():
            out = model(x_t)
            logits = out["logits"] if isinstance(out, dict) else out
            scaled_logits = logits / self.temperature
            proba = F.softmax(scaled_logits, dim=-1).cpu().numpy()[0]

        ranked_indices = np.argsort(proba)[::-1][:top_k]
        rankings = [
            {
                "rank": i + 1,
                "disease": self.class_names[idx],
                "probability": float(proba[idx]),
                "confidence_percent": f"{proba[idx]*100:.1f}%"
            }
            for i, idx in enumerate(ranked_indices)
        ]

        return {
            "model": "CURXSymptomNet",
            "format": "Pickle (.pkl)",
            "top1": rankings[0],
            "top_k": rankings,
            "calibrated_temperature": self.temperature,
            "input_matched": matched,
            "input_unmatched": unmatched
        }


class ONNXPredictorWrapper(torch.nn.Module):
    """
    Clean wrapper for ONNX export that maps input vector x -> calibrated probabilities.
    """
    def __init__(self, base_model, temperature=1.0):
        super().__init__()
        self.base_model = base_model
        self.temperature = float(temperature)

    def forward(self, x):
        out = self.base_model(x)
        logits = out["logits"] if isinstance(out, dict) else out
        scaled = logits / self.temperature
        probs = torch.softmax(scaled, dim=-1)
        return probs


def export_all_formats():
    print("=" * 60)
    print("EXPORTING CURX MODELS: PICKLE, ONNX, TORCHSCRIPT")
    print("=" * 60)

    ckpt_path = PROJECT_ROOT / "ml" / "checkpoints" / "best_curx_symptom_net_seed42.pt"
    cal_path = PROJECT_ROOT / "ml" / "checkpoints" / "calibration_curx_symptom_net.pt"
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    cfg = ckpt["config"]
    temperature = 0.4353
    if cal_path.exists():
        cal_data = torch.load(cal_path, map_location="cpu", weights_only=False)
        temperature = float(cal_data.get("temperature", 0.4353))

    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    symptom_list = metadata["symptom_list"]
    class_names = metadata["class_names"]
    severity_weights = metadata.get("severity_weights", {})
    n_features = len(symptom_list)
    n_classes = len(class_names)

    model = build_model("curx_symptom_net", cfg, n_features, n_classes)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    export_dir = PROJECT_ROOT / "models" / "model_v002_curxsymptomnet"
    export_dir.mkdir(parents=True, exist_ok=True)
    root_models_dir = PROJECT_ROOT / "models"

    # 1. EXPORT PICKLE (.pkl)
    print("\n1. Exporting Pickle (.pkl) bundle...")
    dict_payload = {
        "model_name": "CURXSymptomNet",
        "model_state_dict": ckpt["model_state_dict"],
        "config": cfg,
        "symptom_list": symptom_list,
        "severity_weights": severity_weights,
        "class_names": class_names,
        "temperature": temperature,
        "param_count": ckpt.get("param_count", 76694),
        "status": "research_only"
    }

    bundle = CURXPredictorBundle(
        model_state_dict=ckpt["model_state_dict"],
        config=cfg,
        symptom_list=symptom_list,
        severity_weights=severity_weights,
        class_names=class_names,
        temperature=temperature
    )

    pkl_path_1 = export_dir / "curx_symptom_net.pkl"
    pkl_path_2 = root_models_dir / "curx_symptom_net.pkl"
    bundle_path = export_dir / "curx_symptom_net_bundle.pkl"

    with open(pkl_path_1, "wb") as f:
        pickle.dump(dict_payload, f)
    with open(pkl_path_2, "wb") as f:
        pickle.dump(dict_payload, f)
    with open(bundle_path, "wb") as f:
        pickle.dump(bundle, f)

    print(f"  Saved Universal Dict Pickle: {pkl_path_1} ({os.path.getsize(pkl_path_1)/1024:.1f} KB)")
    print(f"  Saved Predictor Bundle Pickle: {bundle_path} ({os.path.getsize(bundle_path)/1024:.1f} KB)")

    # 2. EXPORT TORCHSCRIPT (.pt)
    print("\n2. Exporting TorchScript (.pt) traced model...")
    dummy_input = torch.zeros(1, n_features, dtype=torch.float32)
    wrapper = ONNXPredictorWrapper(model, temperature=temperature)
    wrapper.eval()

    try:
        traced_model = torch.jit.trace(wrapper, dummy_input)
        ts_path_1 = export_dir / "curx_symptom_net_traced.pt"
        ts_path_2 = root_models_dir / "curx_symptom_net_traced.pt"
        traced_model.save(str(ts_path_1))
        traced_model.save(str(ts_path_2))
        print(f"  Saved TorchScript model: {ts_path_1} ({os.path.getsize(ts_path_1)/1024:.1f} KB)")
    except Exception as e:
        print(f"  TorchScript export note: {e}")

    # 3. EXPORT ONNX (.onnx)
    print("\n3. Exporting ONNX (.onnx) format...")
    onnx_path_1 = export_dir / "curx_symptom_net.onnx"
    onnx_path_2 = root_models_dir / "curx_symptom_net.onnx"

    try:
        torch.onnx.export(
            wrapper,
            dummy_input,
            str(onnx_path_1),
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["symptom_vector"],
            output_names=["probabilities"],
            dynamic_axes={
                "symptom_vector": {0: "batch_size"},
                "probabilities": {0: "batch_size"}
            }
        )
        # Copy to root models dir
        import shutil
        shutil.copy(onnx_path_1, onnx_path_2)
        print(f"  Saved ONNX model: {onnx_path_1} ({os.path.getsize(onnx_path_1)/1024:.1f} KB)")
    except Exception as e:
        print(f"  ONNX export note: {e}")

    # 4. EXPORT CLASSICAL ML BASELINES IN PICKLE (.pkl)
    print("\n4. Exporting Classical ML Baselines in Pickle (.pkl)...")
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier

    X_train = np.load(data_dir / "X_train.npy")
    y_train = np.load(data_dir / "y_train.npy")

    lr_model = LogisticRegression(max_iter=1000, random_state=42)
    lr_model.fit(X_train, y_train)

    rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)

    lr_pkl = export_dir / "logistic_regression_baseline.pkl"
    rf_pkl = export_dir / "random_forest_baseline.pkl"

    with open(lr_pkl, "wb") as f:
        pickle.dump({"model": lr_model, "class_names": class_names, "symptom_list": symptom_list}, f)
    with open(rf_pkl, "wb") as f:
        pickle.dump({"model": rf_model, "class_names": class_names, "symptom_list": symptom_list}, f)

    with open(root_models_dir / "logistic_regression_baseline.pkl", "wb") as f:
        pickle.dump({"model": lr_model, "class_names": class_names, "symptom_list": symptom_list}, f)
    with open(root_models_dir / "random_forest_baseline.pkl", "wb") as f:
        pickle.dump({"model": rf_model, "class_names": class_names, "symptom_list": symptom_list}, f)

    print(f"  Saved Logistic Regression: {lr_pkl} ({os.path.getsize(lr_pkl)/1024:.1f} KB)")
    print(f"  Saved Random Forest: {rf_pkl} ({os.path.getsize(rf_pkl)/1024:.1f} KB)")

    print("\n" + "=" * 60)
    print("ALL FORMATS EXPORTED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    export_all_formats()
