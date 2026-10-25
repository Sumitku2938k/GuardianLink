"""
GuardianLink AI Microservice — Phase 13: Security Hardening & Decompression Bomb Test Suite.

Validates:
1. verify_internal_key authentication dependency:
   - Acceptance of valid key
   - Rejection of missing key (401)
   - Rejection of incorrect key (401)
   - Rejection of whitespace-only key (401)
   - Rejection of empty key (401)
   - Fail-closed behavior (500) if server INTERNAL_SERVICE_KEY is unset/empty
2. decode_image_input dimension & pixel limits:
   - Acceptance of valid image within limits
   - Rejection of image exceeding 4096 px width/height (ImageDecodeError)
   - Rejection of total pixel count exceeding 16,777,216 (decompression bomb protection)
   - Rejection of malformed/corrupted image bytes (ImageDecodeError)
3. Health check privacy:
   - Unauthenticated /health does not expose Qdrant collection_name or model_name
4. OpenAPI production hardening:
   - Production mode disables /docs, /redoc, and /openapi.json
"""

import unittest
import asyncio
import numpy as np
import cv2
from unittest.mock import patch
from fastapi import HTTPException

from app.config import settings
from app.middleware.internal_auth import verify_internal_key
from app.engine.detector import (
    decode_image_input,
    MAX_IMAGE_DIMENSION,
    MAX_TOTAL_PIXELS,
)
from app.engine.face_engine import ImageDecodeError
from app.main import create_app
from fastapi.testclient import TestClient


class TestSecurityHardening(unittest.TestCase):
    """Phase 13 security hardening unit and integration tests."""

    def setUp(self):
        self.app = create_app()
        self.client = TestClient(self.app)

    # ==========================================================================
    # 1. Internal Key Authentication Hardening
    # ==========================================================================

    def test_verify_internal_key_valid(self):
        """Valid internal service key succeeds."""
        key = settings.INTERNAL_SERVICE_KEY
        result = asyncio.run(verify_internal_key(key))
        self.assertEqual(result, key)

    def test_verify_internal_key_missing_or_empty(self):
        """Missing or empty internal service key raises HTTP 401."""
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_internal_key(None))
        self.assertEqual(ctx.exception.status_code, 401)

        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_internal_key(""))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_verify_internal_key_whitespace(self):
        """Whitespace-only internal service key raises HTTP 401."""
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_internal_key("    "))
        self.assertEqual(ctx.exception.status_code, 401)

    def test_verify_internal_key_incorrect(self):
        """Incorrect internal service key raises HTTP 401."""
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(verify_internal_key("WRONG_FORGED_SECRET_KEY"))
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Invalid internal service key", ctx.exception.detail)

    def test_verify_internal_key_fail_closed_on_unconfigured_server(self):
        """If server INTERNAL_SERVICE_KEY is empty/unset, fail-closed with HTTP 500."""
        with patch.object(settings, "INTERNAL_SERVICE_KEY", ""):
            with self.assertRaises(HTTPException) as ctx:
                asyncio.run(verify_internal_key("any_key"))
            self.assertEqual(ctx.exception.status_code, 500)
            self.assertIn("AI service internal authentication key is unconfigured", ctx.exception.detail)

    # ==========================================================================
    # 2. Decompression Bomb & Dimension Protections
    # ==========================================================================

    def test_decode_image_valid(self):
        """Valid synthetic image decodes successfully into BGR numpy array."""
        synthetic_img = np.zeros((200, 200, 3), dtype=np.uint8)
        _, encoded = cv2.imencode(".jpg", synthetic_img)
        img_bytes = encoded.tobytes()

        decoded = decode_image_input(img_bytes)
        self.assertIsInstance(decoded, np.ndarray)
        self.assertEqual(decoded.shape, (200, 200, 3))

    def test_decode_image_oversized_dimension_rejected(self):
        """Image with dimension > 4096 px is rejected with ImageDecodeError."""
        # Create header with dimension > MAX_IMAGE_DIMENSION
        synthetic_img = np.zeros((10, MAX_IMAGE_DIMENSION + 50, 3), dtype=np.uint8)
        _, encoded = cv2.imencode(".png", synthetic_img)
        img_bytes = encoded.tobytes()

        with self.assertRaises(ImageDecodeError) as ctx:
            decode_image_input(img_bytes)
        self.assertIn("exceed safety limits", str(ctx.exception))

    def test_decode_image_decompression_bomb_pixel_count_rejected(self):
        """Image with pixel count > 16,777,216 is rejected (decompression bomb protection)."""
        # 4096 * 4097 = 16,781,312 > 16,777,216
        synthetic_img = np.zeros((4097, 4096, 3), dtype=np.uint8)
        _, encoded = cv2.imencode(".png", synthetic_img)
        img_bytes = encoded.tobytes()

        with self.assertRaises(ImageDecodeError) as ctx:
            decode_image_input(img_bytes)
        self.assertIn("exceed safety limits", str(ctx.exception))

    def test_decode_image_corrupted_bytes_rejected(self):
        """Corrupted/invalid bytes raise ImageDecodeError."""
        corrupted_bytes = b"NOT_A_VALID_IMAGE_BUFFER_AT_ALL_12345678"
        with self.assertRaises(ImageDecodeError):
            decode_image_input(corrupted_bytes)

    # ==========================================================================
    # 3. Health Endpoint Privacy
    # ==========================================================================

    @patch("app.routes.health.get_collection_info")
    @patch("app.routes.health.check_qdrant_health", return_value=True)
    def test_health_endpoint_does_not_leak_internals(self, mock_qdrant, mock_coll):
        """Public /health probe does not expose internal collection or model names."""
        mock_coll.return_value = {"status": "green"}
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "ok")
        details = data.get("details", {})
        self.assertNotIn("collection_name", details)
        self.assertNotIn("model_name", details)

    # ==========================================================================
    # 4. OpenAPI Production Hardening
    # ==========================================================================

    def test_production_openapi_docs_disabled(self):
        """When settings.ENVIRONMENT is production, /docs and /openapi.json are disabled."""
        with patch.object(settings, "ENVIRONMENT", "production"):
            prod_app = create_app()
            self.assertIsNone(prod_app.docs_url)
            self.assertIsNone(prod_app.redoc_url)
            self.assertIsNone(prod_app.openapi_url)


if __name__ == "__main__":
    unittest.main()
