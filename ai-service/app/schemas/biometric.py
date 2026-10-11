"""
Typed Pydantic schemas for biometric API contracts.
Enforces strict separation of concerns: ZERO parent PII is permitted in AI contracts.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ------------------------------------------------------------------------------
# System & Health Schemas
# ------------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """System health and readiness status."""

    status: str = Field(..., example="ok", description="Overall service status ('ok' or 'degraded')")
    service: str = Field(default="guardianlink-ai-service", description="Service identifier")
    version: str = Field(default="1.0.0", description="Service semantic version")
    models_loaded: bool = Field(default=False, description="True if InsightFace weights are in memory")
    qdrant_connected: bool = Field(default=False, description="True if Qdrant vector database is reachable")
    details: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic details")


# ------------------------------------------------------------------------------
# Face Detection Schemas
# ------------------------------------------------------------------------------

class FaceBoundingBox(BaseModel):
    """Integer bounding box coordinates [x1, y1, x2, y2]."""

    x1: int = Field(..., description="Top-left X coordinate")
    y1: int = Field(..., description="Top-left Y coordinate")
    x2: int = Field(..., description="Bottom-right X coordinate")
    y2: int = Field(..., description="Bottom-right Y coordinate")


class FaceDetectionResult(BaseModel):
    """Single detected face profile."""

    bbox: List[int] = Field(..., description="Bounding box [x1, y1, x2, y2]", example=[120, 85, 340, 390])
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score", example=0.9984)


# ------------------------------------------------------------------------------
# Enrollment Schemas (Child Face Indexing)
# ------------------------------------------------------------------------------

class EnrollRequest(BaseModel):
    """
    Metadata for child biometric enrollment.
    Binary image is transmitted via multipart/form-data.
    """

    child_id: str = Field(..., min_length=1, description="Canonical GuardianLink Child ObjectId", example="6740b2a8d1e4c89a71e21b34")


class EnrollResponse(BaseModel):
    """Result of child biometric vector indexing."""

    success: bool = Field(..., description="True if embedding was extracted and indexed")
    child_id: str = Field(..., description="Canonical Child ObjectId")
    face_profile_id: str = Field(..., description="Deterministic UUIDv5 point ID stored in Qdrant")
    status: str = Field(default="enrolled", description="Enrollment status indicator")
    message: str = Field(..., description="Human-readable outcome description")


# ------------------------------------------------------------------------------
# Search & Matching Schemas (Citizen / Public Sighting Scan)
# ------------------------------------------------------------------------------

class CandidateMatch(BaseModel):
    """
    Mathematical similarity match candidate.
    STRICT PRIVACY: Excludes all demographic, parental, and contact information.
    """

    child_id: str = Field(..., description="Canonical Child ObjectId matching the vector")
    similarity: float = Field(..., ge=-1.0, le=1.0, description="Cosine similarity score (range -1.0 to 1.0)", example=0.842)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Optional detection confidence score")


class SearchRequest(BaseModel):
    """Optional search parameters accompanying the multipart image upload."""

    limit: int = Field(default=5, ge=1, le=50, description="Maximum number of candidate matches to return")
    threshold: Optional[float] = Field(default=None, ge=-1.0, le=1.0, description="Custom similarity threshold override")


class SearchResponse(BaseModel):
    """
    Biometric similarity search response.
    GuardianLink Node backend will resolve candidate child_ids against MissingCase records.
    """

    match_found: bool = Field(..., description="True if at least one candidate meets the threshold")
    candidates: List[CandidateMatch] = Field(default_factory=list, description="Ranked list of matching candidates")
    total_candidates: int = Field(default=0, description="Number of candidates meeting the threshold")
    threshold_applied: float = Field(..., description="Similarity threshold applied for this query")
    message: str = Field(..., description="Outcome description")


# ------------------------------------------------------------------------------
# Vector Deletion Schemas
# ------------------------------------------------------------------------------

class DeleteResponse(BaseModel):
    """Result of vector point deletion from Qdrant."""

    success: bool = Field(..., description="True if the vector was removed")
    child_id: str = Field(..., description="Canonical Child ObjectId")
    face_profile_id: str = Field(..., description="Deterministic UUIDv5 point ID removed from Qdrant")
    message: str = Field(..., description="Outcome description")


# ------------------------------------------------------------------------------
# Standard Error Response Schema
# ------------------------------------------------------------------------------

class ErrorDetailResponse(BaseModel):
    """Standardized error format."""

    detail: str = Field(..., description="Error message or validation failure reason")
    code: Optional[str] = Field(default=None, description="Domain error code (e.g. NO_FACE_DETECTED)")
