"""
GuardianLink AI Microservice — Application Entrypoint.
FastAPI application factory, lifespan management, and router registration.
Wires Phase 6.3 biometric face engine and Phase 6.4 Qdrant vector store
through authenticated, validated REST endpoints.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes import health_router, enroll_router, search_router, delete_router
from app.engine.face_engine import (
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
    InvalidEmbeddingError,
    FaceEngineError,
)
from app.vector.client import close_qdrant_client, check_qdrant_health
from app.vector.store import ensure_collection_exists
from app.vector.exceptions import (
    VectorStoreError,
    QdrantConnectionError,
    IncompatibleCollectionError,
    InvalidVectorError,
    InvalidChildIdError,
)

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("guardianlink.ai.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Handles startup dependency verification and shutdown cleanups gracefully.
    Model weight loading remains deferred to on-demand requests.
    """
    logger.info("==================================================")
    logger.info("🛡️ GuardianLink AI Microservice Starting Up")
    logger.info("📡 Service Host: %s:%d", settings.HOST, settings.PORT)
    logger.info("⚙️ Model Pack: %s", settings.MODEL_NAME)
    logger.info("🎯 Collection Name: %s", settings.COLLECTION_NAME)
    logger.info("📊 Cosine Threshold: %.2f", settings.FACE_MATCH_THRESHOLD)
    logger.info("📦 Max Upload Limit: %d bytes", settings.MAX_UPLOAD_SIZE_BYTES)
    logger.info("==================================================")

    # Initialize collection if standalone Qdrant is reachable
    try:
        if check_qdrant_health():
            ensure_collection_exists()
            logger.info("✅ Verified Qdrant collection '%s'", settings.COLLECTION_NAME)
        else:
            logger.warning("⚠️ Qdrant server is currently offline; collection setup deferred.")
    except Exception as exc:
        logger.warning("⚠️ Could not verify Qdrant collection on startup: %s", exc)

    yield

    logger.info("🛡️ GuardianLink AI Microservice Shutting Down")
    close_qdrant_client()


def create_app() -> FastAPI:
    """Application factory building the FastAPI application instance."""
    is_production = settings.ENVIRONMENT.lower() == "production"
    app = FastAPI(
        title="GuardianLink AI Microservice",
        description="Internal facial biometric recognition and vector similarity search service.",
        version="1.0.0",
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
        lifespan=lifespan,
    )

    # --------------------------------------------------------------------------
    # Custom Domain Exception Handlers (Consistent HTTP Status Code Mapping)
    # --------------------------------------------------------------------------

    @app.exception_handler(NoFaceDetectedError)
    async def no_face_handler(request: Request, exc: NoFaceDetectedError):
        logger.info("Face detection rejection: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "NO_FACE_DETECTED"},
        )

    @app.exception_handler(MultipleFacesDetectedError)
    async def multiple_faces_handler(request: Request, exc: MultipleFacesDetectedError):
        logger.info("Face detection rejection: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "MULTIPLE_FACES_DETECTED"},
        )

    @app.exception_handler(ImageDecodeError)
    async def decode_error_handler(request: Request, exc: ImageDecodeError):
        logger.warning("Image decode error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "IMAGE_DECODE_FAILED"},
        )

    @app.exception_handler(InvalidEmbeddingError)
    async def invalid_embedding_handler(request: Request, exc: InvalidEmbeddingError):
        logger.error("Invalid embedding extracted: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "INVALID_EMBEDDING"},
        )

    @app.exception_handler(InvalidVectorError)
    async def invalid_vector_handler(request: Request, exc: InvalidVectorError):
        logger.error("Invalid vector rejected: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "INVALID_VECTOR"},
        )

    @app.exception_handler(InvalidChildIdError)
    async def invalid_child_id_handler(request: Request, exc: InvalidChildIdError):
        logger.warning("Invalid child ID rejected: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "code": "INVALID_CHILD_ID"},
        )

    @app.exception_handler(IncompatibleCollectionError)
    async def incompatible_collection_handler(request: Request, exc: IncompatibleCollectionError):
        logger.error("Incompatible collection error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Vector database collection configuration mismatch.", "code": "INCOMPATIBLE_COLLECTION"},
        )

    @app.exception_handler(QdrantConnectionError)
    async def qdrant_connection_handler(request: Request, exc: QdrantConnectionError):
        logger.error("Qdrant connection error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": "Vector database service unavailable.", "code": "VECTOR_DB_UNAVAILABLE"},
        )

    @app.exception_handler(FaceEngineError)
    async def engine_error_handler(request: Request, exc: FaceEngineError):
        logger.error("Unhandled FaceEngine error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Biometric face engine error.", "code": "AI_ENGINE_ERROR"},
        )

    # --------------------------------------------------------------------------
    # Router Mounts (Dual-prefix support for Phase 6.1/6.2 and Phase 6.5 paths)
    # --------------------------------------------------------------------------
    app.include_router(health_router)

    # Phase 6.1 / 6.2 prefix: /internal/ai/*
    app.include_router(enroll_router, prefix="/internal/ai")
    app.include_router(search_router, prefix="/internal/ai")
    app.include_router(delete_router, prefix="/internal/ai")

    # Phase 6.5 contract prefix alias: /internal/face/*
    app.include_router(enroll_router, prefix="/internal/face")
    app.include_router(search_router, prefix="/internal/face")
    app.include_router(delete_router, prefix="/internal/face")

    return app


app = create_app()
