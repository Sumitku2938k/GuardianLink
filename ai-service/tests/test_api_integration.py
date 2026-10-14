"""
Live End-to-End API Integration Test Suite for GuardianLink AI Microservice.
Tests real HTTP requests through FastAPI TestClient wired to the actual
InsightFace buffalo_l engine (SCRFD + ArcFace) and live standalone Qdrant instance.
Uses isolated test collection to avoid contaminating production vector spaces.
"""

import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.vector.client import get_qdrant_client, check_qdrant_health
from app.vector.store import ensure_collection_exists
from app.vector.indexer import derive_point_id
from app.schemas.biometric import EnrollResponse, SearchResponse, DeleteResponse

client = TestClient(app)

TEST_API_COLLECTION = "test_guardianlink_api_integration"
VALID_KEY = settings.INTERNAL_SERVICE_KEY
TEST_ASSET_PATH = os.path.join(os.path.dirname(__file__), "assets", "test.png")


class TestApiIntegrationLive(unittest.TestCase):
    """
    Live end-to-end endpoint tests connecting real InsightFace inference
    and real standalone Qdrant vector database.
    """

    @classmethod
    def setUpClass(cls):
        """Verify Qdrant server connectivity and configure test collection."""
        cls.qdrant = get_qdrant_client()
        if not check_qdrant_health(cls.qdrant):
            raise unittest.SkipTest("Standalone Qdrant server is unreachable on configured URL")

        if not os.path.exists(TEST_ASSET_PATH):
            raise unittest.SkipTest(f"Reference asset not found at {TEST_ASSET_PATH}")

        # Clean any preexisting test collection from previous test runs
        try:
            cls.qdrant.delete_collection(TEST_API_COLLECTION)
        except Exception:
            pass

        # Create isolated test collection
        ensure_collection_exists(client=cls.qdrant, collection_name=TEST_API_COLLECTION)

        with open(TEST_ASSET_PATH, "rb") as f:
            cls.test_image_bytes = f.read()

    @classmethod
    def tearDownClass(cls):
        """Clean up isolated test collection from Qdrant."""
        try:
            cls.qdrant.delete_collection(TEST_API_COLLECTION)
        except Exception:
            pass

    def test_live_full_lifecycle_enroll_search_delete(self):
        """
        Executes complete real-world biometric lifecycle:
        1. Enroll child reference portrait via POST /internal/face/enroll
        2. Verify candidate retrieval via POST /internal/face/search
        3. Delete biometric vector via DELETE /internal/face/{child_id}
        4. Verify subsequent search returns zero candidates
        """
        child_id = "6740b2a8d1e4c89a71e21b88"
        expected_point_id = derive_point_id(child_id)
        headers = {"X-Internal-Service-Key": VALID_KEY}

        # Override collection name for the duration of this test
        with patch("app.config.settings.COLLECTION_NAME", TEST_API_COLLECTION):

            # ------------------------------------------------------------------
            # Phase 1: Real Enrollment
            # ------------------------------------------------------------------
            files = {"file": ("test.png", self.test_image_bytes, "image/png")}
            data = {"child_id": child_id}

            enroll_resp = client.post(
                "/internal/face/enroll",
                headers=headers,
                data=data,
                files=files,
            )
            self.assertEqual(enroll_resp.status_code, 200, f"Enrollment failed: {enroll_resp.text}")

            enroll_data = enroll_resp.json()
            enroll_obj = EnrollResponse(**enroll_data)
            self.assertTrue(enroll_obj.success)
            self.assertEqual(enroll_obj.child_id, child_id)
            self.assertEqual(enroll_obj.face_profile_id, expected_point_id)
            self.assertEqual(enroll_obj.status, "enrolled")
            self.assertNotIn("embedding", enroll_data)

            # ------------------------------------------------------------------
            # Phase 2: Real Similarity Search (Exact Match Query)
            # ------------------------------------------------------------------
            search_files = {"file": ("query.png", self.test_image_bytes, "image/png")}
            search_data = {"top_k": "5", "threshold": "0.60"}

            search_resp = client.post(
                "/internal/face/search",
                headers=headers,
                data=search_data,
                files=search_files,
            )
            self.assertEqual(search_resp.status_code, 200, f"Search failed: {search_resp.text}")

            search_result = search_resp.json()
            search_obj = SearchResponse(**search_result)
            self.assertTrue(search_obj.match_found)
            self.assertGreaterEqual(search_obj.total_candidates, 1)
            top_match = search_obj.candidates[0]
            self.assertEqual(top_match.child_id, child_id)
            # Querying the exact same image should yield similarity near 1.0
            self.assertGreaterEqual(top_match.similarity, 0.95)
            self.assertNotIn("embedding", search_result)
            self.assertNotIn("email", search_result)

            # ------------------------------------------------------------------
            # Phase 3: Real Vector Deletion
            # ------------------------------------------------------------------
            del_resp = client.delete(
                f"/internal/face/{child_id}",
                headers=headers,
            )
            self.assertEqual(del_resp.status_code, 200, f"Deletion failed: {del_resp.text}")

            del_result = del_resp.json()
            del_obj = DeleteResponse(**del_result)
            self.assertTrue(del_obj.success)
            self.assertEqual(del_obj.child_id, child_id)
            self.assertEqual(del_obj.face_profile_id, expected_point_id)

            # ------------------------------------------------------------------
            # Phase 4: Subsequent Search Proves Vector Removal
            # ------------------------------------------------------------------
            verify_search_files = {"file": ("query.png", self.test_image_bytes, "image/png")}
            verify_search_resp = client.post(
                "/internal/face/search",
                headers=headers,
                data={"top_k": "5", "threshold": "0.60"},
                files=verify_search_files,
            )
            self.assertEqual(verify_search_resp.status_code, 200)

            verify_result = verify_search_resp.json()
            verify_obj = SearchResponse(**verify_result)
            self.assertFalse(verify_obj.match_found)
            self.assertEqual(len(verify_obj.candidates), 0)

    def test_live_search_supports_internal_ai_prefix(self):
        """Verify backwards-compatible /internal/ai/search endpoint with real Qdrant."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.png", self.test_image_bytes, "image/png")}

        with patch("app.config.settings.COLLECTION_NAME", TEST_API_COLLECTION):
            response = client.post(
                "/internal/ai/search",
                headers=headers,
                data={"limit": "3"},
                files=files,
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("match_found", data)
            self.assertIn("candidates", data)


if __name__ == "__main__":
    unittest.main()
