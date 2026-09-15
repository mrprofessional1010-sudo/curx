"""
CURX Deep Learning Training Script
Trains the SymptomTransformer with early stopping, checkpointing,
LR scheduling, and full reproducibility.
"""
import os
import sys
import json
import time
import argparse
import numpy as np
import yaml
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
from ml.models.symptom_transformer import SymptomTransformer, MLPBaseline


def set_seed(seed):
    """Set all random seeds for reproducibility."""
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def get_device():
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"  Device: CUDA ({torch.cuda.get_device_name(0)})")
        print(f"  Memory: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        print("  Device: Apple MPS")
    else:
        device = torch.device("cpu")
        print("  Device: CPU")
    return device


def load_config(config_path=None):
    if config_path is None:
        config_path = PROJECT_ROOT / "ml" / "config" / "config.yaml"
    with open(config_path) as f:
        return yaml.safe_load(f)


def load_data():
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    X_train = np.load(data_dir / "X_train.npy")
    y_train = np.load(data_dir / "y_train.npy")
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")
    class_weights = np.load(data_dir / "class_weights.npy")
    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)
    return X_train, y_train, X_val, y_val, class_weights, metadata


def create_dataloaders(X_train, y_train, X_val, y_val, batch_size, device):
    """Create PyTorch DataLoaders."""
    train_ds = TensorDataset(
        torch.FloatTensor(X_train).to(device),
        torch.LongTensor(y_train).to(device)
    )
    val_ds = TensorDataset(
        torch.FloatTensor(X_val).to(device),
        torch.LongTensor(y_val).to(device)
    )
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True, drop_last=False)
    val_dl = DataLoader(val_ds, batch_size=batch_size, shuffle=False)
    return train_dl, val_dl


def train_one_epoch(model, train_dl, criterion, optimizer, grad_clip):
    """Train for one epoch, return average loss and accuracy."""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0

    for X_batch, y_batch in train_dl:
        optimizer.zero_grad()
        logits = model(X_batch)
        loss = criterion(logits, y_batch)
        loss.backward()

        if grad_clip > 0:
            nn.utils.clip_grad_norm_(model.parameters(), grad_clip)

        optimizer.step()

        total_loss += loss.item() * X_batch.size(0)
        preds = logits.argmax(dim=-1)
        correct += (preds == y_batch).sum().item()
        total += X_batch.size(0)

    return total_loss / total, correct / total


@torch.no_grad()
def validate(model, val_dl, criterion):
    """Validate and return loss, accuracy, all predictions."""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_targets = []
    all_logits = []

    for X_batch, y_batch in val_dl:
        logits = model(X_batch)
        loss = criterion(logits, y_batch)

        total_loss += loss.item() * X_batch.size(0)
        preds = logits.argmax(dim=-1)
        correct += (preds == y_batch).sum().item()
        total += X_batch.size(0)
        all_preds.extend(preds.cpu().numpy())
        all_targets.extend(y_batch.cpu().numpy())
        all_logits.append(logits.cpu().numpy())

    all_logits = np.concatenate(all_logits)
    return total_loss / total, correct / total, np.array(all_preds), np.array(all_targets), all_logits


