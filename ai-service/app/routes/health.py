"""
Health check and diagnostic route handlers.
Provides readiness and liveness probes for Docker and GuardianLink backend monitoring.
"""

from fastapi import APIRouter, status
from app.schemas.biometric import HealthResponse
from app.engine.face_engine import FaceEngine
from app.vector.client import check_qdrant_health
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System health status",
    description="Returns microservice health, model loaded state, and vector database connectivity.",
)
async def get_health() -> HealthResponse:
    """
    Evaluates microservice health.
    Does not trigger model weight loading; probes runtime status non-destructively.
    """
    models_loaded = FaceEngine.get_instance().is_loaded()
    qdrant_connected = check_qdrant_health()

    return HealthResponse(
        status="ok",
        service="guardianlink-ai-service",
        version="1.0.0",
        models_loaded=models_loaded,
        qdrant_connected=qdrant_connected,
        details={
            "model_name": settings.MODEL_NAME,
            "collection_name": settings.COLLECTION_NAME,
            "threshold": settings.FACE_MATCH_THRESHOLD,
        },
    )


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def root_ping():
    """Minimal root welcome endpoint."""
    return {
        "message": "GuardianLink AI Microservice is online",
        "docs_url": "/docs",
        "health_url": "/health",
    }
