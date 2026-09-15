"""
CURX Architecture B: Deep Sets / Set Encoder for Symptoms
Treats reported symptoms as an unordered set with permutation-invariant aggregation.
Only active symptoms contribute to the set representation, completely eliminating inactive zero dilution.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class AttentionPooling(nn.Module):
    """
    Attention-based set readout (learned query attending over active set elements).
    Permutation-invariant: order of elements in set does not affect output.
    """
    def __init__(self, dim, num_heads=2):
        super().__init__()
        self.num_heads = num_heads
        self.dim = dim
        self.query = nn.Parameter(torch.randn(1, 1, dim) * 0.02)
        self.attn = nn.MultiheadAttention(dim, num_heads=num_heads, batch_first=True)

    def forward(self, elements, mask=None):
        """
        Args:
            elements: (batch, set_size, dim)
            mask: (batch, set_size) bool tensor where True means ignored/padded
        Returns:
            pooled: (batch, dim)
        """
        batch_size = elements.size(0)
        q = self.query.expand(batch_size, -1, -1)
        # Multi-head attention where 1 learned query attends over all set elements
        out, attn_weights = self.attn(q, elements, elements, key_padding_mask=mask)
        return out.squeeze(1), attn_weights.squeeze(1)


class DeepSetsSymptomNet(nn.Module):
    """
    Deep Sets Network for tabular/set symptoms.
    Maps active symptoms through an element-wise encoder phi,
    aggregates via attention pooling, and decodes via rho.
    """
    def __init__(self, n_features=133, n_classes=41, embed_dim=48,
                 hidden_dim=64, num_heads=2, dropout=0.2):
        super().__init__()
        self.n_features = n_features
        self.n_classes = n_classes
        self.embed_dim = embed_dim

        # Per-symptom learnable identity embedding
        self.symptom_embed = nn.Embedding(n_features, embed_dim)
        # Severity projection
        self.val_proj = nn.Linear(1, embed_dim)

        # Element-wise encoder phi
        self.phi = nn.Sequential(
            nn.Linear(embed_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
        )

        # Set aggregator
        self.pool = AttentionPooling(hidden_dim, num_heads=num_heads)

        # Set-level decoder rho
        self.rho = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
        )

        self.classifier = nn.Linear(hidden_dim, n_classes)

    def forward(self, x):
        """
        Args:
            x: (batch, n_features) - severity-weighted symptom vector
        """
        batch_size = x.size(0)
        device = x.device

        # Dense-to-sparse set conversion or masked attention
        # Shape: (133,) indices
        indices = torch.arange(self.n_features, device=device).unsqueeze(0).expand(batch_size, -1)
        
        # Sym embeds: (batch, 133, embed_dim)
        sym_emb = self.symptom_embed(indices)
        val_emb = self.val_proj(x.unsqueeze(-1))
        
        # Element representation: symptom identity + severity modulation
        elem_tokens = sym_emb + val_emb
        elem_h = self.phi(elem_tokens)

        # Mask: True for inactive symptoms (where x <= 0)
        # If all symptoms are zero for a row, don't mask everything to avoid NaN
        is_zero = (x <= 0)
        all_zero = is_zero.all(dim=-1, keepdim=True)
        mask = is_zero & (~all_zero)

        # Pool over active symptoms
        pooled, attn_weights = self.pool(elem_h, mask=mask)
        embeddings = self.rho(pooled)
        logits = self.classifier(embeddings)

        return {
            "logits": logits,
            "embeddings": embeddings,
            "attn_weights": attn_weights
        }