def train(config_path=None, seed=None, model_type="transformer"):
    """Full training loop with early stopping and checkpointing."""
    cfg = load_config(config_path)
    if seed is None:
        seed = cfg["seed"]
    set_seed(seed)

    print("=" * 60)
    print(f"CURX DEEP LEARNING TRAINING (seed={seed})")
    print("=" * 60)

    # Device
    device = get_device()

    # Load data
    X_train, y_train, X_val, y_val, class_weights, metadata = load_data()
    n_features = metadata["n_features"]
    n_classes = metadata["n_classes"]

    train_cfg = cfg["training"]
    model_cfg = cfg["model"]

    print(f"  Train: {len(X_train)} | Val: {len(X_val)}")
    print(f"  Features: {n_features} | Classes: {n_classes}")
    print(f"  Batch size: {train_cfg['batch_size']}")
    print(f"  LR: {train_cfg['learning_rate']} | Epochs: {train_cfg['epochs']}")

    # Create dataloaders
    train_dl, val_dl = create_dataloaders(
        X_train, y_train, X_val, y_val, train_cfg["batch_size"], device
    )

    # Create model
    if model_type == "transformer":
        model = SymptomTransformer(
            n_features=n_features,
            n_classes=n_classes,
            hidden_dim=model_cfg["hidden_dim"],
            num_layers=model_cfg["num_layers"],
            num_heads=model_cfg["num_heads"],
            dropout=model_cfg["dropout"],
        ).to(device)
    else:
        model = MLPBaseline(
            n_features=n_features,
            n_classes=n_classes,
            dropout=model_cfg["dropout"],
        ).to(device)

    print(f"  Model: {model_type} | Parameters: {model.count_parameters():,}")

    # Loss with class weights and label smoothing
    weight_tensor = torch.FloatTensor(class_weights).to(device)
    label_smoothing = train_cfg.get("label_smoothing", 0.0)
    criterion = nn.CrossEntropyLoss(weight=weight_tensor, label_smoothing=label_smoothing)

    # Optimizer
    optimizer = optim.AdamW(
        model.parameters(),
        lr=train_cfg["learning_rate"],
        weight_decay=train_cfg["weight_decay"],
    )

    # Scheduler
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=train_cfg["epochs"], eta_min=1e-6
    )

    # Checkpoint directory
    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    # Training loop
    best_val_acc = 0.0
    best_val_loss = float("inf")
    best_epoch = 0
    patience_counter = 0
    patience = train_cfg["early_stopping_patience"]
    history = {"train_loss": [], "train_acc": [], "val_loss": [], "val_acc": [], "lr": []}

    print(f"\n{'Epoch':>5} {'Train Loss':>12} {'Train Acc':>10} {'Val Loss':>12} {'Val Acc':>10} {'LR':>12}")
    print("-" * 62)

    for epoch in range(1, train_cfg["epochs"] + 1):
        t0 = time.time()
        train_loss, train_acc = train_one_epoch(
            model, train_dl, criterion, optimizer, train_cfg["gradient_clip_norm"]
        )
        val_loss, val_acc, val_preds, val_targets, val_logits = validate(model, val_dl, criterion)
        scheduler.step()

        current_lr = optimizer.param_groups[0]["lr"]
        history["train_loss"].append(float(train_loss))
        history["train_acc"].append(float(train_acc))
        history["val_loss"].append(float(val_loss))
        history["val_acc"].append(float(val_acc))
        history["lr"].append(float(current_lr))

        improved = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_val_loss = val_loss
            best_epoch = epoch
            patience_counter = 0
            improved = " ★"
            # Save best model
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
                "config": cfg,
                "seed": seed,
                "model_type": model_type,
            }, ckpt_dir / "best_model.pt")
        else:
            patience_counter += 1

        elapsed = time.time() - t0
        print(f"{epoch:>5d} {train_loss:>12.4f} {train_acc:>10.4f} {val_loss:>12.4f} {val_acc:>10.4f} {current_lr:>12.6f}{improved}")

        # Early stopping
        if patience_counter >= patience:
            print(f"\n[Early Stopping] No improvement for {patience} epochs. Stopping at epoch {epoch}.")
            break

    # Save last model
    torch.save({
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "val_acc": val_acc,
        "val_loss": val_loss,
        "config": cfg,
        "seed": seed,
        "model_type": model_type,
    }, ckpt_dir / "last_model.pt")

    # Save training history
    history["best_epoch"] = best_epoch
    history["best_val_acc"] = float(best_val_acc)
    history["best_val_loss"] = float(best_val_loss)
    history["total_epochs"] = epoch
    history["seed"] = seed
    history["model_type"] = model_type
    history["parameters"] = model.count_parameters()

    report_dir = PROJECT_ROOT / cfg["paths"]["reports"]
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    print(f"\n{'=' * 60}")
    print("TRAINING COMPLETE")
    print(f"{'=' * 60}")
    print(f"  Best Epoch: {best_epoch}")
    print(f"  Best Val Accuracy: {best_val_acc:.4f}")
    print(f"  Best Val Loss: {best_val_loss:.4f}")
    print(f"  Total Epochs: {epoch}")
    print(f"  Model saved: {ckpt_dir / 'best_model.pt'}")

    return history


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CURX DL Training")
    parser.add_argument("--config", type=str, default=None, help="Path to config YAML")
    parser.add_argument("--seed", type=int, default=None, help="Random seed")
    parser.add_argument("--model", type=str, default="transformer", choices=["transformer", "mlp"])
    args = parser.parse_args()
    train(config_path=args.config, seed=args.seed, model_type=args.model)
