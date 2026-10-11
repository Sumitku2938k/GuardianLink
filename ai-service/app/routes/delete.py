"""
Biometric vector deletion route handler (Skeleton).
Removes child vector points from Qdrant upon profile deactivation or hard cleanup.
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from app.middleware.internal_auth import verify_internal_key
from app.schemas.biometric import DeleteResponse

router = APIRouter(prefix="/internal/ai", tags=["Biometric Deletion"])


@router.delete(
    "/delete/{child_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Delete child biometric vector from Qdrant (Skeleton)",
    description=(
        "Removes the deterministic UUIDv5 vector point associated with child_id from Qdrant. "
        "Reserved for Phase 6.5."
    ),
)
async def delete_child_face(
    child_id: str,
    _auth: str = Depends(verify_internal_key),
) -> DeleteResponse:
    """
    Phase 6.2 Endpoint Skeleton:
    Returns HTTP 501 Not Implemented until Phase 6.5 implementation.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            f"Biometric vector deletion endpoint skeleton for child_id '{child_id}'. "
            "Real Qdrant vector deletion is deferred to Phase 6.5."
        ),
    )
