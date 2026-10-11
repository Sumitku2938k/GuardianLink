"""
Unit and integration test suite for GuardianLink AI Microservice skeleton.
Tests application factory, route registration, internal key authentication,
health check probes, deterministic UUIDv5 derivation, and domain exception handlers.
Compatible with standard unittest runner and pytest.
"""

import os
import uuid
import unittest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.vector.indexer import derive_point_id
from app.schemas.biometric import HealthResponse, CandidateMatch, SearchResponse

client = TestClient(app)

VALID_KEY = settings.INTERNAL_SERVICE_KEY
INVALID_KEY = "incorrect_secret_token_123"


class TestAiServiceSkeleton(unittest.TestCase):
    """Test suite verifying skeleton endpoints, schemas, and security boundaries."""

    # --------------------------------------------------------------------------
    # 1. Health and Liveness Probes
    # --------------------------------------------------------------------------

    def test_root_ping(self):
        """Verify root endpoint responds with status 200."""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("GuardianLink AI Microservice is online", data["message"])
        self.assertEqual(data["health_url"], "/health")

    def test_health_check_endpoint(self):
        """Verify health endpoint returns valid HealthResponse schema."""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        health = HealthResponse(**data)
        self.assertEqual(health.status, "ok")
        self.assertEqual(health.service, "guardianlink-ai-service")
        self.assertEqual(health.version, "1.0.0")
        self.assertIsInstance(health.models_loaded, bool)
        self.assertIsInstance(health.qdrant_connected, bool)
        self.assertEqual(health.details["threshold"], settings.FACE_MATCH_THRESHOLD)

    # --------------------------------------------------------------------------
    # 2. Internal Service Authentication Guards
    # --------------------------------------------------------------------------

    def test_internal_routes_require_header(self):
        """Verify all /internal/* endpoints reject requests lacking X-Internal-Service-Key."""
        endpoints = [
            ("POST", "/internal/ai/enroll"),
            ("POST", "/internal/ai/search"),
            ("DELETE", "/internal/ai/delete/test_child_123"),
        ]
        for method, path in endpoints:
            if method == "POST":
                response = client.post(path)
            else:
                response = client.delete(path)

            self.assertEqual(
                response.status_code,
                401,
                f"Expected 401 for {method} {path} without header, got {response.status_code}",
            )
            self.assertIn("Missing required header", response.json()["detail"])

    def test_internal_routes_reject_invalid_key(self):
        """Verify all /internal/* endpoints reject requests with invalid keys."""
        headers = {"X-Internal-Service-Key": INVALID_KEY}
        endpoints = [
            ("POST", "/internal/ai/enroll"),
            ("POST", "/internal/ai/search"),
            ("DELETE", "/internal/ai/delete/test_child_123"),
        ]
        for method, path in endpoints:
            if method == "POST":
                response = client.post(path, headers=headers)
            else:
                response = client.delete(path, headers=headers)

            self.assertEqual(
                response.status_code,
                401,
                f"Expected 401 for {method} {path} with invalid key, got {response.status_code}",
            )
            self.assertIn("Invalid internal service key", response.json()["detail"])

    # --------------------------------------------------------------------------
    # 3. Skeleton 501 Responses (Proves registration without premature logic)
    # --------------------------------------------------------------------------

    def test_enroll_endpoint_skeleton_returns_501(self):
        """Verify enroll route is mounted, accepts valid key, and returns 501 Not Implemented."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("test.png", b"fake_image_bytes", "image/png")}
        data = {"child_id": "6740b2a8d1e4c89a71e21b34"}

        response = client.post("/internal/ai/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 501)
        self.assertIn("deferred to Phase 6.5", response.json()["detail"])

    def test_search_endpoint_skeleton_returns_501(self):
        """Verify search route is mounted, accepts valid key, and returns 501 Not Implemented."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.png", b"fake_query_bytes", "image/png")}
        data = {"limit": "5"}

        response = client.post("/internal/ai/search", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 501)
        self.assertIn("deferred to Phase 6.5", response.json()["detail"])

    def test_delete_endpoint_skeleton_returns_501(self):
        """Verify delete route is mounted, accepts valid key, and returns 501 Not Implemented."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        response = client.delete("/internal/ai/delete/6740b2a8d1e4c89a71e21b34", headers=headers)
        self.assertEqual(response.status_code, 501)
        self.assertIn("deferred to Phase 6.5", response.json()["detail"])

    # --------------------------------------------------------------------------
    # 4. Deterministic UUIDv5 Point Derivation
    # --------------------------------------------------------------------------

    def test_derive_point_id_deterministic(self):
        """Verify MongoDB ObjectId maps to identical UUIDv5 on repeat invocations."""
        child_id = "6740b2a8d1e4c89a71e21b34"
        point_id_1 = derive_point_id(child_id)
        point_id_2 = derive_point_id(child_id)

        parsed = uuid.UUID(point_id_1)
        self.assertEqual(parsed.version, 5)
        self.assertEqual(point_id_1, point_id_2)

    def test_derive_point_id_distinct_for_different_children(self):
        """Verify different child IDs produce distinct UUIDs."""
        id_1 = "6740b2a8d1e4c89a71e21b34"
        id_2 = "6740b2a8d1e4c89a71e21b99"
        self.assertNotEqual(derive_point_id(id_1), derive_point_id(id_2))

    def test_derive_point_id_invalid_input(self):
        """Verify invalid inputs raise ValueError."""
        with self.assertRaises(ValueError):
            derive_point_id("")

    # --------------------------------------------------------------------------
    # 5. Schema Validation & Privacy Enforcement
    # --------------------------------------------------------------------------

    def test_candidate_match_schema_excludes_pii(self):
        """Verify CandidateMatch schema strictly defines only mathematical score fields."""
        candidate = CandidateMatch(
            child_id="6740b2a8d1e4c89a71e21b34",
            similarity=0.842,
            confidence=0.99,
        )
        dumped = candidate.model_dump()
        self.assertIn("child_id", dumped)
        self.assertIn("similarity", dumped)
        self.assertNotIn("parent", dumped)
        self.assertNotIn("email", dumped)
        self.assertNotIn("phone", dumped)

    def test_search_response_schema(self):
        """Verify SearchResponse contract."""
        res = SearchResponse(
            match_found=True,
            candidates=[CandidateMatch(child_id="123", similarity=0.88)],
            total_candidates=1,
            threshold_applied=0.60,
            message="1 potential match found",
        )
        self.assertTrue(res.match_found)
        self.assertEqual(len(res.candidates), 1)
        self.assertEqual(res.candidates[0].child_id, "123")

    # --------------------------------------------------------------------------
    # 6. Test Asset Verification
    # --------------------------------------------------------------------------

    def test_test_png_asset_exists(self):
        """Verify the copied reference portrait exists in tests/assets/."""
        asset_path = os.path.join(os.path.dirname(__file__), "assets", "test.png")
        self.assertTrue(os.path.exists(asset_path), f"Expected reference asset at {asset_path}")
        self.assertGreater(os.path.getsize(asset_path), 1000000, "Reference asset appears truncated")


if __name__ == "__main__":
    unittest.main()
