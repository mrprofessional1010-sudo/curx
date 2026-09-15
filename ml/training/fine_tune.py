"""
CURX ML Fine-Tuning Script
Lower learning rate fine-tuning from best checkpoint with selective layer freezing.
"""
import sys
import json
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
from ml.models.symptom_transformer import SymptomTransformer
from ml.training.train import set_seed, get_device, validate, train_one_epoch


def fine_tune(checkpoint_path=None, config_path=None):
    cfg_path = config_path or PROJECT_ROOT / "ml" / "config" / "config.yaml"
    with open(cfg_path) as f:
        cfg = yaml.safe_load(f)

    ft_cfg = cfg["fine_tuning"]
    seed = cfg["seed"]
    set_seed(seed)

    device = get_device()

    # Load data
    data_dir = PROJECT_ROOT / "ml" / "data" / "processed"
    X_train = np.load(data_dir / "X_train.npy")
    y_train = np.load(data_dir / "y_train.npy")
    X_val = np.load(data_dir / "X_val.npy")
    y_val = np.load(data_dir / "y_val.npy")
    class_weights = np.load(data_dir / "class_weights.npy")
    with open(data_dir / "metadata.json") as f:
        metadata = json.load(f)

    # Load best model checkpoint
    if checkpoint_path is None:
        checkpoint_path = PROJECT_ROOT / cfg["paths"]["checkpoints"] / "best_model.pt"
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model_cfg = ckpt["config"]["model"]

    model = SymptomTransformer(
        n_features=metadata["n_features"],
        n_classes=metadata["n_classes"],
        hidden_dim=model_cfg["hidden_dim"],
        num_layers=model_cfg["num_layers"],
        num_heads=model_cfg["num_heads"],
        dropout=model_cfg["dropout"],
    ).to(device)
    model.load_state_dict(ckpt["model_state_dict"])

    print("=" * 60)
    print(f"CURX FINE-TUNING (from epoch {ckpt['epoch']}, val_acc={ckpt['val_acc']:.4f})")
    print("=" * 60)

    # Freeze embedding layers initially
    if ft_cfg["freeze_embeddings"]:
        for name, param in model.embedding.named_parameters():
            param.requires_grad = False
        print("  Embedding layers FROZEN")

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"  Trainable params: {trainable:,} / {total:,}")

    # Create dataloaders
    batch_size = cfg["training"]["batch_size"]
    train_ds = TensorDataset(torch.FloatTensor(X_train).to(device), torch.LongTensor(y_train).to(device))
    val_ds = TensorDataset(torch.FloatTensor(X_val).to(device), torch.LongTensor(y_val).to(device))
    train_dl = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    val_dl = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

    # Loss and optimizer
    weight_tensor = torch.FloatTensor(class_weights).to(device)
    criterion = nn.CrossEntropyLoss(weight=weight_tensor)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()),
                            lr=ft_cfg["learning_rate"], weight_decay=cfg["training"]["weight_decay"])

    best_val_acc = ckpt["val_acc"]
    patience_counter = 0
    patience = ft_cfg["patience"]
    ckpt_dir = PROJECT_ROOT / cfg["paths"]["checkpoints"]

    print(f"\n{'Epoch':>5} {'Train Loss':>12} {'Train Acc':>10} {'Val Loss':>12} {'Val Acc':>10}")
    print("-" * 50)

    for epoch in range(1, ft_cfg["epochs"] + 1):
        # Unfreeze embeddings after N epochs
        if epoch == ft_cfg.get("unfreeze_after_epoch", 999):
            for param in model.embedding.parameters():
                param.requires_grad = True
            # Rebuild optimizer with all params
            optimizer = optim.AdamW(model.parameters(), lr=ft_cfg["learning_rate"] * 0.1,
                                    weight_decay=cfg["training"]["weight_decay"])
            print(f"  [Epoch {epoch}] Embeddings UNFROZEN, LR reduced to {ft_cfg['learning_rate'] * 0.1}")

        train_loss, train_acc = train_one_epoch(model, train_dl, criterion, optimizer,
                                                 cfg["training"]["gradient_clip_norm"])
        val_loss, val_acc, _, _, _ = validate(model, val_dl, criterion)

        improved = ""
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            patience_counter = 0
            improved = " ★"
            torch.save({
                "epoch": ckpt["epoch"] + epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_acc": val_acc,
                "val_loss": val_loss,
                "config": cfg,
                "seed": seed,
                "model_type": "transformer",
                "fine_tuned": True,
            }, ckpt_dir / "best_model_finetuned.pt")
        else:
            patience_counter += 1

        print(f"{epoch:>5d} {train_loss:>12.4f} {train_acc:>10.4f} {val_loss:>12.4f} {val_acc:>10.4f}{improved}")

        if patience_counter >= patience:
            print(f"\n[Early Stopping] No improvement for {patience} epochs.")
            break

    print(f"\n  Best fine-tuned val accuracy: {best_val_acc:.4f}")
    print(f"  Saved: {ckpt_dir / 'best_model_finetuned.pt'}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, default=None)
    args = parser.parse_args()
    fine_tune(checkpoint_path=args.checkpoint)
