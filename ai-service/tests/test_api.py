"""
Comprehensive Unit and API Test Suite for GuardianLink AI Microservice.
Tests health/readiness probes, internal authentication enforcement,
request validation, upload size bounds, error handling (400, 401, 413, 422, 500, 503),
biometric enrollment, similarity search, vector deletion, and PII protection.
"""

import os
import uuid
import unittest
from unittest.mock import patch, MagicMock
import numpy as np
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.vector.indexer import derive_point_id
from app.schemas.biometric import HealthResponse, CandidateMatch, SearchResponse, EnrollResponse, DeleteResponse
from app.engine.face_engine import (
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
    InvalidEmbeddingError,
    FaceEngineError,
)
from app.vector.exceptions import (
    QdrantConnectionError,
    IncompatibleCollectionError,
    InvalidChildIdError,
    InvalidVectorError,
)

client = TestClient(app)

VALID_KEY = settings.INTERNAL_SERVICE_KEY
INVALID_KEY = "incorrect_secret_token_123"
SAMPLE_CHILD_ID = "6740b2a8d1e4c89a71e21b34"
SAMPLE_POINT_ID = derive_point_id(SAMPLE_CHILD_ID)
SAMPLE_EMBEDDING = np.random.randn(512).astype(np.float32)
SAMPLE_EMBEDDING /= np.linalg.norm(SAMPLE_EMBEDDING)


