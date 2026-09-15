"""
CURX Primary Architecture: CURXSymptomNet
A hybrid deep-learning architecture engineered specifically for sparse tabular medical symptom sets.

Pipeline:
1. Gated Symptom Feature Projection & Learnable Importance
2. Permutation-Invariant Set-Attention Aggregation over Active Symptoms
3. Compact Residual MLP Latent Representation Blocks
4. 41 Disease Prototype Embeddings in Latent Metric Space
5. Temperature-Scaled Cosine Similarity + Learned Linear Bias Head
6. Post-Hoc Calibrated Softmax
"""
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class GatedSymptomEmbedding(nn.Module):
    """
    Learned symptom feature gating and embedding.
    Ensures inactive symptoms (x_i = 0) do not pollute latent state,
    while learning relative importance weights across active symptoms.
    """
    def __init__(self, n_features, embed_dim, dropout=0.15):
        super().__init__()
        self.n_features = n_features
        self.embed_dim = embed_dim

        # Learnable symptom identity embedding table: (133, embed_dim)
        self.symptom_embeddings = nn.Parameter(torch.randn(n_features, embed_dim) * 0.02)
        # Severity modulation scale
        self.severity_proj = nn.Linear(1, embed_dim)
        
        # Feature gate: learnable importance mask g_i in [0, 1]
        self.gate = nn.Sequential(
            nn.Linear(n_features, n_features),
            nn.Sigmoid()
        )
        self.drop = nn.Dropout(dropout)

    def forward(self, x):
        """
        Args:
            x: (batch, n_features) severity-weighted input vector
        Returns:
            gated_tokens: (batch, n_features, embed_dim)
            active_mask: (batch, n_features) bool mask (True where inactive)
            gate_weights: (batch, n_features)
        """
        batch_size = x.size(0)
        
        # Learned feature gating
        g = self.gate(x)
        x_gated = x * g  # (batch, n_features)

        # Expand per-symptom embeddings
        # sym_emb: (batch, n_features, embed_dim)
        sym_emb = self.symptom_embeddings.unsqueeze(0).expand(batch_size, -1, -1)
        # sev_emb: (batch, n_features, embed_dim)
        sev_emb = self.severity_proj(x_gated.unsqueeze(-1))

        tokens = self.drop(sym_emb + sev_emb)

        # Inactive symptom mask (where raw input is 0)
        is_zero = (x <= 1e-6)
        all_zero = is_zero.all(dim=-1, keepdim=True)
        active_mask = is_zero & (~all_zero)

        return tokens, active_mask, g


class SetAttentionReadout(nn.Module):
    """
    Permutation-invariant multi-head attention readout over active symptoms.
    Uses learned queries to pool relevant symptom features without positional bias.
    """
    def __init__(self, embed_dim, hidden_dim, num_heads=2, dropout=0.15):
        super().__init__()
        self.query = nn.Parameter(torch.randn(1, 1, hidden_dim) * 0.02)
        self.token_proj = nn.Linear(embed_dim, hidden_dim)
        self.attn = nn.MultiheadAttention(hidden_dim, num_heads=num_heads, dropout=dropout, batch_first=True)
        self.norm = nn.LayerNorm(hidden_dim)

    def forward(self, tokens, active_mask=None):
        """
        Args:
            tokens: (batch, n_features, embed_dim)
            active_mask: (batch, n_features) bool mask (True for padding/inactive)
        Returns:
            pooled: (batch, hidden_dim)
            attn_weights: (batch, n_features)
        """
        batch_size = tokens.size(0)
        h_tokens = self.token_proj(tokens)  # (batch, n_features, hidden_dim)
        q = self.query.expand(batch_size, -1, -1)

        # Query attends across all active symptom tokens
        attn_out, weights = self.attn(q, h_tokens, h_tokens, key_padding_mask=active_mask)
        pooled = self.norm(attn_out.squeeze(1))
        return pooled, weights.squeeze(1)


