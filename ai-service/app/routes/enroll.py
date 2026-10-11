"""
Biometric child enrollment route handler (Skeleton).
Indexes a child reference portrait into the Qdrant vector database.
"""

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
)
from app.middleware.internal_auth import verify_internal_key
from app.schemas.biometric import EnrollResponse

router = APIRouter(prefix="/internal/ai", tags=["Biometric Enrollment"])


@router.post(
    "/enroll",
    response_model=EnrollResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Enroll child facial reference portrait (Skeleton)",
    description=(
        "Accepts a child reference photograph and canonical child_id. "
        "Validates exactly one face, extracts 512-dim ArcFace embedding, "
        "and upserts into Qdrant. Reserved for Phase 6.5."
    ),
)
async def enroll_child_face(
    child_id: str = Form(..., description="Canonical GuardianLink Child ObjectId"),
    file: UploadFile = File(..., description="Portrait image containing exactly one face"),
    _auth: str = Depends(verify_internal_key),
) -> EnrollResponse:
    """
    Phase 6.2 Endpoint Skeleton:
    Returns HTTP 501 Not Implemented until Phase 6.5 implementation.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            f"Biometric enrollment endpoint skeleton for child_id '{child_id}'. "
            "Real InsightFace inference and Qdrant vector indexing are deferred to Phase 6.5."
        ),
    )
