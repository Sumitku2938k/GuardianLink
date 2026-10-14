"""
Health check and diagnostic route handlers.
Provides readiness and liveness probes for Docker and GuardianLink backend monitoring.
Evaluates microservice status non-destructively without triggering model loading.
"""

from fastapi import APIRouter, status
from app.schemas.biometric import HealthResponse
from app.engine.face_engine import FaceEngine
from app.vector.client import check_qdrant_health
from app.vector.store import get_collection_info
from app.config import settings

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System health status",
    description=(
        "Returns microservice health, model loaded state, "
        "vector database connectivity, and collection readiness."
    ),
)
async def get_health() -> HealthResponse:
    """
    Evaluates microservice health and dependency readiness.
    Probes runtime dependencies non-destructively without loading model weights into memory.
    Distinguishes fully operational state ('ok') from degraded state ('degraded').
    """
    models_loaded = FaceEngine.get_instance().is_loaded()
    qdrant_connected = check_qdrant_health()

    collection_ready = False
    if qdrant_connected:
        try:
            get_collection_info()
            collection_ready = True
        except Exception:
            collection_ready = False

    # Status is 'ok' only when Qdrant is connected and collection is verified ready
    overall_status = "ok" if (qdrant_connected and collection_ready) else "degraded"

    return HealthResponse(
        status=overall_status,
        service="guardianlink-ai-service",
        version="1.0.0",
        models_loaded=models_loaded,
        qdrant_connected=qdrant_connected,
        details={
            "collection_name": settings.COLLECTION_NAME,
            "collection_ready": collection_ready,
            "model_name": settings.MODEL_NAME,
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
