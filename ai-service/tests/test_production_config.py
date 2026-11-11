"""
GuardianLink Phase 15: AI Microservice Production Configuration & Security Tests
Verifies fail-closed behavior for secrets, API documentation suppression,
and sensitive key protection.
"""

import pytest
from pydantic import ValidationError
from app.config import Settings
from app.main import create_app
from fastapi.testclient import TestClient


class TestProductionConfiguration:
    """Test suite validating AI microservice production settings schema."""

    def test_production_rejects_default_placeholder_secret(self):
        """Settings must fail closed if placeholder key is used in production."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                INTERNAL_SERVICE_KEY="dev_internal_secret_change_in_production",
            )
        assert "INTERNAL_SERVICE_KEY must be a cryptographically secure" in str(exc_info.value)

    def test_production_rejects_empty_secret(self):
        """Settings must fail closed if key is empty in production."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                INTERNAL_SERVICE_KEY="",
            )
        assert "INTERNAL_SERVICE_KEY must be a cryptographically secure" in str(exc_info.value)

    def test_production_rejects_short_secret(self):
        """Settings must reject secrets shorter than 16 characters in production."""
        with pytest.raises(ValidationError) as exc_info:
            Settings(
                ENVIRONMENT="production",
                INTERNAL_SERVICE_KEY="short_key",
            )
        assert "at least 16 characters" in str(exc_info.value)

    def test_production_accepts_strong_secret(self):
        """Settings accepts cryptographically strong secret in production."""
        strong_key = "a_very_strong_cryptographic_secret_key_32_chars_12345"
        config = Settings(
            ENVIRONMENT="production",
            INTERNAL_SERVICE_KEY=strong_key,
        )
        assert config.ENVIRONMENT == "production"
        assert config.INTERNAL_SERVICE_KEY == strong_key

    def test_development_mode_allows_dev_default(self):
        """Development environment accepts the development default without error."""
        config = Settings(
            ENVIRONMENT="development",
            INTERNAL_SERVICE_KEY="dev_internal_secret_change_in_production",
        )
        assert config.ENVIRONMENT == "development"
        assert config.INTERNAL_SERVICE_KEY == "dev_internal_secret_change_in_production"

    def test_production_mode_disables_api_documentation_endpoints(self, monkeypatch):
        """FastAPI app must disable Swagger UI, ReDoc, and openapi.json in production."""
        monkeypatch.setattr("app.config.settings.ENVIRONMENT", "production")
        prod_app = create_app()

        client = TestClient(prod_app)

        docs_res = client.get("/docs")
        assert docs_res.status_code == 404

        redoc_res = client.get("/redoc")
        assert redoc_res.status_code == 404

        openapi_res = client.get("/openapi.json")
        assert openapi_res.status_code == 404

    def test_health_endpoint_does_not_leak_secrets(self, monkeypatch):
        """Health probe must never return sensitive service keys or connection credentials."""
        monkeypatch.setattr("app.config.settings.ENVIRONMENT", "production")
        prod_app = create_app()
        client = TestClient(prod_app)

        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()

        # Verify essential public status fields
        assert "status" in data
        assert "models_loaded" in data
        assert "qdrant_connected" in data

        # Verify no internal secrets or sensitive keys leaked in payload
        payload_text = res.text
        assert "dev_internal_secret_change_in_production" not in payload_text
        assert "INTERNAL_SERVICE_KEY" not in payload_text
        assert "QDRANT_API_KEY" not in payload_text
