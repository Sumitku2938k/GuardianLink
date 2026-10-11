"""
Biometric similarity search route handler (Skeleton).
Queries Qdrant for matching candidate facial vectors.
Strictly decoupled from parent PII and document metadata.
"""

from typing import Optional
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
from app.schemas.biometric import SearchResponse

router = APIRouter(prefix="/internal/ai", tags=["Biometric Search"])


@router.post(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    summary="Search for matching child facial vectors (Skeleton)",
    description=(
        "Accepts a query photograph. Validates face presence, extracts embedding, "
        "and queries Qdrant for candidate child_ids. "
        "Returns only child identifiers and similarity scores. Reserved for Phase 6.5."
    ),
)
async def search_child_face(
    file: UploadFile = File(..., description="Query photograph containing a spotted child"),
    limit: int = Form(default=5, description="Maximum number of candidates to retrieve"),
    threshold: Optional[float] = Form(default=None, description="Similarity threshold override"),
    _auth: str = Depends(verify_internal_key),
) -> SearchResponse:
    """
    Phase 6.2 Endpoint Skeleton:
    Returns HTTP 501 Not Implemented until Phase 6.5 implementation.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "Biometric search endpoint skeleton. "
            "Real InsightFace inference and Qdrant similarity matching are deferred to Phase 6.5."
        ),
    )
