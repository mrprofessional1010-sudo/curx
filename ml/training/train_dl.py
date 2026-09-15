"""
CURX Unified Deep-Learning Training Engine
Supports all architectures, train-only data augmentation, hybrid metric losses,
cosine warmup & plateau schedulers, early stopping, and top-k validation metrics.
"""
import os
import sys
import json
import time
import math
import random
import argparse
import numpy as np
import yaml
from pathlib import Path

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import f1_score, accuracy_score

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

from ml.models.residual_mlp import ResidualMLP
from ml.models.deep_sets import DeepSetsSymptomNet
from ml.models.prototype_network import PrototypeNetwork
from ml.models.curx_symptom_net import CURXSymptomNet
from ml.models.symptom_transformer import SymptomTransformer
from ml.losses.metric_loss import HybridLoss


def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


class SymptomDataset(Dataset):
    """
    Dataset for symptom vectors.
    Augmentation is STRICTLY applied ONLY when augment=True (training split).
    """
    def __init__(self, X, y, augment=False, dropout_p=0.15, noise_std=0.0):
        self.X = torch.FloatTensor(X)
        self.y = torch.LongTensor(y)
        self.augment = augment
        self.dropout_p = dropout_p
        self.noise_std = noise_std

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        x = self.X[idx].clone()
        target = self.y[idx]

        if self.augment:
            # Active symptom indices (where x > 0)
            active_idx = torch.nonzero(x > 0, as_tuple=False).squeeze(-1)
            # If at least 3 active symptoms exist, randomly drop 1 with probability dropout_p
            if len(active_idx) >= 3 and random.random() < self.dropout_p:
                drop_which = random.choice(active_idx.tolist())
                x[drop_which] = 0.0

            # Subtle severity noise if enabled
            if self.noise_std > 0:
                noise = torch.randn_like(x) * self.noise_std
                # Only apply noise to active non-zero features
                x[active_idx] = torch.clamp(x[active_idx] + noise[active_idx], min=0.5, max=10.0)

        return x, target


def build_model(model_name, cfg, n_features=133, n_classes=41):
    model_cfg = cfg.get("models", {}).get(model_name, {})
    
    if model_name == "curx_symptom_net":
        return CURXSymptomNet(
            n_features=n_features,
            n_classes=n_classes,
            embed_dim=model_cfg.get("embed_dim", 32),
            hidden_dim=model_cfg.get("hidden_dim", 64),
            num_layers=model_cfg.get("num_layers", 2),
            num_heads=model_cfg.get("num_heads", 2),
            dropout=model_cfg.get("dropout", 0.2),
            init_temp=model_cfg.get("init_temp", 12.0),
            use_prototypes=model_cfg.get("use_prototypes", True),
            use_gating=model_cfg.get("use_gating", True),
            use_attention=model_cfg.get("use_attention", True),
        )
    elif model_name == "residual_mlp":
        return ResidualMLP(
            n_features=n_features,
            n_classes=n_classes,
            hidden_dim=model_cfg.get("hidden_dim", 64),
            num_layers=model_cfg.get("num_layers", 2),
            dropout=model_cfg.get("dropout", 0.2),
            use_gating=model_cfg.get("use_gating", True),
        )
    elif model_name == "deep_sets":
        return DeepSetsSymptomNet(
            n_features=n_features,
            n_classes=n_classes,
            embed_dim=model_cfg.get("embed_dim", 32),
            hidden_dim=model_cfg.get("hidden_dim", 64),
            num_heads=model_cfg.get("num_heads", 2),
            dropout=model_cfg.get("dropout", 0.2),
        )
    elif model_name == "prototype_network":
        return PrototypeNetwork(
            n_features=n_features,
            n_classes=n_classes,
            hidden_dim=model_cfg.get("hidden_dim", 64),
            embed_dim=model_cfg.get("embed_dim", 32),
            dropout=model_cfg.get("dropout", 0.2),
            init_temp=model_cfg.get("init_temp", 10.0),
        )
    elif model_name == "symptom_transformer":
        return SymptomTransformer(
            n_features=n_features,
            n_classes=n_classes,
            hidden_dim=model_cfg.get("hidden_dim", 64),
            num_layers=model_cfg.get("num_layers", 2),
            num_heads=model_cfg.get("num_heads", 4),
            dropout=model_cfg.get("dropout", 0.2),
        )
    else:
        raise ValueError(f"Unknown model name: {model_name}")