class ResidualBlock(nn.Module):
    """Pre-LayerNorm Residual Block."""
    def __init__(self, dim, dropout=0.2):
        super().__init__()
        self.norm = nn.LayerNorm(dim)
        self.fc1 = nn.Linear(dim, dim * 2)
        self.act = nn.GELU()
        self.drop = nn.Dropout(dropout)
        self.fc2 = nn.Linear(dim * 2, dim)

    def forward(self, x):
        h = self.norm(x)
        h = self.fc1(h)
        h = self.act(h)
        h = self.drop(h)
        h = self.fc2(h)
        h = self.drop(h)
        return x + h


class CURXSymptomNet(nn.Module):
    """
    Primary Architecture: CURXSymptomNet
    Combines feature gating, set attention, residual representation blocks,
    and learnable disease prototypes with cosine metric classification.
    """
    def __init__(self, n_features=133, n_classes=41, embed_dim=48,
                 hidden_dim=96, num_layers=2, num_heads=2, dropout=0.2,
                 init_temp=12.0, use_prototypes=True, use_gating=True,
                 use_attention=True):
        super().__init__()
        self.n_features = n_features
        self.n_classes = n_classes
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        self.use_prototypes = use_prototypes
        self.use_gating = use_gating
        self.use_attention = use_attention

        # 1. Gated Symptom Embeddings
        self.gating_embed = GatedSymptomEmbedding(n_features, embed_dim, dropout=dropout)

        # Fallback linear projection if attention disabled
        if not use_attention:
            self.flat_proj = nn.Linear(n_features, hidden_dim)

        # 2. Set-Attention Readout
        self.readout = SetAttentionReadout(embed_dim, hidden_dim, num_heads=num_heads, dropout=dropout)

        # 3. Residual Representation Blocks
        self.res_blocks = nn.ModuleList([
            ResidualBlock(hidden_dim, dropout=dropout)
            for _ in range(num_layers)
        ])
        self.latent_norm = nn.LayerNorm(hidden_dim)

        # 4. Disease Prototype Embeddings (41 learnable class centroids)
        if use_prototypes:
            self.prototypes = nn.Parameter(torch.randn(n_classes, hidden_dim) * 0.05)
            # Learned temperature parameter for cosine similarity scaling
            self.log_scale = nn.Parameter(torch.tensor([math.log(init_temp)]))
            # Optional linear residual bias
            self.class_bias = nn.Parameter(torch.zeros(n_classes))
        else:
            self.prototypes = None
            self.classifier = nn.Linear(hidden_dim, n_classes)

        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    @property
    def scale(self):
        if self.use_prototypes:
            return torch.clamp(torch.exp(self.log_scale), min=1.0, max=50.0)
        return torch.tensor(1.0)

    def encode(self, x):
        """
        Encode symptom vector into latent patient representation.
        """
        if self.use_gating:
            tokens, mask, gates = self.gating_embed(x)
        else:
            # Without gating
            tokens, mask, gates = self.gating_embed(x)
            gates = torch.ones_like(x)

        if self.use_attention:
            pooled, attn_weights = self.readout(tokens, active_mask=mask)
        else:
            pooled = self.flat_proj(x)
            attn_weights = None

        # Residual representation flow
        h = pooled
        for block in self.res_blocks:
            h = block(h)
        z = self.latent_norm(h)

        return z, attn_weights, gates

    def forward(self, x):
        """
        Args:
            x: (batch, n_features)
        Returns:
            dict containing logits, embeddings, prototypes, attention weights, and gates
        """
        z, attn_weights, gates = self.encode(x)

        if self.use_prototypes:
            # Normalize patient embedding and class prototypes
            z_norm = F.normalize(z, p=2, dim=-1)
            p_norm = F.normalize(self.prototypes, p=2, dim=-1)

            # Cosine similarity matrix: (batch, n_classes)
            cos_sim = torch.matmul(z_norm, p_norm.t())
            
            # Scaled cosine logits + learned class bias
            logits = self.scale * cos_sim + self.class_bias
            similarities = cos_sim
        else:
            logits = self.classifier(z)
            similarities = None

        return {
            "logits": logits,
            "embeddings": z,
            "prototypes": self.prototypes,
            "similarities": similarities,
            "attn_weights": attn_weights,
            "gates": gates,
            "scale": float(self.scale.item()) if self.use_prototypes else 1.0
        }
