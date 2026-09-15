import os
import json
import urllib.request
import urllib.error

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

def postgrest_request(endpoint: str, method: str = "GET", data=None, params=None, headers=None, prefer=None):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    if params:
        query_str = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
        url = f"{url}?{query_str}"
    
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        req_headers["Prefer"] = prefer
    if headers:
        req_headers.update(headers)
        
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            if res_body:
                return json.loads(res_body)
            return None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        raise Exception(f"HTTPError {e.code} on {method} {url}: {err_body}")

def insert_records(table: str, records: list, on_conflict: str = None):
    if not records:
        return []
    prefer = "return=representation"
    params = {}
    if on_conflict:
        prefer += ",resolution=merge-duplicates"
        params["on_conflict"] = on_conflict
    return postgrest_request(table, method="POST", data=records, params=params if params else None, prefer=prefer)

def get_records(table: str, select: str = "*", limit: int = 1000):
    return postgrest_request(table, method="GET", params={"select": select, "limit": limit})
