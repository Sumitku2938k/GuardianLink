"""
Vector similarity search module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/vector_db/search_embedding.py.
Executes Cosine similarity queries against Qdrant and returns pure candidate matches.
Strictly decoupled from document databases and parent contact information.
"""

import logging
from typing import Union, List, Dict, Any, Optional
import numpy as np

from app.config import settings
from app.vector.client import get_qdrant_client

logger = logging.getLogger("guardianlink.ai.vector.searcher")


def search_similar_faces(
    embedding: Union[np.ndarray, List[float]],
    limit: int = 5,
    threshold: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Queries Qdrant for facial vectors closest to the input query embedding.
    Adapted from friend's search_embedding.py:search_face().

    Args:
        embedding: 512-dimensional query vector.
        limit: Maximum number of points to retrieve from Qdrant.
        threshold: Minimum cosine similarity score. Defaults to settings.FACE_MATCH_THRESHOLD.

    Returns:
        List of candidate dictionaries:
        [
            {
                "child_id": "6740b2a8d1e4c89a71e21b34",
                "similarity": 0.842105,
                "point_id": "c86a1df8-..."
            }
        ]
        STRICT PRIVACY: Never queries MongoDB, never returns parent PII.
    """
    vector_list: List[float] = (
        embedding.tolist() if isinstance(embedding, np.ndarray) else list(embedding)
    )

    if len(vector_list) != 512:
        raise ValueError(f"Expected 512-dimensional query vector, received dimension: {len(vector_list)}")

    active_threshold = threshold if threshold is not None else settings.FACE_MATCH_THRESHOLD
    client = get_qdrant_client()

    logger.info("Executing Qdrant similarity search (limit=%d, threshold=%.2f)", limit, active_threshold)

    results = client.query_points(
        collection_name=settings.COLLECTION_NAME,
        query=vector_list,
        limit=limit,
        with_payload=True,
    )

    candidates: List[Dict[str, Any]] = []

    for point in results.points:
        score = float(point.score)
        if score >= active_threshold:
            payload = point.payload or {}
            child_id = payload.get("child_id") or payload.get("missing_person_id")

            if child_id:
                candidates.append({
                    "child_id": str(child_id),
                    "similarity": round(score, 6),
                    "point_id": str(point.id),
                })

    logger.info("Search yielded %d candidate(s) meeting similarity threshold %.2f", len(candidates), active_threshold)
    return candidates