class TestAiServiceApi(unittest.TestCase):
    """Unit test suite for GuardianLink AI API endpoints."""

    # --------------------------------------------------------------------------
    # 1. Health and Readiness Probes
    # --------------------------------------------------------------------------

    def test_root_ping(self):
        """Verify root endpoint responds with status 200."""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("GuardianLink AI Microservice is online", data["message"])
        self.assertEqual(data["health_url"], "/health")

    @patch("app.routes.health.get_collection_info")
    @patch("app.routes.health.check_qdrant_health", return_value=True)
    def test_health_check_operational(self, mock_qdrant, mock_coll):
        """Verify health endpoint reports 'ok' when Qdrant and collection are ready."""
        mock_coll.return_value = {"name": settings.COLLECTION_NAME, "status": "green"}
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        health = HealthResponse(**data)
        self.assertEqual(health.status, "ok")
        self.assertEqual(health.service, "guardianlink-ai-service")
        self.assertTrue(health.qdrant_connected)
        self.assertTrue(health.details["collection_ready"])
        self.assertEqual(health.details["threshold"], settings.FACE_MATCH_THRESHOLD)

    @patch("app.routes.health.check_qdrant_health", return_value=False)
    def test_health_check_degraded_when_qdrant_offline(self, mock_qdrant):
        """Verify health endpoint accurately reports 'degraded' when Qdrant is unreachable."""
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        health = HealthResponse(**data)
        self.assertEqual(health.status, "degraded")
        self.assertFalse(health.qdrant_connected)
        self.assertFalse(health.details["collection_ready"])

    # --------------------------------------------------------------------------
    # 2. Internal Service Authentication Guards
    # --------------------------------------------------------------------------

    def test_internal_routes_require_header(self):
        """Verify all /internal/* endpoints reject requests lacking X-Internal-Service-Key."""
        endpoints = [
            ("POST", "/internal/ai/enroll"),
            ("POST", "/internal/face/enroll"),
            ("POST", "/internal/ai/search"),
            ("POST", "/internal/face/search"),
            ("DELETE", "/internal/ai/delete/test_child_123"),
            ("DELETE", "/internal/face/test_child_123"),
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
            ("POST", "/internal/face/enroll"),
            ("POST", "/internal/ai/search"),
            ("POST", "/internal/face/search"),
            ("DELETE", "/internal/ai/delete/test_child_123"),
            ("DELETE", "/internal/face/test_child_123"),
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
    # 3. Biometric Enrollment Endpoint
    # --------------------------------------------------------------------------

    @patch("app.routes.enroll.upsert_child_vector", return_value=SAMPLE_POINT_ID)
    @patch("app.routes.enroll.generate_embedding", return_value=SAMPLE_EMBEDDING)
    def test_enroll_success(self, mock_engine, mock_upsert):
        """Verify valid enrollment request returns 200 with EnrollResponse schema."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("portrait.jpg", b"\xff\xd8\xff\xe0fake_valid_bytes", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()

        enroll_res = EnrollResponse(**res_data)
        self.assertTrue(enroll_res.success)
        self.assertEqual(enroll_res.child_id, SAMPLE_CHILD_ID)
        self.assertEqual(enroll_res.face_profile_id, SAMPLE_POINT_ID)
        self.assertEqual(enroll_res.status, "enrolled")
        self.assertNotIn("embedding", res_data)

    @patch("app.routes.enroll.upsert_child_vector", return_value=SAMPLE_POINT_ID)
    @patch("app.routes.enroll.generate_embedding", return_value=SAMPLE_EMBEDDING)
    def test_enroll_supports_internal_ai_prefix(self, mock_engine, mock_upsert):
        """Verify /internal/ai/enroll prefix works identically for backwards compatibility."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"image": ("portrait.jpg", b"\xff\xd8\xff\xe0fake_bytes", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/ai/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["child_id"], SAMPLE_CHILD_ID)

    def test_enroll_missing_file(self):
        """Verify enrollment without file upload returns 422."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data)
        self.assertEqual(response.status_code, 422)

    def test_enroll_empty_file(self):
        """Verify empty file upload (0 bytes) returns 422."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "IMAGE_DECODE_FAILED")

    def test_enroll_invalid_child_id(self):
        """Verify blank or whitespace child_id returns 400."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("portrait.jpg", b"fake_bytes", "image/jpeg")}
        data = {"child_id": "   "}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "INVALID_CHILD_ID")

    @patch("app.routes.enroll.generate_embedding", side_effect=NoFaceDetectedError("No human face detected."))
    def test_enroll_no_face_detected(self, mock_engine):
        """Verify zero face detection raises 422 with NO_FACE_DETECTED code."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("scenery.jpg", b"some_image_bytes", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "NO_FACE_DETECTED")

    @patch("app.routes.enroll.generate_embedding", side_effect=MultipleFacesDetectedError("Multiple human faces detected (2)."))
    def test_enroll_multiple_faces_detected(self, mock_engine):
        """Verify multiple faces detected raises 422 with MULTIPLE_FACES_DETECTED code."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("group.jpg", b"some_image_bytes", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "MULTIPLE_FACES_DETECTED")

    @patch("app.routes.enroll.generate_embedding", side_effect=ImageDecodeError("Failed to decode image from binary bytes."))
    def test_enroll_corrupted_image(self, mock_engine):
        """Verify corrupted image raises 422 with IMAGE_DECODE_FAILED code."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("corrupt.png", b"corrupted_non_image_garbage", "image/png")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "IMAGE_DECODE_FAILED")

    @patch("app.routes.enroll.generate_embedding", return_value=SAMPLE_EMBEDDING)
    @patch("app.routes.enroll.upsert_child_vector", side_effect=QdrantConnectionError("Connection refused"))
    def test_enroll_qdrant_unavailable(self, mock_upsert, mock_engine):
        """Verify Qdrant unavailability during enrollment returns 503."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("portrait.jpg", b"image_bytes", "image/jpeg")}
        data = {"child_id": SAMPLE_CHILD_ID}

        response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "VECTOR_DB_UNAVAILABLE")

    # --------------------------------------------------------------------------
    # 4. Biometric Similarity Search Endpoint
    # --------------------------------------------------------------------------

    @patch("app.routes.search.generate_embedding", return_value=SAMPLE_EMBEDDING)
    @patch("app.routes.search.search_similar_faces")
    def test_search_success_with_candidates(self, mock_search, mock_engine):
        """Verify search returns ordered candidates matching SearchResponse schema."""
        mock_search.return_value = [
            {"child_id": "child_match_1", "similarity": 0.9421, "point_id": "p1"},
            {"child_id": "child_match_2", "similarity": 0.7812, "point_id": "p2"},
        ]
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.jpg", b"query_image_bytes", "image/jpeg")}
        data = {"top_k": "5", "threshold": "0.70"}

        response = client.post("/internal/face/search", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()

        search_res = SearchResponse(**res_data)
        self.assertTrue(search_res.match_found)
        self.assertEqual(search_res.total_candidates, 2)
        self.assertEqual(len(search_res.candidates), 2)
        self.assertEqual(search_res.candidates[0].child_id, "child_match_1")
        self.assertEqual(search_res.candidates[0].similarity, 0.9421)
        self.assertNotIn("embedding", res_data)
        self.assertNotIn("email", res_data)

    @patch("app.routes.search.generate_embedding", return_value=SAMPLE_EMBEDDING)
    @patch("app.routes.search.search_similar_faces", return_value=[])
    def test_search_no_results(self, mock_search, mock_engine):
        """Verify search with zero matches returns match_found=False and empty candidates."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.jpg", b"query_image_bytes", "image/jpeg")}

        response = client.post("/internal/face/search", headers=headers, files=files)
        self.assertEqual(response.status_code, 200)
        res_data = response.json()

        search_res = SearchResponse(**res_data)
        self.assertFalse(search_res.match_found)
        self.assertEqual(search_res.total_candidates, 0)
        self.assertEqual(len(search_res.candidates), 0)

    def test_search_invalid_top_k(self):
        """Verify invalid top_k / limit (<1 or >50) returns 400."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.jpg", b"query_image_bytes", "image/jpeg")}
        data = {"top_k": "99"}

        response = client.post("/internal/face/search", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("between 1 and 50", response.json()["detail"])

    def test_search_invalid_threshold(self):
        """Verify invalid threshold outside [-1.0, 1.0] returns 400."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.jpg", b"query_image_bytes", "image/jpeg")}
        data = {"threshold": "2.5"}

        response = client.post("/internal/face/search", headers=headers, data=data, files=files)
        self.assertEqual(response.status_code, 400)
        self.assertIn("between -1.0 and 1.0", response.json()["detail"])

    @patch("app.routes.search.generate_embedding", side_effect=NoFaceDetectedError("No human face detected."))
    def test_search_no_face_detected(self, mock_engine):
        """Verify search with zero faces returns 422."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("tree.jpg", b"image_bytes", "image/jpeg")}

        response = client.post("/internal/face/search", headers=headers, files=files)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "NO_FACE_DETECTED")

    @patch("app.routes.search.generate_embedding", return_value=SAMPLE_EMBEDDING)
    @patch("app.routes.search.search_similar_faces", side_effect=QdrantConnectionError("Connection timeout"))
    def test_search_qdrant_unavailable(self, mock_search, mock_engine):
        """Verify search returns 503 when Qdrant is unavailable."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        files = {"file": ("query.jpg", b"image_bytes", "image/jpeg")}

        response = client.post("/internal/face/search", headers=headers, files=files)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "VECTOR_DB_UNAVAILABLE")

    # --------------------------------------------------------------------------
    # 5. Biometric Vector Deletion Endpoint
    # --------------------------------------------------------------------------

    @patch("app.routes.delete.delete_child_vector", return_value=SAMPLE_POINT_ID)
    def test_delete_success(self, mock_delete):
        """Verify successful vector deletion returns 200 with DeleteResponse."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        response = client.delete(f"/internal/face/{SAMPLE_CHILD_ID}", headers=headers)
        self.assertEqual(response.status_code, 200)

        del_res = DeleteResponse(**response.json())
        self.assertTrue(del_res.success)
        self.assertEqual(del_res.child_id, SAMPLE_CHILD_ID)
        self.assertEqual(del_res.face_profile_id, SAMPLE_POINT_ID)

    @patch("app.routes.delete.delete_child_vector", return_value=SAMPLE_POINT_ID)
    def test_delete_supports_legacy_prefix(self, mock_delete):
        """Verify /internal/ai/delete/{child_id} works identically."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        response = client.delete(f"/internal/ai/delete/{SAMPLE_CHILD_ID}", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["child_id"], SAMPLE_CHILD_ID)

    @patch("app.routes.delete.delete_child_vector", return_value=SAMPLE_POINT_ID)
    def test_delete_idempotent_repeated(self, mock_delete):
        """Verify repeated deletions succeed consistently (idempotency)."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        res1 = client.delete(f"/internal/face/{SAMPLE_CHILD_ID}", headers=headers)
        res2 = client.delete(f"/internal/face/{SAMPLE_CHILD_ID}", headers=headers)
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res2.status_code, 200)

    @patch("app.routes.delete.delete_child_vector", side_effect=QdrantConnectionError("Connection failed"))
    def test_delete_qdrant_unavailable(self, mock_delete):
        """Verify delete returns 503 when Qdrant is offline."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        response = client.delete(f"/internal/face/{SAMPLE_CHILD_ID}", headers=headers)
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["code"], "VECTOR_DB_UNAVAILABLE")

    # --------------------------------------------------------------------------
    # 6. Upload Limits & Privacy Protection
    # --------------------------------------------------------------------------

    def test_upload_size_limit_enforcement(self):
        """Verify uploading file exceeding MAX_UPLOAD_SIZE_BYTES returns 413."""
        headers = {"X-Internal-Service-Key": VALID_KEY}
        huge_bytes = b"X" * 200  # Will mock limit to 100 bytes

        with patch("app.utils.upload.settings.MAX_UPLOAD_SIZE_BYTES", 100):
            files = {"file": ("huge.jpg", huge_bytes, "image/jpeg")}
            data = {"child_id": SAMPLE_CHILD_ID}
            response = client.post("/internal/face/enroll", headers=headers, data=data, files=files)
            self.assertEqual(response.status_code, 413)
            self.assertIn("exceeds the maximum allowed limit", response.json()["detail"])

    def test_candidate_match_schema_excludes_pii(self):
        """Verify CandidateMatch schema contains zero PII."""
        candidate = CandidateMatch(
            child_id=SAMPLE_CHILD_ID,
            similarity=0.842,
            confidence=0.99,
        )
        dumped = candidate.model_dump()
        self.assertIn("child_id", dumped)
        self.assertIn("similarity", dumped)
        self.assertNotIn("parent", dumped)
        self.assertNotIn("email", dumped)
        self.assertNotIn("phone", dumped)
        self.assertNotIn("name", dumped)

    # --------------------------------------------------------------------------
    # 7. Asset Verification
    # --------------------------------------------------------------------------

    def test_test_png_asset_exists(self):
        """Verify reference portrait exists in tests/assets/."""
        asset_path = os.path.join(os.path.dirname(__file__), "assets", "test.png")
        self.assertTrue(os.path.exists(asset_path), f"Expected reference asset at {asset_path}")
        self.assertGreater(os.path.getsize(asset_path), 1000000, "Reference asset appears truncated")


if __name__ == "__main__":
    unittest.main()
