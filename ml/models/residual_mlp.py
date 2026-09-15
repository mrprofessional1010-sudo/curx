"""
CURX Architecture A: Compact Residual MLP
Features gated input projections and residual blocks with LayerNorm and GELU.
Designed for high sample efficiency on sparse tabular medical symptoms.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class ResidualBlock(nn.Module):
    """Residual Block with Pre-LayerNorm, GELU, and Dropout."""
    def __init__(self, dim, dropout=0.2):
        super().__init__()
        self.norm = nn.LayerNorm(dim)
        self.fc1 = nn.Linear(dim, dim)
        self.act = nn.GELU()
        self.drop = nn.Dropout(dropout)
        self.fc2 = nn.Linear(dim, dim)

    def forward(self, x):
        residual = x
        h = self.norm(x)
        h = self.fc1(h)
        h = self.act(h)
        h = self.drop(h)
        h = self.fc2(h)
        h = self.drop(h)
        return residual + h


class ResidualMLP(nn.Module):
    """
    Compact Residual MLP for tabular symptom vectors.
    """
    def __init__(self, n_features=133, n_classes=41, hidden_dim=64,
                 num_layers=2, dropout=0.2, use_gating=True):
        super().__init__()
        self.n_features = n_features
        self.n_classes = n_classes
        self.use_gating = use_gating

        if use_gating:
            self.gate = nn.Sequential(
                nn.Linear(n_features, n_features),
                nn.Sigmoid()
            )

        self.input_proj = nn.Sequential(
            nn.Linear(n_features, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout)
        )

        self.blocks = nn.ModuleList([
            ResidualBlock(hidden_dim, dropout=dropout)
            for _ in range(num_layers)
        ])

        self.final_norm = nn.LayerNorm(hidden_dim)
        self.classifier = nn.Linear(hidden_dim, n_classes)

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.0)

    def forward(self, x):
        """
        Args:
            x: (batch, n_features)
        Returns:
            dict with 'logits', 'embeddings', and optional 'gates'
        """
        if self.use_gating:
            gates = self.gate(x)
            x_gated = x * gates
        else:
            gates = None
            x_gated = x

        h = self.input_proj(x_gated)
        for block in self.blocks:
            h = block(h)

        embeddings = self.final_norm(h)
        logits = self.classifier(embeddings)

        return {
            "logits": logits,
            "embeddings": embeddings,
            "gates": gates
        }
