"""
Vector point indexing module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/vector_db/insert_embedding.py.
Maps canonical GuardianLink Child ObjectIds to deterministic UUIDv5 Qdrant point IDs,
guaranteeing idempotency and automatic vector replacement upon photo updates.
"""

import uuid
import logging
from typing import Union, List, Dict, Any, Optional
import numpy as np
from qdrant_client.models import PointStruct

from app.config import settings
from app.vector.client import get_qdrant_client

logger = logging.getLogger("guardianlink.ai.vector.indexer")


def derive_point_id(child_id: str) -> str:
    """
    Deterministically computes a valid RFC-4122 UUID from a GuardianLink Child ObjectId string.
    Ensures identical child IDs always map to the exact same Qdrant vector point ID.
    Adapted from friend's insert_embedding.py:L26-L31.
    """
    if not child_id or not isinstance(child_id, str):
        raise ValueError("child_id must be a non-empty string identifier")

    return str(uuid.uuid5(uuid.NAMESPACE_URL, child_id.strip()))


def upsert_child_vector(
    child_id: str,
    embedding: Union[np.ndarray, List[float]],
    payload: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Indexes or overwrites a child's 512-dimensional facial embedding in Qdrant.
    Payload contains ONLY child_id reference. Zero parent PII is stored.

    Returns:
        str: Deterministic UUIDv5 Qdrant point ID.
    """
    point_id = derive_point_id(child_id)

    vector_list: List[float] = (
        embedding.tolist() if isinstance(embedding, np.ndarray) else list(embedding)
    )

    if len(vector_list) != 512:
        raise ValueError(f"Expected 512-dimensional vector, received dimension: {len(vector_list)}")

    point_payload: Dict[str, Any] = {"child_id": child_id}
    if payload:
        # Merge sanitized application metadata, filtering out sensitive PII
        for key, val in payload.items():
            if key not in {"parent_email", "parent_phone", "email", "phone", "password"}:
                point_payload[key] = val

    client = get_qdrant_client()

    logger.info("Upserting biometric vector for child_id=%s, point_id=%s", child_id, point_id)
    client.upsert(
        collection_name=settings.COLLECTION_NAME,
        points=[
            PointStruct(
                id=point_id,
                vector=vector_list,
                payload=point_payload,
            )
        ],
    )

    return point_id


def delete_child_vector(child_id: str) -> str:
    """
    Deletes the child's biometric vector point from Qdrant.
    Uses point selector derived from child_id.

    Returns:
        str: Removed UUIDv5 Qdrant point ID.
    """
    point_id = derive_point_id(child_id)
    client = get_qdrant_client()

    logger.info("Deleting biometric vector for child_id=%s, point_id=%s", child_id, point_id)
    client.delete(
        collection_name=settings.COLLECTION_NAME,
        points_selector=[point_id],
    )

    return point_id
