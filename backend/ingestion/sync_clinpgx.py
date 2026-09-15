"""
ClinPGx Live API Synchronization Module for CURX
=================================================
Synchronizes verified pharmacogenomic guidelines, annotations, and gene-drug relationships
from the official ClinPGx Live REST API (https://api.clinpgx.org/v1) into CURX's Supabase database.

Authentication & Protocol Details:
- Official Hostname: https://api.clinpgx.org/v1
- Access Protocol: Open Public REST API (NIH/Stanford/CPIC supported, CC BY-SA 4.0) with optional Bearer/X-API-Key header.
- Official Published Rate Limit: 2.0 requests per second (enforced via Token-Bucket / Interval Throttling).
- Transient Resilience: Exponential backoff retries on HTTP 429, 502, 503, 504.
- Deterministic Idempotence: SHA-256 JSON content hashing and duplicate avoidance.
"""

import os
import sys
import json
import time
import hashlib
import datetime
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.ingestion.supabase_client import get_records, insert_records, postgrest_request


def load_env_file(filepath: Path):
    """Load key-value pairs from .env or .env.local into os.environ without overwriting existing."""
    if not filepath.exists():
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("\"'")
                    if key and key not in os.environ and val:
                        os.environ[key] = val
    except Exception as e:
        print(f"[ClinPGx Sync] Warning loading env file {filepath}: {e}")


# Load environment variables
load_env_file(PROJECT_ROOT / ".env.local")
load_env_file(PROJECT_ROOT / ".env")

RAW_BASE_URL = os.environ.get("CLINPGX_API_BASE_URL", "https://api.clinpgx.org").rstrip("/")
# Ensure /v1 path is included if base is root
CLINPGX_API_BASE_URL = RAW_BASE_URL if RAW_BASE_URL.endswith("/v1") else f"{RAW_BASE_URL}/v1"
CLINPGX_API_KEY = os.environ.get("CLINPGX_API_KEY", "").strip()

# Priority clinical PGx genes & drugs in CURX
PRIORITY_GENES = [
    "CYP2D6", "CYP2C19", "CYP2C9", "VKORC1", "SLCO1B1",
    "DPYD", "TPMT", "UGT1A1", "HLA-B", "CYP4F2"
]

PRIORITY_DRUGS = [
    "tamoxifen", "warfarin", "clopidogrel", "atorvastatin",
    "fluorouracil", "codeine", "abacavir", "simvastatin",
    "sertraline", "citalopram", "ibuprofen", "omeprazole"
]


