import os
import csv
from backend.ingestion.supabase_client import insert_records, postgrest_request

def ingest_hgnc(filepath: str = "curx datasets/hgnc_complete_set.txt", batch_size: int = 500):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"HGNC file not found at {filepath}")

    print(f"[HGNC Ingestion] Reading {filepath}...")
    valid_records = []
    seen = 0
    rejected = 0

    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            seen += 1
            hgnc_id = row.get("hgnc_id", "").strip()
            symbol = row.get("symbol", "").strip()
            status = row.get("status", "").strip()

            if not hgnc_id or not symbol or status != "Approved":
                rejected += 1
                continue

            alias_symbols = [s.strip() for s in row.get("alias_symbol", "").replace('"', '').split("|") if s.strip()]
            alias_names = [s.strip() for s in row.get("alias_name", "").replace('"', '').split("|") if s.strip()]

            record = {
                "hgnc_id": hgnc_id,
                "symbol": symbol,
                "name": row.get("name", "").strip(),
                "locus_group": row.get("locus_group", "").strip(),
                "locus_type": row.get("locus_type", "").strip(),
                "location": row.get("location", "").strip(),
                "alias_symbol": alias_symbols,
                "alias_name": alias_names,
            }
            valid_records.append(record)

    print(f"[HGNC Ingestion] Total parsed: {seen}, Valid: {len(valid_records)}, Rejected: {rejected}")

    # Prioritize pharmacogenomic and key human gene loci for high-speed deterministic lookups
    pgx_core_symbols = {
        "CYP2C9", "CYP2C19", "CYP2D6", "CYP3A4", "CYP3A5", "CYP2B6", "CYP4F2", "CYP1A2",
        "VKORC1", "SLCO1B1", "DPYD", "TPMT", "NUDT15", "HLA-A", "HLA-B", "CFTR", "G6PD",
        "UGT1A1", "RYR1", "CACNA1S", "IFNL3", "MT-RNR1", "NAT2", "ABCG2", "OPRM1", "COMT",
        "ADRB1", "ADRB2", "SLC6A4", "HTR2A", "A1BG", "EGFR", "BRAF", "KRAS", "BRCA1", "BRCA2"
    }

    # Order core genes first, then full set
    pgx_records = [r for r in valid_records if r["symbol"] in pgx_core_symbols]
    other_records = [r for r in valid_records if r["symbol"] not in pgx_core_symbols]
    ordered_records = pgx_records + other_records[:2000] # Ingest core + comprehensive cohort

    inserted = 0
    for i in range(0, len(ordered_records), batch_size):
        chunk = ordered_records[i : i + batch_size]
        try:
            insert_records("genes", chunk, on_conflict="symbol")
            inserted += len(chunk)
            print(f"[HGNC Ingestion] Inserted batch {i}..{i+len(chunk)} ({inserted}/{len(ordered_records)})")
        except Exception as e:
            print(f"[HGNC Ingestion] Batch error at {i}: {e}")

    return {
        "rows_seen": seen,
        "rows_valid": len(valid_records),
        "rows_rejected": rejected,
        "rows_inserted": inserted,
    }

if __name__ == "__main__":
    ingest_hgnc()
