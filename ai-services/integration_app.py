import os
import sys
import uuid
import tempfile
import logging
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("guardianlink-ai-integration")

# Ensure ai-services root is in Python module path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Reuse friend's original unmodified embedding generation function
from ai.face.embedding import generate_embedding

# Configuration & Environment
AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "guardianlink_ai_internal_secret_2026")
QDRANT_STORAGE_PATH = os.getenv("GUARDIANLINK_QDRANT_PATH", str(BASE_DIR / "guardianlink_qdrant_data"))
COLLECTION_NAME = os.getenv("GUARDIANLINK_QDRANT_COLLECTION", "guardianlink_children_faces")
VECTOR_DIMENSION = 512
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB limit

# Ensure isolated Qdrant directory exists
os.makedirs(QDRANT_STORAGE_PATH, exist_ok=True)

# Dedicated isolated Qdrant client instance
qdrant_client = QdrantClient(path=QDRANT_STORAGE_PATH)

def init_qdrant_collection():
    """Ensure dedicated GuardianLink collection exists with cosine distance"""
    try:
        collections = qdrant_client.get_collections()
        existing = [c.name for c in collections.collections]
        if COLLECTION_NAME not in existing:
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=VECTOR_DIMENSION,
                    distance=Distance.COSINE
                )
            )
            logger.info(f"Created dedicated GuardianLink Qdrant collection: {COLLECTION_NAME}")
        else:
            logger.info(f"GuardianLink Qdrant collection already initialized: {COLLECTION_NAME}")
    except Exception as e:
        logger.error(f"Failed to initialize Qdrant collection: {e}")
        raise e

init_qdrant_collection()

# FastAPI Application
app = FastAPI(
    title="GuardianLink AI Integration Service",
    description="Dedicated Face Recognition & Vector Search Integration Microservice for GuardianLink",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_service_secret(
    x_ai_service_secret: Optional[str] = Header(None, alias="X-AI-Service-Secret"),
    authorization: Optional[str] = Header(None)
):
    """
    Validates service-to-service authentication header.
    Accepts X-AI-Service-Secret or Bearer token matching AI_SERVICE_SECRET.
    """
    provided_secret = None
    if x_ai_service_secret:
        provided_secret = x_ai_service_secret
    elif authorization and authorization.startswith("Bearer "):
        provided_secret = authorization.split(" ")[1]

    if not provided_secret or provided_secret != AI_SERVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "UNAUTHORIZED_SERVICE_CALL",
                "message": "Invalid or missing service authentication credentials."
            }
        )
    return True


def deterministic_uuid(child_id: str) -> str:
    """Derive deterministic UUID from MongoDB childId for 1:1 Qdrant point lookup"""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, str(child_id)))


@app.get("/")
def root():
    return {
        "service": "GuardianLink AI Integration Service",
        "status": "operational",
        "version": "1.0.0"
    }


@app.get("/integration/health")
def health_check(authenticated: bool = Depends(verify_service_secret)):
    """Health check endpoint verifying Qdrant persistence and readiness"""
    try:
        collections = qdrant_client.get_collections()
        info = qdrant_client.get_collection(COLLECTION_NAME)
        return {
            "status": "ok",
            "service": "guardianlink-ai-integration",
            "collection": COLLECTION_NAME,
            "points_count": info.points_count,
            "vector_size": VECTOR_DIMENSION,
            "distance": "Cosine"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "error", "error": str(e)}
        )


