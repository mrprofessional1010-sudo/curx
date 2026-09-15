"""
CURX Architecture C: Prototype / Metric-Learning Classifier
Maps symptom vectors into latent metric space and classifies via cosine similarity
to 41 learnable disease class prototypes with learned temperature scaling.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class PrototypeNetwork(nn.Module):
    """
    Metric-learning classifier with learnable disease prototypes.
    """
    def __init__(self, n_features=133, n_classes=41, hidden_dim=64,
                 embed_dim=48, dropout=0.2, init_temp=10.0):
        super().__init__()
        self.n_features = n_features
        self.n_classes = n_classes
        self.embed_dim = embed_dim

        # Encoder: Symptom vector -> Latent embedding
        self.encoder = nn.Sequential(
            nn.Linear(n_features, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, embed_dim),
            nn.LayerNorm(embed_dim)
        )

        # 41 learnable class prototype embeddings
        self.prototypes = nn.Parameter(torch.randn(n_classes, embed_dim) * 0.05)
        
        # Learnable log-temperature parameter for scaling cosine similarity into logits
        self.log_scale = nn.Parameter(torch.tensor([torch.log(torch.tensor(init_temp))]))

    @property
    def scale(self):
        return torch.clamp(torch.exp(self.log_scale), min=1.0, max=50.0)

    def forward(self, x):
        """
        Args:
            x: (batch, n_features)
        Returns:
            dict with 'logits', 'embeddings', 'prototypes', 'similarities'
        """
        # Latent representation: (batch, embed_dim)
        z = self.encoder(x)
        
        # Normalize embeddings and prototypes onto unit sphere
        z_norm = F.normalize(z, p=2, dim=-1)
        p_norm = F.normalize(self.prototypes, p=2, dim=-1)

        # Cosine similarity: (batch, n_classes)
        cosine_sim = torch.matmul(z_norm, p_norm.t())

        # Scaled cosine logits: z_k = tau * cos(theta_k)
        logits = self.scale * cosine_sim

        return {
            "logits": logits,
            "embeddings": z,
            "prototypes": self.prototypes,
            "similarities": cosine_sim,
            "scale": float(self.scale.item())
        }
