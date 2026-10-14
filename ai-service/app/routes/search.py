"""
Biometric similarity search route handler.
Queries Qdrant for matching candidate facial vectors.
Strictly decoupled from parent PII, contact info, and document metadata.
Returns minimal candidate information (child_id and mathematical similarity score only).
"""

import logging
from typing import Optional, List
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
)

from app.config import settings
from app.middleware.internal_auth import verify_internal_key
from app.schemas.biometric import SearchResponse, CandidateMatch
from app.utils.upload import read_and_validate_image_upload
from app.engine.embedding import generate_embedding
from app.vector.searcher import search_similar_faces

logger = logging.getLogger("guardianlink.ai.routes.search")

router = APIRouter(tags=["Biometric Search"])


@router.post(
    "/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
    summary="Search for matching child facial vectors",
    description=(
        "Accepts a query photograph. Validates face presence, extracts ArcFace 512-dim embedding, "
        "and queries Qdrant for candidate child_ids using Cosine distance. "
        "Returns candidates in descending similarity order with zero PII."
    ),
)
async def search_child_face(
    file: Optional[UploadFile] = File(default=None, description="Query photograph containing a spotted child"),
    image: Optional[UploadFile] = File(default=None, description="Alternative field name for query photograph"),
    limit: Optional[int] = Form(default=None, description="Maximum number of candidates to retrieve (1 to 50)"),
    top_k: Optional[int] = Form(default=None, description="Alternative parameter for maximum candidates to retrieve (1 to 50)"),
    threshold: Optional[float] = Form(default=None, description="Cosine similarity threshold override (-1.0 to 1.0)"),
    _auth: str = Depends(verify_internal_key),
) -> SearchResponse:
    """
    Executes biometric similarity query against Qdrant:
    1. Authenticates internal service caller.
    2. Validates bounded query parameters (limit / top_k and threshold).
    3. Safely streams and bounds uploaded image.
    4. Runs SCRFD detection and extracts 512-dim query embedding.
    5. Queries Qdrant using Cosine similarity.
    6. Returns ranked candidate matches (highest similarity first).
    """
    upload = file or image
    if upload is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image file must be provided under 'file' or 'image' form field.",
        )

    # Resolve active limit / top_k
    active_limit = top_k if top_k is not None else (limit if limit is not None else 5)
    if not isinstance(active_limit, int) or active_limit < 1 or active_limit > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"top_k / limit must be an integer between 1 and 50, received: {active_limit}",
        )

    # Validate optional threshold override
    if threshold is not None:
        if not isinstance(threshold, (int, float)) or threshold < -1.0 or threshold > 1.0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"threshold must be a float between -1.0 and 1.0, received: {threshold}",
            )

    active_threshold = threshold if threshold is not None else settings.FACE_MATCH_THRESHOLD

    # 1. Safely read and validate upload content
    image_bytes = await read_and_validate_image_upload(upload)

    # 2. Extract and validate 512-dim ArcFace embedding
    logger.info("Generating facial embedding for similarity search")
    query_embedding = generate_embedding(image_bytes)

    # 3. Query Qdrant vector index
    raw_candidates = search_similar_faces(
        embedding=query_embedding,
        limit=active_limit,
        threshold=active_threshold,
    )

    # 4. Map candidates to CandidateMatch schema (highest similarity first)
    candidates: List[CandidateMatch] = [
        CandidateMatch(
            child_id=str(c["child_id"]),
            similarity=float(c["similarity"]),
        )
        for c in raw_candidates
    ]

    match_found = len(candidates) > 0
    message = (
        f"Found {len(candidates)} candidate match(es) meeting threshold {active_threshold:.2f}"
        if match_found
        else f"No candidate matches found meeting threshold {active_threshold:.2f}"
    )

    logger.info("Search completed: %d match(es) found", len(candidates))
    return SearchResponse(
        match_found=match_found,
        candidates=candidates,
        total_candidates=len(candidates),
        threshold_applied=float(active_threshold),
        message=message,
    )
