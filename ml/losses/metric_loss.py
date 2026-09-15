"""
CURX ML Metric and Prototype Loss Functions
Supports hybrid prototype-metric learning with cross-entropy for disease classification.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class PrototypeSeparationLoss(nn.Module):
    """
    Penalizes prototypes for being too close to each other in cosine space
    (encourages maximum angular separation across the 41 disease classes).
    """
    def __init__(self, margin=0.1):
        super().__init__()
        self.margin = margin

    def forward(self, prototypes):
        """
        Args:
            prototypes: (n_classes, embed_dim)
        """
        # Normalize prototypes to unit sphere
        norm_prototypes = F.normalize(prototypes, p=2, dim=-1)
        # Pairwise cosine similarity matrix: (n_classes, n_classes)
        sim_matrix = torch.matmul(norm_prototypes, norm_prototypes.t())
        
        # Mask out diagonal (self-similarity = 1)
        n_classes = prototypes.size(0)
        mask = torch.eye(n_classes, dtype=torch.bool, device=prototypes.device)
        off_diag_sim = sim_matrix.masked_select(~mask)
        
        # Penalize positive similarity above margin
        # Ideally, distinct prototypes should have low or negative cosine similarity
        separation_loss = torch.clamp(off_diag_sim - self.margin, min=0.0).pow(2).mean()
        return separation_loss


class PrototypeCompactnessLoss(nn.Module):
    """
    Penalizes sample embeddings for deviating from their ground-truth class prototype.
    """
    def __init__(self):
        super().__init__()

    def forward(self, embeddings, targets, prototypes):
        """
        Args:
            embeddings: (batch_size, embed_dim)
            targets: (batch_size,) long tensor of class indices
            prototypes: (n_classes, embed_dim)
        """
        norm_emb = F.normalize(embeddings, p=2, dim=-1)
        norm_proto = F.normalize(prototypes, p=2, dim=-1)
        
        target_protos = norm_proto[targets]  # (batch_size, embed_dim)
        # Cosine distance: 1 - cos(theta)
        cos_sim = torch.sum(norm_emb * target_protos, dim=-1)
        compactness_loss = (1.0 - cos_sim).mean()
        return compactness_loss


class HybridLoss(nn.Module):
    """
    Hybrid Cross-Entropy + Metric Prototype Loss.
    L_total = L_ce + lambda_metric * (L_compactness + lambda_sep * L_separation)
    """
    def __init__(self, lambda_metric=0.1, label_smoothing=0.05, margin=0.15):
        super().__init__()
        self.lambda_metric = lambda_metric
        self.label_smoothing = label_smoothing
        self.ce_loss = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        self.compactness_loss = PrototypeCompactnessLoss()
        self.separation_loss = PrototypeSeparationLoss(margin=margin)

    def forward(self, logits, embeddings, targets, prototypes=None):
        """
        Args:
            logits: (batch_size, n_classes)
            embeddings: (batch_size, embed_dim)
            targets: (batch_size,) long tensor
            prototypes: (n_classes, embed_dim) optional
        """
        loss_ce = self.ce_loss(logits, targets)
        
        if prototypes is not None and self.lambda_metric > 0:
            loss_comp = self.compactness_loss(embeddings, targets, prototypes)
            loss_sep = self.separation_loss(prototypes)
            loss_metric = loss_comp + 0.5 * loss_sep
            total_loss = loss_ce + self.lambda_metric * loss_metric
            return total_loss, {
                "loss_total": float(total_loss.item()),
                "loss_ce": float(loss_ce.item()),
                "loss_metric": float(loss_metric.item()),
                "loss_compactness": float(loss_comp.item()),
                "loss_separation": float(loss_sep.item()),
            }
        else:
            return loss_ce, {
                "loss_total": float(loss_ce.item()),
                "loss_ce": float(loss_ce.item()),
                "loss_metric": 0.0,
            }
