"""
Biometric child enrollment route handler.
Indexes a child reference portrait into the Qdrant vector database.
Enforces exactly-one-face validation, ArcFace 512-dim embedding extraction,
deterministic UUIDv5 derivation, and strictly minimal payload (opaque child_id only).
"""

import logging
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
from app.schemas.biometric import EnrollResponse
from app.utils.upload import read_and_validate_image_upload
from app.engine.embedding import generate_embedding
from app.vector.indexer import upsert_child_vector
from app.vector.exceptions import InvalidChildIdError

logger = logging.getLogger("guardianlink.ai.routes.enroll")

router = APIRouter(tags=["Biometric Enrollment"])


@router.post(
    "/enroll",
    response_model=EnrollResponse,
    status_code=status.HTTP_200_OK,
    summary="Enroll child facial reference portrait",
    description=(
        "Accepts a child reference photograph and canonical child_id. "
        "Validates exactly one face, extracts 512-dim ArcFace embedding, "
        "and upserts into Qdrant using deterministic UUIDv5 point ID."
    ),
)
async def enroll_child_face(
    child_id: str = Form(..., description="Canonical GuardianLink Child ObjectId"),
    file: Optional[UploadFile] = File(default=None, description="Reference portrait image"),
    image: Optional[UploadFile] = File(default=None, description="Alternative field name for reference portrait image"),
    _auth: str = Depends(verify_internal_key),
) -> EnrollResponse:
    """
    Enrolls a single child's facial biometric signature:
    1. Authenticates internal service caller.
    2. Validates non-empty child identifier.
    3. Safely streams and bounds uploaded image.
    4. Runs SCRFD detection and strictly enforces exactly-one-face constraint.
    5. Extracts and normalizes 512-dimensional float32 ArcFace embedding.
    6. Idempotently upserts into standalone Qdrant vector store.
    7. Returns minimal status response (no PII, no raw embeddings).
    """
    if not child_id or not child_id.strip():
        raise InvalidChildIdError("child_id must be a non-empty string identifier")

    clean_child_id = child_id.strip()

    upload = file or image
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image file must be provided under 'file' or 'image' form field.",
        )

    # 1. Safely read and validate upload content
    image_bytes = await read_and_validate_image_upload(upload)

    # 2. Extract and validate 512-dim ArcFace embedding (1-face enforcement)
    logger.info("Generating facial embedding for child_id=%s", clean_child_id)
    embedding = generate_embedding(image_bytes)

    # 3. Upsert into Qdrant collection with deterministic UUIDv5 point ID
    point_id = upsert_child_vector(child_id=clean_child_id, embedding=embedding)

    logger.info("Successfully enrolled child_id=%s with point_id=%s", clean_child_id, point_id)
    return EnrollResponse(
        success=True,
        child_id=clean_child_id,
        face_profile_id=point_id,
        status="enrolled",
        message="Child reference facial biometric enrolled successfully.",
    )
