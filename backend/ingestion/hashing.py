import hashlib
import os

def compute_file_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file for change detection."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()
