"""
GuardianLink AI Microservice — Application Entrypoint.
FastAPI application factory, lifespan management, and router registration.
Starts cleanly without requiring immediate model weight downloads or running Qdrant instance.
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
from app.vector.client import close_qdrant_client
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
    Handles startup and shutdown events gracefully.
    Model weight loading is deferred to on-demand requests or explicit initialization.
    """
    logger.info("==================================================")
    logger.info("🛡️ GuardianLink AI Microservice Starting Up")
    logger.info("📡 Service Host: %s:%d", settings.HOST, settings.PORT)
    logger.info("⚙️ Model Pack: %s", settings.MODEL_NAME)
    logger.info("🎯 Collection Name: %s", settings.COLLECTION_NAME)
    logger.info("📊 Cosine Threshold: %.2f", settings.FACE_MATCH_THRESHOLD)
    logger.info("==================================================")
    yield
    logger.info("🛡️ GuardianLink AI Microservice Shutting Down")
    close_qdrant_client()


def create_app() -> FastAPI:
    """Application factory building the FastAPI application instance."""
    app = FastAPI(
        title="GuardianLink AI Microservice",
        description="Internal facial biometric recognition and vector similarity search service.",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # --------------------------------------------------------------------------
    # Custom Domain Exception Handlers
    # --------------------------------------------------------------------------

    @app.exception_handler(NoFaceDetectedError)
    async def no_face_handler(request: Request, exc: NoFaceDetectedError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "code": "NO_FACE_DETECTED"},
        )

    @app.exception_handler(MultipleFacesDetectedError)
    async def multiple_faces_handler(request: Request, exc: MultipleFacesDetectedError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "code": "MULTIPLE_FACES_DETECTED"},
        )

    @app.exception_handler(ImageDecodeError)
    async def decode_error_handler(request: Request, exc: ImageDecodeError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "code": "IMAGE_DECODE_FAILED"},
        )

    @app.exception_handler(InvalidEmbeddingError)
    async def invalid_embedding_handler(request: Request, exc: InvalidEmbeddingError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "INVALID_EMBEDDING"},
        )

    @app.exception_handler(InvalidVectorError)
    async def invalid_vector_handler(request: Request, exc: InvalidVectorError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "code": "INVALID_VECTOR"},
        )

    @app.exception_handler(InvalidChildIdError)
    async def invalid_child_id_handler(request: Request, exc: InvalidChildIdError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "code": "INVALID_CHILD_ID"},
        )

    @app.exception_handler(IncompatibleCollectionError)
    async def incompatible_collection_handler(request: Request, exc: IncompatibleCollectionError):
        logger.error("Incompatible collection error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc), "code": "INCOMPATIBLE_COLLECTION"},
        )

    @app.exception_handler(QdrantConnectionError)
    async def qdrant_connection_handler(request: Request, exc: QdrantConnectionError):
        logger.error("Qdrant connection error: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"detail": f"Vector database unavailable: {exc}", "code": "VECTOR_DB_UNAVAILABLE"},
        )

    @app.exception_handler(FaceEngineError)
    async def engine_error_handler(request: Request, exc: FaceEngineError):
        logger.error("Unhandled FaceEngine error: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Biometric engine error: {exc}", "code": "AI_ENGINE_ERROR"},
        )

    # --------------------------------------------------------------------------
    # Router Mounts
    # --------------------------------------------------------------------------
    app.include_router(health_router)
    app.include_router(enroll_router)
    app.include_router(search_router)
    app.include_router(delete_router)

    return app


app = create_app()
