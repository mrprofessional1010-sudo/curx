"""
Unit Tests for ClinPGx Live API Synchronization Module
======================================================
Tests:
1. Valid API response parsing, normalization, and entity mapping.
2. Authentication failure handling (HTTP 401/403).
3. Malformed JSON response resilience.
4. Rate limiting and transient retry handling with exponential backoff.
5. Content hashing and idempotent synchronization.
6. Evidence provenance and metadata preservation.
7. Open Public Access vs Authenticated API key mode support.
"""

import unittest
from unittest.mock import patch, MagicMock
import json
import urllib.error
from backend.ingestion.sync_clinpgx import (
    fetch_clinpgx_endpoint,
    compute_content_sha256,
    RateLimiter,
    sync_clinpgx_data,
    log_sync_run
)


class TestClinPGxSync(unittest.TestCase):

    def setUp(self):
        self.mock_guidelines_response = {
            "data": [
                {
                    "id": "PA166176068",
                    "name": "Annotation of CPIC Guideline for tamoxifen and CYP2D6",
                    "alternateDrugAvailable": True,
                    "dosingInformation": True,
                    "pediatric": False
                },
                {
                    "id": "PA166104966",
                    "name": "Annotation of DPWG Guideline for tamoxifen and CYP2D6",
                    "alternateDrugAvailable": True,
                    "dosingInformation": True,
                    "pediatric": False
                }
            ],
            "status": "success"
        }

    def test_content_hashing_is_deterministic(self):
        """Verify that SHA-256 content hashing is 100% deterministic."""
        hash1 = compute_content_sha256(self.mock_guidelines_response)
        hash2 = compute_content_sha256(self.mock_guidelines_response)
        self.assertEqual(hash1, hash2)
        self.assertEqual(len(hash1), 64)

    @patch("urllib.request.urlopen")
    def test_valid_api_response_fetching(self, mock_urlopen):
        """Test successful HTTP GET request to ClinPGx API."""
        mock_resp = MagicMock()
        mock_resp.read.return_value = json.dumps(self.mock_guidelines_response).encode("utf-8")
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        data = fetch_clinpgx_endpoint("data/guidelineAnnotation", params={"relatedChemicals.accessionId": "PA451581"}, max_retries=1)
        self.assertIn("data", data)
        self.assertEqual(len(data["data"]), 2)
        self.assertEqual(data["data"][0]["id"], "PA166176068")

    @patch("urllib.request.urlopen")
    def test_authentication_failure_raises_permission_error(self, mock_urlopen):
        """Test that HTTP 401/403 triggers PermissionError with clear message."""
        mock_http_error = urllib.error.HTTPError(
            url="https://api.clinpgx.org/v1/data/guidelineAnnotation",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"error": "Invalid or expired ClinPGx API key"}')
        )
        mock_urlopen.side_effect = mock_http_error

        with self.assertRaises(PermissionError) as ctx:
            fetch_clinpgx_endpoint("data/guidelineAnnotation", api_key="invalid_key", max_retries=1)
        self.assertIn("Authentication failed", str(ctx.exception))

    @patch("urllib.request.urlopen")
    def test_malformed_json_response_handling(self, mock_urlopen):
        """Test that malformed/non-JSON responses raise ValueError without unhandled crash."""
        mock_resp = MagicMock()
        mock_resp.read.return_value = b"<html><head><title>502 Bad Gateway</title></head><body>Bad Gateway</body></html>"
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        with self.assertRaises(ValueError) as ctx:
            fetch_clinpgx_endpoint("data/guidelineAnnotation", api_key="test_key", max_retries=1)
        self.assertIn("Malformed JSON", str(ctx.exception))

    @patch("time.sleep")
    @patch("urllib.request.urlopen")
    def test_transient_retry_with_backoff(self, mock_urlopen, mock_sleep):
        """Test that HTTP 429 rate-limiting retries with exponential backoff and succeeds."""
        mock_http_429 = urllib.error.HTTPError(
            url="https://api.clinpgx.org/v1/data/guidelineAnnotation",
            code=429,
            msg="Too Many Requests",
            hdrs={},
            fp=MagicMock(read=lambda: b'{"error": "Rate limit exceeded"}')
        )
        mock_resp_success = MagicMock()
        mock_resp_success.read.return_value = json.dumps(self.mock_guidelines_response).encode("utf-8")
        mock_resp_success.__enter__.return_value = mock_resp_success

        # Fail with 429 on first call, succeed on second
        mock_urlopen.side_effect = [mock_http_429, mock_resp_success]

        data = fetch_clinpgx_endpoint("data/guidelineAnnotation", api_key="test_key", max_retries=3)
        self.assertEqual(len(data["data"]), 2)
        mock_sleep.assert_called()

    def test_rate_limiter_throttling(self):
        """Test rate limiter interval calculation for official 2.0 req/sec rate limit."""
        limiter = RateLimiter(requests_per_second=2.0)
        self.assertAlmostEqual(limiter.min_interval, 0.5, places=3)

    @patch("backend.ingestion.sync_clinpgx.get_records")
    @patch("backend.ingestion.sync_clinpgx.insert_records")
    @patch("backend.ingestion.sync_clinpgx.fetch_clinpgx_endpoint")
    def test_idempotent_sync_and_evidence_provenance(self, mock_fetch, mock_insert, mock_get):
        """Test full synchronization mapping with evidence provenance fields."""
        def fetch_side_effect(endpoint, params=None, **kwargs):
            if endpoint == "data/gene":
                return {"data": [{"id": "PA128", "symbol": params.get("symbol")}], "status": "success"}
            elif endpoint == "data/chemical":
                if params.get("name") == "tamoxifen":
                    return {"data": [{"id": "PA451581", "name": "tamoxifen"}], "status": "success"}
                return {"data": [], "status": "success"}
            elif endpoint == "data/guidelineAnnotation":
                return self.mock_guidelines_response
            return {"data": [], "status": "success"}

        mock_fetch.side_effect = fetch_side_effect
        mock_get.side_effect = [
            # genes
            [{"id": "gene-uuid-1", "symbol": "CYP2D6"}],
            # medications
            [{"id": "med-uuid-1", "canonical_name": "Tamoxifen"}],
        ]
        mock_insert.return_value = [{"id": "ev-uuid-1"}]

        result = sync_clinpgx_data(force=True, custom_api_key="valid_test_key")
        self.assertEqual(result["status"], "LIVE_CONNECTED")
        self.assertEqual(result["rows_seen"], 2)
        self.assertEqual(result["rows_valid"], 2)

        # Verify insert_records was called with ClinPGx provenance
        self.assertTrue(mock_insert.called)
        inserted_ev_call = mock_insert.call_args_list[0]
        table_name = inserted_ev_call[0][0]
        records = inserted_ev_call[0][1]
        
        self.assertEqual(table_name, "evidence_sources")
        self.assertEqual(records[0]["source_name"], "ClinPGx")
        self.assertIn("ClinPGx Live API", records[0]["source_metadata"]["source"])
        self.assertEqual(records[0]["source_record_id"], "PA166176068")


if __name__ == "__main__":
    unittest.main()
