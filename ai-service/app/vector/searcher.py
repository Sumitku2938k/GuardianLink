"""
Vector similarity search module for GuardianLink AI Microservice.
Executes Cosine similarity queries against Qdrant and returns pure candidate matches.
Strictly decoupled from document databases and parent contact information.
Guarantees minimal returned payload (child_id, similarity, point_id only).
"""

import logging
from typing import Union, List, Dict, Any, Optional
import numpy as np
from qdrant_client import QdrantClient

from app.config import settings
from app.vector.client import get_qdrant_client
from app.vector.indexer import validate_vector
from app.vector.exceptions import (
    InvalidVectorError,
    QdrantConnectionError,
    VectorStoreError,
)

logger = logging.getLogger("guardianlink.ai.vector.searcher")


def search_similar_faces(
    embedding: Union[np.ndarray, List[float]],
    limit: int = 5,
    threshold: Optional[float] = None,
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Queries Qdrant for facial vectors closest to the input query embedding using Cosine similarity.

    Args:
        embedding: 512-dimensional query vector.
        limit: Maximum number of points to retrieve from Qdrant (1 to 50).
        threshold: Minimum cosine similarity score. Defaults to settings.FACE_MATCH_THRESHOLD.
        client: Optional QdrantClient override for testing.
        collection_name: Optional collection name override.

    Returns:
        List of candidate dictionaries:
        [
            {
                "child_id": "6740b2a8d1e4c89a71e21b34",
                "similarity": 0.842105,
                "point_id": "c86a1df8-..."
            }
        ]

    Raises:
        InvalidVectorError: If query embedding fails numerical/dimensional checks.
        ValueError: If limit or threshold parameters are out of acceptable bounds.
        QdrantConnectionError: If Qdrant server is unreachable or fails to respond.
    """
    vector_list = validate_vector(embedding)

    if not isinstance(limit, int) or limit < 1 or limit > 50:
        raise ValueError(f"limit must be an integer between 1 and 50, received: {limit}")

    active_threshold = threshold if threshold is not None else settings.FACE_MATCH_THRESHOLD
    if not isinstance(active_threshold, (int, float)) or active_threshold < -1.0 or active_threshold > 1.0:
        raise ValueError(f"threshold must be a float between -1.0 and 1.0, received: {active_threshold}")

    qdrant = client or get_qdrant_client()
    target_coll = collection_name or settings.COLLECTION_NAME

    try:
        logger.info(
            "Executing Qdrant similarity search on collection '%s' (limit=%d, threshold=%.2f)",
            target_coll,
            limit,
            active_threshold,
        )

        results = qdrant.query_points(
            collection_name=target_coll,
            query=vector_list,
            limit=limit,
            score_threshold=float(active_threshold),
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

        logger.info(
            "Search on '%s' yielded %d candidate(s) meeting similarity threshold %.2f",
            target_coll,
            len(candidates),
            active_threshold,
        )
        return candidates

    except (InvalidVectorError, ValueError):
        raise
    except Exception as exc:
        logger.error("Failed to execute similarity search on '%s': %s", target_coll, exc)
        raise QdrantConnectionError(f"Similarity search failed against Qdrant: {exc}") from exc