def compute_topk_accuracy(logits, targets, ks=(1, 3, 5)):
    max_k = max(ks)
    _, top_indices = logits.topk(max_k, dim=1, largest=True, sorted=True)
    targets_exp = targets.view(-1, 1).expand_as(top_indices)
    correct = top_indices.eq(targets_exp)

    res = {}
    for k in ks:
        correct_k = correct[:, :k].any(dim=1).float().mean().item()
        res[f"top_{k}"] = float(correct_k)
    return res


def train_epoch(model, dataloader, optimizer, criterion, device, grad_clip=1.0):
    model.train()
    total_loss = 0.0
    all_preds = []
    all_targets = []

    for x_batch, y_batch in dataloader:
        x_batch = x_batch.to(device)
        y_batch = y_batch.to(device)

        optimizer.zero_grad()
        out = model(x_batch)
        if isinstance(out, dict):
            logits = out["logits"]
            embeddings = out.get("embeddings", None)
            prototypes = out.get("prototypes", None)
        else:
            logits = out
            embeddings = None
            prototypes = None

        loss, _ = criterion(logits, embeddings, y_batch, prototypes)
        loss.backward()

        if grad_clip > 0:
            nn.utils.clip_grad_norm_(model.parameters(), grad_clip)

        optimizer.step()
        total_loss += loss.item() * len(y_batch)

        preds = logits.argmax(dim=-1).detach().cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(y_batch.cpu().numpy())

    avg_loss = total_loss / len(dataloader.dataset)
    acc = accuracy_score(all_targets, all_preds)
    f1 = f1_score(all_targets, all_preds, average="macro", zero_division=0)
    return avg_loss, acc, f1


@torch.no_grad()
def evaluate_epoch(model, dataloader, criterion, device):
    model.eval()
    total_loss = 0.0
    all_logits = []
    all_targets = []

    for x_batch, y_batch in dataloader:
        x_batch = x_batch.to(device)
        y_batch = y_batch.to(device)

        out = model(x_batch)
        if isinstance(out, dict):
            logits = out["logits"]
            embeddings = out.get("embeddings", None)
            prototypes = out.get("prototypes", None)
        else:
            logits = out
            embeddings = None
            prototypes = None

        loss, _ = criterion(logits, embeddings, y_batch, prototypes)
        total_loss += loss.item() * len(y_batch)

        all_logits.append(logits.cpu())
        all_targets.append(y_batch.cpu())

    all_logits = torch.cat(all_logits, dim=0)
    all_targets = torch.cat(all_targets, dim=0)

    avg_loss = total_loss / len(dataloader.dataset)
    topk = compute_topk_accuracy(all_logits, all_targets, ks=(1, 3, 5))

    preds = all_logits.argmax(dim=-1).numpy()
    targets_np = all_targets.numpy()

    acc = accuracy_score(targets_np, preds)
    macro_f1 = f1_score(targets_np, preds, average="macro", zero_division=0)
    weighted_f1 = f1_score(targets_np, preds, average="weighted", zero_division=0)

    return {
        "val_loss": avg_loss,
        "val_acc": acc,
        "val_top1": topk["top_1"],
        "val_top3": topk["top_3"],
        "val_top5": topk["top_5"],
        "val_macro_f1": macro_f1,
        "val_weighted_f1": weighted_f1,
    }