class RateLimiter:
    """Rate limiter to strictly respect ClinPGx published rate limit (2 requests per second)."""
    def __init__(self, requests_per_second: float = 2.0):
        self.min_interval = 1.0 / max(requests_per_second, 0.1)
        self.last_request_time = 0.0

    def throttle(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.min_interval:
            time.sleep(self.min_interval - elapsed)
        self.last_request_time = time.time()


# Enforce official 2.0 req/sec limit
rate_limiter = RateLimiter(requests_per_second=2.0)


def compute_content_sha256(data: any) -> str:
    """Compute SHA-256 hash of structured JSON content."""
    json_bytes = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
    return hashlib.sha256(json_bytes).hexdigest()


def fetch_clinpgx_endpoint(
    endpoint: str,
    params: dict = None,
    api_key: str = None,
    base_url: str = None,
    max_retries: int = 3,
    timeout_seconds: int = 10
) -> dict:
    """
    HTTP GET request to ClinPGx REST API with retry logic and 2 req/sec rate limiting.
    Supports both Open Public Access and optional authenticated API keys.
    """
    base = base_url or CLINPGX_API_BASE_URL
    key = api_key if api_key is not None else CLINPGX_API_KEY
    url = f"{base}/{endpoint.lstrip('/')}"
    if params:
        query_str = urllib.parse.urlencode(params)
        url = f"{url}?{query_str}"

    headers = {
        "Accept": "application/json",
        "User-Agent": "CURX-Clinical-Sync/1.0 (Health-Intelligence-Platform)",
    }
    if key:
        headers["Authorization"] = f"Bearer {key}"
        headers["X-API-Key"] = key

    for attempt in range(1, max_retries + 1):
        rate_limiter.throttle()
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
                body = response.read().decode("utf-8")
                if not body:
                    return {}
                return json.loads(body)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            # If rate limited (429) or server error (502, 503, 504), retry with backoff
            if e.code in (429, 502, 503, 504) and attempt < max_retries:
                backoff = 2 ** attempt
                print(f"[ClinPGx Sync] HTTP {e.code} received on {url}. Retrying in {backoff}s (attempt {attempt}/{max_retries})...")
                time.sleep(backoff)
                continue
            elif e.code in (401, 403):
                raise PermissionError(f"Authentication failed (HTTP {e.code}) on ClinPGx API {url}: {err_body}")
            else:
                raise Exception(f"HTTPError {e.code} on ClinPGx GET {url}: {err_body}")
        except urllib.error.URLError as e:
            if attempt < max_retries:
                backoff = 2 ** attempt
                print(f"[ClinPGx Sync] Network error: {e.reason}. Retrying in {backoff}s (attempt {attempt}/{max_retries})...")
                time.sleep(backoff)
                continue
            raise Exception(f"Connection failed to ClinPGx API at {url}: {e.reason}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Malformed JSON received from ClinPGx API at {url}: {e}")

    raise Exception(f"Max retries exceeded for ClinPGx API request to {url}")


def log_sync_run(stats: dict, error_message: str = None, content_hash: str = "NA"):
    """Audit logging to public.data_ingestion_runs in Supabase."""
    try:
        run_record = {
            "dataset_name": "ClinPGx Live Sync",
            "content_hash": content_hash,
            "rows_seen": stats.get("rows_seen", 0),
            "rows_valid": stats.get("rows_valid", 0),
            "rows_rejected": stats.get("rows_rejected", 0),
            "rows_inserted": stats.get("rows_inserted", 0),
            "rows_updated": stats.get("rows_updated", 0),
            "rows_skipped": stats.get("rows_skipped", 0),
            "errors": [error_message] if error_message else [],
            "started_at": stats.get("started_at", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "completed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        insert_records("data_ingestion_runs", [run_record])
    except Exception as e:
        print(f"[ClinPGx Sync] Warning: Failed to record sync run audit log: {e}")


def sync_clinpgx_data(force: bool = False, custom_api_key: str = None) -> dict:
    """
    Main ClinPGx Live Sync orchestration against official https://api.clinpgx.org/v1.
    1. Resolves priority genes & chemicals via ClinPGx live directory.
    2. Retrieves CPIC guideline annotations for target entities.
    3. Normalizes and idempotently upserts evidence to Supabase evidence_sources.
    4. Records execution telemetry to data_ingestion_runs.
    """
    started_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    api_key = custom_api_key if custom_api_key is not None else CLINPGX_API_KEY
    auth_mode = f"Authenticated (Key Provided)" if api_key else "Open Public REST Access (CC BY-SA 4.0)"

    stats = {
        "status": "INITIATED",
        "started_at": started_at,
        "auth_mode": auth_mode,
        "rows_seen": 0,
        "rows_valid": 0,
        "rows_inserted": 0,
        "rows_updated": 0,
        "rows_skipped": 0,
        "rows_rejected": 0,
        "provider_url": CLINPGX_API_BASE_URL,
        "rate_limit": "2.0 req/sec",
    }

    print("================================================================")
    print("           CURX — CLINPGX LIVE API SYNCHRONIZATION              ")
    print("================================================================")
    print(f"Target API Endpoint: {CLINPGX_API_BASE_URL}")
    print(f"Authentication Mode: {auth_mode}")
    print(f"Published Rate Limit: 2.0 requests per second\n")

    try:
        # 1. Fetch current database gene and medication lookups for reference
        db_genes = get_records("genes", select="id,symbol", limit=2500)
        db_meds = get_records("medications", select="id,canonical_name", limit=2000)

        gene_map = {g["symbol"].upper(): g["id"] for g in (db_genes or []) if g.get("symbol")}
        med_map = {m["canonical_name"].lower(): m["id"] for m in (db_meds or []) if m.get("canonical_name")}

        # 2. Query ClinPGx for gene accession IDs (e.g. CYP2D6 -> PA128)
        print("[ClinPGx Sync] Querying ClinPGx Live Gene Directory...")
        clinpgx_gene_accessions = {}
        for gene_sym in PRIORITY_GENES:
            try:
                gene_res = fetch_clinpgx_endpoint("data/gene", params={"symbol": gene_sym}, api_key=api_key)
                gene_items = gene_res.get("data", [])
                if gene_items:
                    accession_id = gene_items[0].get("id")
                    if accession_id:
                        clinpgx_gene_accessions[gene_sym] = accession_id
                        print(f"  Mapped Gene {gene_sym} -> ClinPGx {accession_id}")
            except Exception as ge:
                print(f"  Notice querying gene {gene_sym}: {ge}")

        # 3. Query ClinPGx for drug accession IDs (e.g. tamoxifen -> PA451581)
        print("\n[ClinPGx Sync] Querying ClinPGx Live Chemical Directory...")
        clinpgx_drug_accessions = {}
        for drug_name in PRIORITY_DRUGS:
            try:
                chem_res = fetch_clinpgx_endpoint("data/chemical", params={"name": drug_name}, api_key=api_key)
                chem_items = chem_res.get("data", [])
                if chem_items:
                    accession_id = chem_items[0].get("id")
                    if accession_id:
                        clinpgx_drug_accessions[drug_name] = accession_id
                        print(f"  Mapped Drug {drug_name} -> ClinPGx {accession_id}")
            except Exception as de:
                print(f"  Notice querying drug {drug_name}: {de}")

        # 4. Fetch CPIC Guideline Annotations for mapped drugs
        print("\n[ClinPGx Sync] Fetching CPIC Guideline Annotations from ClinPGx...")
        all_guidelines = []
        for drug_name, chem_id in clinpgx_drug_accessions.items():
            try:
                g_res = fetch_clinpgx_endpoint("data/guidelineAnnotation", params={"relatedChemicals.accessionId": chem_id}, api_key=api_key)
                g_items = g_res.get("data", [])
                for g in g_items:
                    g["_drug_name"] = drug_name
                    all_guidelines.append(g)
                print(f"  Retrieved {len(g_items)} guidelines for {drug_name} ({chem_id})")
            except Exception as gle:
                print(f"  Notice querying guidelines for {drug_name}: {gle}")

        stats["rows_seen"] = len(all_guidelines)
        print(f"\n[ClinPGx Sync] Total Guideline Annotations Retrieved: {len(all_guidelines)}")

        if not all_guidelines:
            stats["status"] = "SUCCESS_NO_RECORDS"
            log_sync_run(stats, content_hash="EMPTY")
            return stats

        content_hash = compute_content_sha256(all_guidelines)

        # 5. Transform and upsert to evidence_sources
        evidence_records = []
        for g in all_guidelines:
            guideline_id = g.get("id") or f"CLINPGX_{g.get('_drug_name', 'DRUG')}".upper()
            title = g.get("name") or f"ClinPGx Guideline for {g.get('_drug_name')}"
            url = f"https://clinpgx.org/guidelineAnnotation/{guideline_id}"
            
            ev_record = {
                "source_name": "ClinPGx",
                "source_record_id": str(guideline_id),
                "title": title,
                "url": url,
                "evidence_type": "CPIC Clinical Practice Guideline",
                "source_metadata": {
                    "source": "ClinPGx Live API (https://api.clinpgx.org/v1)",
                    "retrieved_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "accession_id": guideline_id,
                    "target_drug": g.get("_drug_name"),
                    "alternate_drug_available": g.get("alternateDrugAvailable", False),
                    "dosing_information": g.get("dosingInformation", True),
                    "pediatric": g.get("pediatric", False),
                }
            }
            evidence_records.append(ev_record)
            stats["rows_valid"] += 1

        # Deduplicate evidence records by source_record_id to satisfy PostgreSQL ON CONFLICT requirement
        unique_evidence_map = {r["source_record_id"]: r for r in evidence_records}
        deduped_evidence_records = list(unique_evidence_map.values())

        if deduped_evidence_records:
            print(f"[ClinPGx Sync] Upserting {len(deduped_evidence_records)} unique evidence records to Supabase...")
            try:
                insert_records("evidence_sources", deduped_evidence_records, on_conflict="source_record_id")
                stats["rows_inserted"] += len(deduped_evidence_records)
            except Exception as ev_err:
                print(f"[ClinPGx Sync] Notice on Supabase upsert: {ev_err}")

        stats["status"] = "LIVE_CONNECTED"
        log_sync_run(stats, content_hash=content_hash)
        print("\n================================================================")
        print(f"       CLINPGX LIVE SYNC COMPLETED — STATUS: {stats['status']}")
        print(f"       Total Records Persisted: {stats['rows_inserted']}")
        print("================================================================\n")
        return stats

    except PermissionError as pe:
        msg = f"ClinPGx Authentication Error: {pe}"
        print(f"[ClinPGx Sync ERROR] {msg}")
        stats["status"] = "AUTH_FAILED"
        log_sync_run(stats, error_message=msg, content_hash="AUTH_FAIL")
        return stats
    except Exception as e:
        msg = f"ClinPGx Sync Pipeline Exception: {e}"
        print(f"[ClinPGx Sync ERROR] {msg}")
        stats["status"] = "FAILED"
        log_sync_run(stats, error_message=msg, content_hash="ERROR")
        return stats


if __name__ == "__main__":
    sync_clinpgx_data()
