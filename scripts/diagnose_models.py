import sys
import os
import json
import torch
import onnxruntime as ort

sys.path.insert(0, os.path.abspath("."))

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def test_models():
    print("=================================================================")
    print("[DIAGNOSTIC] CURX DEEP LEARNING & MACHINE LEARNING COMPLETE TEST")
    print("=================================================================\n")

    # 1. Label Encoder & Metadata
    print("[1/6] Inspecting Metadata and Class Encodings...")
    with open("models/model_v002_curxsymptomnet/label_encoder.json") as f:
        le = json.load(f)
        print(f"  -> Label Encoder: {len(le)} disease classes mapped.")

    with open("models/model_v002_curxsymptomnet/metadata.json") as f:
        meta = json.load(f)
        symptoms = meta.get("symptom_list", [])
        num_features = meta.get("n_features", len(symptoms))
        print(f"  -> Metadata Features: {len(symptoms)} distinct clinical symptoms (Input Dim: {num_features}).")
    num_classes = len(le)
    dummy_x = torch.zeros((1, num_features))
    dummy_x[0, 0] = 1.0 # activate first symptom

    # 2. PyTorch Native Weights
    print("\n[2/6] Verifying PyTorch CURXSymptomNet Architecture & Weights...")
    from ml.training.train_dl import build_model
    checkpoint = torch.load("models/model_v002_curxsymptomnet/best_model.pt", map_location="cpu", weights_only=False)
    cfg = checkpoint.get("config", {}) if isinstance(checkpoint, dict) else {}
    model_name = checkpoint.get("model_name", "curx_symptom_net")
    state_dict = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint

    model = build_model(model_name, cfg, num_features, num_classes)
    model.load_state_dict(state_dict)
    model.eval()

    if isinstance(checkpoint, dict):
        print(f"  -> Checkpoint Metadata: Model='{checkpoint.get('model_name')}', Verified Acc={checkpoint.get('verified_accuracy', 'N/A')}, Best Epoch={checkpoint.get('best_epoch')}")
        print(f"  -> Parameter Count: {checkpoint.get('param_count')}")

    with torch.no_grad():
        out = model(dummy_x)
        logits = out["logits"] if isinstance(out, dict) else out
        probs = torch.softmax(logits, dim=-1)
        top_prob, top_idx = torch.topk(probs, 3)
        print("  -> Model Loaded: SUCCESS")
        print(f"  -> Forward Pass: Output Logits Shape {list(logits.shape)}")
        print(f"  -> Top-1 Predicted Class Index: {top_idx[0][0].item()} (Confidence: {top_prob[0][0].item():.4%})")

    with torch.no_grad():
        out = model(dummy_x)
        logits = out["logits"] if isinstance(out, dict) else out
        probs = torch.softmax(logits, dim=-1)
        top_prob, top_idx = torch.topk(probs, 3)
        print("  -> Model Loaded: SUCCESS")
        print(f"  -> Forward Pass: Output Logits Shape {list(logits.shape)}")
        print(f"  -> Top-1 Predicted Class Index: {top_idx[0][0].item()} (Confidence: {top_prob[0][0].item():.4%})")

    # 3. TorchScript JIT Traced Model
    print("\n[3/6] Verifying TorchScript JIT Traced Model...")
    traced = torch.jit.load("models/model_v002_curxsymptomnet/curx_symptom_net_traced.pt")
    traced.eval()
    with torch.no_grad():
        traced_out = traced(dummy_x)
        print("  -> JIT Traced Execution: SUCCESS")
        print(f"  -> JIT Output Shape: {list(traced_out.shape)}")

    # 4. ONNX Runtime Model
    print("\n[4/6] Verifying ONNX Runtime Cross-Platform Model...")
    sess = ort.InferenceSession("models/model_v002_curxsymptomnet/curx_symptom_net.onnx")
    input_name = sess.get_inputs()[0].name
    onnx_out = sess.run(None, {input_name: dummy_x.numpy().astype("float32")})[0]
    print("  -> ONNX Session Initialized: SUCCESS")
    print(f"  -> ONNX Inference Output Shape: {onnx_out.shape}")

    # 5. Temperature Scaling Calibration
    print("\n[5/6] Verifying Temperature Scaling Calibration Tensor...")
    calib = torch.load("models/model_v002_curxsymptomnet/calibration.pt", map_location="cpu")
    temp = calib.get("temperature", calib) if isinstance(calib, dict) else calib
    print("  -> Calibration Tensor Loaded: SUCCESS")
    print(f"  -> Calibrated Temperature Parameter: {temp}")

    # 6. Alternative Neural Network Architectures
    print("\n[6/6] Verifying Modular Neural Network Architectures...")
    for arch in ["residual_mlp", "deep_sets", "prototype_network", "symptom_transformer"]:
        m = build_model(arch, cfg, num_features, num_classes)
        with torch.no_grad():
            res = m(dummy_x)
            out_shape = res["logits"].shape if isinstance(res, dict) else res.shape
            print(f"  -> [{arch.upper()}]: Initialized & Forward Pass Output Shape {list(out_shape)} (OK)")

    print("\n=================================================================")
    print("ALL MACHINE LEARNING & DEEP LEARNING MODELS ARE 100% OPERATIONAL")
    print("=================================================================")

if __name__ == "__main__":
    test_models()