def run_training(model_name="curx_symptom_net", config_path=None, seed=42,
                 override_cfg=None, verbose=True):
    set_seed(seed)
    
    if config_path is None:
        config_path = PROJECT_ROOT / "ml" / "config" / "dl_config.yaml"
    with open(config_path) as f:
        cfg = yaml.safe_load(f)

    if override_cfg:
        # Merge overrides
        for k, v in override_cfg.items():
            if isinstance(v, dict) and k in cfg:
                cfg[k].update(v)
            else:
                cfg[k] = v

    device = torch.device("cpu")
    data_dir = PROJECT_ROOT / cfg["paths"]["data_dir"]

    X_train = np.load(data_dir / "X_train.npy")
    y_train = np.load(data_dir / "y_train.npy")
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")

    # Only augment training data if enabled
    aug_enabled = cfg["augmentation"].get("enabled", True)
    drop_p = cfg["augmentation"].get("symptom_dropout_p", 0.15) if aug_enabled else 0.0

    train_ds = SymptomDataset(X_train, y_train, augment=aug_enabled, dropout_p=drop_p)
    val_ds = SymptomDataset(X_val, y_val, augment=False)  # NEVER AUGMENT VALIDATION

    batch_size = cfg["training"].get("batch_size", 32)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    n_features = X_train.shape[1]
    n_classes = len(np.unique(np.concatenate([y_train, y_val])))

    model = build_model(model_name, cfg, n_features, n_classes).to(device)
    param_count = sum(p.numel() for p in model.parameters() if p.requires_grad)

    lambda_metric = cfg["loss"].get("lambda_metric", 0.15)
    margin = cfg["loss"].get("margin", 0.15)
    smoothing = cfg["loss"].get("label_smoothing", 0.05)
    criterion = HybridLoss(lambda_metric=lambda_metric, label_smoothing=smoothing, margin=margin)

    lr = float(cfg["training"].get("learning_rate", 1e-3))
    weight_decay = float(cfg["training"].get("weight_decay", 1e-4))
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)

    epochs = cfg["training"].get("epochs", 100)
    patience = cfg["training"].get("patience", 12)
    grad_clip = cfg["training"].get("gradient_clip", 1.0)
    scheduler_type = cfg["training"].get("scheduler", "cosine_with_warmup")

    if scheduler_type == "cosine_with_warmup":
        warmup_epochs = cfg["training"].get("warmup_epochs", 5)
        def lr_lambda(epoch):
            if epoch < warmup_epochs:
                return float(epoch + 1) / float(max(1, warmup_epochs))
            progress = float(epoch - warmup_epochs) / float(max(1, epochs - warmup_epochs))
            return 0.5 * (1.0 + math.cos(math.pi * progress))
        scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    else:
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="max", factor=0.5, patience=5)

    best_val_score = -1.0
    best_metrics = {}
    best_epoch = 0
    patience_counter = 0

    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    best_ckpt_path = ckpt_dir / f"best_{model_name}_seed{seed}.pt"

    history = {
        "train_loss": [], "train_acc": [],
        "val_loss": [], "val_acc": [], "val_top3": [], "val_top5": [], "val_macro_f1": []
    }

    if verbose:
        print(f"\n--- Training {model_name.upper()} (Seed={seed}, Params={param_count:,}) ---")

    for epoch in range(1, epochs + 1):
        train_loss, train_acc, train_f1 = train_epoch(
            model, train_loader, optimizer, criterion, device, grad_clip=grad_clip
        )
        val_res = evaluate_epoch(model, val_loader, criterion, device)

        if scheduler_type == "cosine_with_warmup":
            scheduler.step()
        else:
            scheduler.step(val_res["val_acc"])

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_res["val_loss"])
        history["val_acc"].append(val_res["val_acc"])
        history["val_top3"].append(val_res["val_top3"])
        history["val_top5"].append(val_res["val_top5"])
        history["val_macro_f1"].append(val_res["val_macro_f1"])

        # Early stopping selection metric: balanced combination of top1 + top3
        val_score = val_res["val_acc"] + 0.3 * val_res["val_top3"]

        if val_score > best_val_score:
            best_val_score = val_score
            best_epoch = epoch
            best_metrics = val_res.copy()
            best_metrics["epoch"] = epoch
            patience_counter = 0
            # Save checkpoint
            torch.save({
                "model_name": model_name,
                "epoch": epoch,
                "seed": seed,
                "model_state_dict": model.state_dict(),
                "config": cfg,
                "best_metrics": best_metrics,
                "param_count": param_count
            }, best_ckpt_path)
        else:
            patience_counter += 1
            if patience_counter >= patience:
                if verbose:
                    print(f"Early stopping at epoch {epoch} (Best epoch: {best_epoch})")
                break

    if verbose:
        print(f"  Best Val Top-1: {best_metrics.get('val_acc', 0):.4f} | "
              f"Top-3: {best_metrics.get('val_top3', 0):.4f} | "
              f"Top-5: {best_metrics.get('val_top5', 0):.4f} | "
              f"F1: {best_metrics.get('val_macro_f1', 0):.4f} (Epoch {best_epoch})")

    return {
        "model_name": model_name,
        "seed": seed,
        "param_count": param_count,
        "best_epoch": best_epoch,
        "best_metrics": best_metrics,
        "best_ckpt_path": str(best_ckpt_path),
        "history": history
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="curx_symptom_net")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    run_training(model_name=args.model, seed=args.seed)
