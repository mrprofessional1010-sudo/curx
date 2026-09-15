"""
CURX Symptom Transformer — Deep Learning Model for Disease Classification
A lightweight tabular transformer sized for ~304 unique samples across 41 classes.
"""
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class FeatureEmbedding(nn.Module):
    """Embed each symptom feature into a dense vector."""
    def __init__(self, n_features, embed_dim):
        super().__init__()
        self.embed_dim = embed_dim
        # Learned embedding per feature position
        self.weight_embed = nn.Linear(1, embed_dim)
        # Positional encoding for feature order
        self.pos_embed = nn.Parameter(torch.randn(1, n_features, embed_dim) * 0.02)

    def forward(self, x):
        # x: (batch, n_features) — each value is 0 or severity weight
        batch_size, n_features = x.shape
        # Expand to (batch, n_features, 1) then embed to (batch, n_features, embed_dim)
        x = x.unsqueeze(-1)
        x = self.weight_embed(x)
        x = x + self.pos_embed[:, :n_features, :]
        return x


class TransformerBlock(nn.Module):
    """Standard transformer encoder block with pre-norm."""
    def __init__(self, dim, num_heads, dropout=0.1, ff_mult=4):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, dropout=dropout, batch_first=True)
        self.norm2 = nn.LayerNorm(dim)
        self.ff = nn.Sequential(
            nn.Linear(dim, dim * ff_mult),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim * ff_mult, dim),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        # Pre-norm attention
        h = self.norm1(x)
        h, _ = self.attn(h, h, h)
        x = x + h
        # Pre-norm feedforward
        h = self.norm2(x)
        h = self.ff(h)
        x = x + h
        return x


class SymptomTransformer(nn.Module):
    """
    Tabular Transformer for disease classification from symptom vectors.

    Architecture:
        133 symptom features (binary or severity-weighted)
        → Feature Embedding (133 → hidden_dim per feature)
        → N × Transformer Encoder Blocks
        → LayerNorm + Global Average Pooling
        → Dropout
        → Linear classification head → 41 classes
    """
    def __init__(self, n_features=133, n_classes=41, hidden_dim=64,
                 num_layers=2, num_heads=4, dropout=0.2):
        super().__init__()
        self.n_features = n_features
        self.n_classes = n_classes

        # Feature embedding
        self.embedding = FeatureEmbedding(n_features, hidden_dim)

        # Transformer blocks
        self.blocks = nn.ModuleList([
            TransformerBlock(hidden_dim, num_heads, dropout)
            for _ in range(num_layers)
        ])

        # Classification head
        self.norm = nn.LayerNorm(hidden_dim)
        self.dropout = nn.Dropout(dropout)
        self.head = nn.Linear(hidden_dim, n_classes)

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(self, x):
        """
        Args:
            x: (batch, n_features) float tensor — symptom vector
        Returns:
            logits: (batch, n_classes) raw logits
        """
        # Embed features: (batch, n_features) → (batch, n_features, hidden_dim)
        x = self.embedding(x)

        # Transformer blocks
        for block in self.blocks:
            x = block(x)

        # Global average pooling: (batch, n_features, hidden_dim) → (batch, hidden_dim)
        x = self.norm(x)
        x = x.mean(dim=1)

        # Classification
        x = self.dropout(x)
        logits = self.head(x)
        return logits

    def predict_proba(self, x):
        """Return calibrated probabilities."""
        logits = self.forward(x)
        return F.softmax(logits, dim=-1)

    def count_parameters(self):
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


class MLPBaseline(nn.Module):
    """Simple MLP baseline for comparison."""
    def __init__(self, n_features=133, n_classes=41, hidden_dims=(128, 64), dropout=0.3):
        super().__init__()
        layers = []
        in_dim = n_features
        for h_dim in hidden_dims:
            layers.extend([
                nn.Linear(in_dim, h_dim),
                nn.BatchNorm1d(h_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
            ])
            in_dim = h_dim
        layers.append(nn.Linear(in_dim, n_classes))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)

    def predict_proba(self, x):
        return F.softmax(self.forward(x), dim=-1)

    def count_parameters(self):
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
