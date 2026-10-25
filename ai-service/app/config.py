"""
Centralized configuration for GuardianLink AI Microservice.
Uses environment variables with safe development defaults.
"""

from typing import Tuple
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings schema backed by environment variables."""

    # Server Network
    HOST: str = Field(default="0.0.0.0", description="Bind host address")
    PORT: int = Field(default=8000, description="Bind port number")
    LOG_LEVEL: str = Field(default="info", description="Logging verbosity")

    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        description="Runtime environment (development, test, or production)",
    )

    # Internal Service Security
    INTERNAL_SERVICE_KEY: str = Field(
        default="dev_internal_secret_change_in_production",
        description="Shared secret for X-Internal-Service-Key authentication",
    )

    # Qdrant Vector Database
    QDRANT_URL: str = Field(
        default="http://localhost:6333",
        description="HTTP endpoint of the standalone Qdrant service",
    )
    QDRANT_API_KEY: str | None = Field(
        default=None,
        description="Optional API key for authenticated Qdrant instances",
    )
    COLLECTION_NAME: str = Field(
        default="missing_person_faces",
        description="Target Qdrant collection name for child facial embeddings",
    )
    QDRANT_TIMEOUT_SECONDS: float = Field(
        default=10.0,
        ge=1.0,
        le=60.0,
        description="Network timeout in seconds for Qdrant client operations",
    )

    # Biometric Model Configuration
    MODEL_NAME: str = Field(
        default="buffalo_l",
        description="InsightFace model pack name",
    )
    DETECTION_SIZE: Tuple[int, int] = Field(
        default=(640, 640),
        description="Input dimensions for SCRFD face detector (width, height)",
    )
    INSIGHTFACE_HOME: str | None = Field(
        default=None,
        description="Custom root directory for cached model weights",
    )

    # Similarity Threshold (provisional baseline from Phase 6.1 audit)
    FACE_MATCH_THRESHOLD: float = Field(
        default=0.60,
        ge=-1.0,
        le=1.0,
        description="Minimum cosine similarity required to flag a candidate potential match",
    )

    # Safe Upload Limits
    MAX_UPLOAD_SIZE_BYTES: int = Field(
        default=10 * 1024 * 1024,  # 10 MB
        ge=1024,
        description="Maximum allowed image upload size in bytes (default: 10 MB)",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global singleton instance
settings = Settings()