@app.post("/integration/enroll/{childId}")
async def enroll_child(
    childId: str,
    file: UploadFile = File(...),
    authenticated: bool = Depends(verify_service_secret)
):
    """
    Enrolls a child's facial biometric embedding into GuardianLink's dedicated Qdrant collection.
    Reuses existing generate_embedding() and InsightFace single-face validation.
    """
    if not childId or not childId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CHILD_ID", "message": "childId parameter is required."}
        )

    # Validate file extension / MIME
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_IMAGE_TYPE",
                "message": f"Unsupported file type {file.content_type}. Allowed: JPEG, PNG, WEBP."
            }
        )

    temp_path = None
    try:
        # Read content and enforce size boundary
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "EMPTY_FILE", "message": "Uploaded image file is empty."}
            )
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "FILE_TOO_LARGE", "message": "Uploaded image exceeds 10MB limit."}
            )

        # Write to temporary file for cv2.imread inside generate_embedding()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(content)
            temp_path = tmp.name

        # Call existing unmodified embedding function
        try:
            embedding = generate_embedding(temp_path)
        except ValueError as val_err:
            err_msg = str(val_err)
            if "No face detected" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "NO_FACE_DETECTED", "message": "No human face was detected in the photo."}
                )
            elif "Multiple faces detected" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "MULTIPLE_FACES_DETECTED", "message": "Multiple faces detected. Please upload an image with exactly one child face."}
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "IMAGE_PROCESSING_ERROR", "message": err_msg}
                )

        if embedding is None or len(embedding) != VECTOR_DIMENSION:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "EMBEDDING_GENERATION_FAILED", "message": "Could not generate valid 512-d vector."}
            )

        qdrant_id = deterministic_uuid(childId.strip())

        # Upsert point to dedicated collection
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=qdrant_id,
                    vector=embedding.tolist(),
                    payload={
                        "child_id": childId.strip()
                    }
                )
            ]
        )

        logger.info(f"Enrolled child {childId} into Qdrant ID: {qdrant_id}")
        return {
            "success": True,
            "childId": childId.strip(),
            "qdrantId": qdrant_id,
            "dimension": VECTOR_DIMENSION,
            "status": "enrolled"
        }

    finally:
        # Safe temporary-file cleanup
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to unlink temp file {temp_path}: {e}")


@app.delete("/integration/enroll/{childId}")
def unenroll_child(
    childId: str,
    authenticated: bool = Depends(verify_service_secret)
):
    """
    Deletes the child's facial biometric vector from GuardianLink's Qdrant collection.
    Used on child deactivation or photo deletion.
    """
    if not childId or not childId.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_CHILD_ID", "message": "childId parameter is required."}
        )

    qdrant_id = deterministic_uuid(childId.strip())

    try:
        qdrant_client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=[qdrant_id]
        )
        logger.info(f"Unenrolled child {childId} (Qdrant ID: {qdrant_id})")
        return {
            "success": True,
            "childId": childId.strip(),
            "qdrantId": qdrant_id,
            "status": "deleted"
        }
    except Exception as e:
        logger.error(f"Failed to unenroll child {childId}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DELETE_FAILED", "message": str(e)}
        )


@app.post("/integration/search")
async def search_faces(
    file: UploadFile = File(...),
    limit: int = Form(5),
    threshold: float = Form(0.55),
    authenticated: bool = Depends(verify_service_secret)
):
    """
    Searches candidate children faces matching the input photo.
    Returns only candidate child IDs and similarity scores.
    Does NOT query or return private guardian contact details.
    """
    temp_path = None
    try:
        content = await file.read()
        if len(content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "EMPTY_FILE", "message": "Uploaded query photo is empty."}
            )
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "FILE_TOO_LARGE", "message": "Uploaded query photo exceeds 10MB limit."}
            )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(content)
            temp_path = tmp.name

        try:
            embedding = generate_embedding(temp_path)
        except ValueError as val_err:
            err_msg = str(val_err)
            if "No face detected" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "NO_FACE_DETECTED", "message": "No human face was detected in the query photo."}
                )
            elif "Multiple faces detected" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "MULTIPLE_FACES_DETECTED", "message": "Multiple faces detected in query photo. Please submit a single-person photo."}
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "IMAGE_PROCESSING_ERROR", "message": err_msg}
                )

        if embedding is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "EMBEDDING_FAILED", "message": "Could not generate query embedding."}
            )

        # Search Qdrant dedicated collection
        results = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding.tolist(),
            limit=limit,
            score_threshold=threshold,
            with_payload=True
        )

        matches = []
        for point in results.points:
            child_id = point.payload.get("child_id") if point.payload else None
            score = float(point.score)
            matches.append({
                "childId": child_id,
                "score": round(score, 4),
                "confidence": f"{round(score * 100, 1)}%"
            })

        return {
            "success": True,
            "total_candidates": len(matches),
            "matches": matches
        }

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.warning(f"Failed to unlink temp file {temp_path}: {e}")
