"""
Biometric vector deletion route handler.
Removes child vector points from Qdrant upon profile deactivation, case resolution, or cleanup.
Uses deterministic UUIDv5 derivation to guarantee idempotency.
Strictly confined to vector deletion: never modifies MongoDB records or Cloudinary assets.
"""

import logging
from fastapi import (
    APIRouter,
    Depends,
    status,
)

from app.middleware.internal_auth import verify_internal_key
from app.schemas.biometric import DeleteResponse
from app.vector.indexer import delete_child_vector
from app.vector.exceptions import InvalidChildIdError

logger = logging.getLogger("guardianlink.ai.routes.delete")

router = APIRouter(tags=["Biometric Deletion"])


async def _handle_child_vector_deletion(
    child_id: str,
) -> DeleteResponse:
    """Internal deletion logic shared between route aliases."""
    if not child_id or not child_id.strip():
        raise InvalidChildIdError("child_id must be a non-empty string identifier")

    clean_child_id = child_id.strip()

    logger.info("Processing biometric vector deletion for child_id=%s", clean_child_id)
    point_id = delete_child_vector(child_id=clean_child_id)

    logger.info("Successfully deleted biometric vector for child_id=%s (point_id=%s)", clean_child_id, point_id)
    return DeleteResponse(
        success=True,
        child_id=clean_child_id,
        face_profile_id=point_id,
        message="Child biometric vector deleted successfully.",
    )


@router.delete(
    "/delete/{child_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete child biometric vector from Qdrant (Phase 6.2 format)",
    description=(
        "Removes the deterministic UUIDv5 vector point associated with child_id from Qdrant. "
        "Idempotent: repeated deletions succeed cleanly."
    ),
)
async def delete_child_face_v1(
    child_id: str,
    _auth: str = Depends(verify_internal_key),
) -> DeleteResponse:
    return await _handle_child_vector_deletion(child_id)


@router.delete(
    "/{child_id}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete child biometric vector from Qdrant (RESTful format)",
    description=(
        "Removes the deterministic UUIDv5 vector point associated with child_id from Qdrant. "
        "Supports direct RESTful path /internal/face/{child_id}."
    ),
)
async def delete_child_face_v2(
    child_id: str,
    _auth: str = Depends(verify_internal_key),
) -> DeleteResponse:
    return await _handle_child_vector_deletion(child_id)
