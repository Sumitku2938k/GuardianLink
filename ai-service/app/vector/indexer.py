"""
Vector point indexing module for GuardianLink AI Microservice.
Maps canonical GuardianLink Child ObjectIds to deterministic UUIDv5 Qdrant point IDs,
guaranteeing idempotency and automatic vector replacement upon photo updates.
Strictly minimizes payload to opaque child_id; prevents storage of parental PII.
"""

import uuid
import logging
from typing import Union, List, Dict, Any, Optional
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

from app.config import settings
from app.vector.client import get_qdrant_client
from app.vector.exceptions import (
    InvalidChildIdError,
    InvalidVectorError,
    QdrantConnectionError,
)

logger = logging.getLogger("guardianlink.ai.vector.indexer")

PROHIBITED_PAYLOAD_FIELDS = {
    "name",
    "child_name",
    "parent_name",
    "guardian_name",
    "parent_email",
    "parent_phone",
    "email",
    "phone",
    "contact",
    "password",
    "address",
    "photo_url",
    "image",
    "raw_image",
    "embedding",
    "notes",
    "token",
}


def derive_point_id(child_id: str) -> str:
    """
    Deterministically computes a valid RFC-4122 UUID from a GuardianLink Child ObjectId string.
    Ensures identical child IDs always map to the exact same Qdrant vector point ID.

    Args:
        child_id: Non-empty canonical child identifier string.

    Returns:
        str: Canonical UUIDv5 string representation.

    Raises:
        InvalidChildIdError: If child_id is empty, non-string, or invalid format.
    """
    if not child_id or not isinstance(child_id, str) or not child_id.strip():
        raise InvalidChildIdError("child_id must be a non-empty string identifier")

    return str(uuid.uuid5(uuid.NAMESPACE_URL, child_id.strip()))


def validate_vector(embedding: Union[np.ndarray, List[float]]) -> List[float]:
    """
    Validates a biometric embedding vector against dimensional, numerical, and norm constraints.

    Args:
        embedding: 512-dimensional vector as NumPy array or list of floats.

    Returns:
        List[float]: Validated numerical vector.

    Raises:
        InvalidVectorError: If shape != 512, contains NaN/Inf, or has zero norm.
    """
    if embedding is None:
        raise InvalidVectorError("Vector cannot be None")

    if isinstance(embedding, np.ndarray):
        arr = embedding.astype(np.float32).flatten()
    elif isinstance(embedding, (list, tuple)):
        try:
            arr = np.array(embedding, dtype=np.float32).flatten()
        except (ValueError, TypeError) as exc:
            raise InvalidVectorError(f"Vector elements must be numerical floats: {exc}") from exc
    else:
        raise InvalidVectorError(f"Unsupported vector input type: {type(embedding)}")

    if arr.shape != (512,):
        raise InvalidVectorError(f"Expected 512-dimensional vector, received dimension: {arr.shape[0]}")

    if not np.all(np.isfinite(arr)):
        raise InvalidVectorError("Biometric vector contains non-finite numerical values (NaN or Infinity)")

    norm = float(np.linalg.norm(arr))
    if norm < 1e-6:
        raise InvalidVectorError("Biometric vector has near-zero magnitude and cannot be indexed")

    return arr.tolist()


def upsert_child_vector(
    child_id: str,
    embedding: Union[np.ndarray, List[float]],
    payload: Optional[Dict[str, Any]] = None,
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> str:
    """
    Indexes or overwrites a child's 512-dimensional facial embedding in Qdrant.
    Payload contains strictly minimal metadata (opaque child_id). Zero parent PII is stored.
    Re-indexing the same child updates the identical point_id (idempotent).

    Args:
        child_id: Canonical GuardianLink Child ObjectId.
        embedding: 512-dimensional normalized ArcFace embedding.
        payload: Optional additional metadata (sanitized to remove all PII).
        client: Optional QdrantClient override for testing.
        collection_name: Optional collection name override.

    Returns:
        str: Deterministic UUIDv5 Qdrant point ID.

    Raises:
        InvalidChildIdError: On invalid child_id.
        InvalidVectorError: On invalid embedding vector.
        QdrantConnectionError: On communication failure with Qdrant.
    """
    point_id = derive_point_id(child_id)
    vector_list = validate_vector(embedding)

    point_payload: Dict[str, Any] = {"child_id": str(child_id).strip()}
    if payload and isinstance(payload, dict):
        for k, v in payload.items():
            clean_key = str(k).lower().strip()
            if clean_key not in PROHIBITED_PAYLOAD_FIELDS and clean_key != "child_id":
                point_payload[k] = v

    qdrant = client or get_qdrant_client()
    target_coll = collection_name or settings.COLLECTION_NAME

    try:
        logger.info("Upserting biometric vector for child_id=%s, point_id=%s", child_id, point_id)
        qdrant.upsert(
            collection_name=target_coll,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector_list,
                    payload=point_payload,
                )
            ],
        )
        return point_id
    except Exception as exc:
        logger.error("Failed to upsert vector point %s: %s", point_id, exc)
        raise QdrantConnectionError(f"Failed to upsert vector point into Qdrant: {exc}") from exc


def delete_child_vector(
    child_id: str,
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> str:
    """
    Deletes the child's biometric vector point from Qdrant idempotently.
    Uses deterministic point ID derived from child_id.

    Args:
        child_id: Canonical GuardianLink Child ObjectId.
        client: Optional QdrantClient override for testing.
        collection_name: Optional collection name override.

    Returns:
        str: Removed UUIDv5 Qdrant point ID.

    Raises:
        InvalidChildIdError: On invalid child_id.
        QdrantConnectionError: On communication failure with Qdrant.
    """
    point_id = derive_point_id(child_id)
    qdrant = client or get_qdrant_client()
    target_coll = collection_name or settings.COLLECTION_NAME

    try:
        logger.info("Deleting biometric vector for child_id=%s, point_id=%s", child_id, point_id)
        qdrant.delete(
            collection_name=target_coll,
            points_selector=[point_id],
        )
        return point_id
    except Exception as exc:
        logger.error("Failed to delete vector point %s: %s", point_id, exc)
        raise QdrantConnectionError(f"Failed to delete vector point from Qdrant: {exc}") from exc


def get_child_point(
    child_id: str,
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Diagnostic helper: Retrieves point metadata without returning the full biometric vector.

    Args:
        child_id: Canonical GuardianLink Child ObjectId.
        client: Optional QdrantClient override.
        collection_name: Optional collection name override.

    Returns:
        Optional[Dict[str, Any]]: Point metadata dictionary with 'point_id' and 'payload', or None.
    """
    point_id = derive_point_id(child_id)
    qdrant = client or get_qdrant_client()
    target_coll = collection_name or settings.COLLECTION_NAME

    try:
        points = qdrant.retrieve(
            collection_name=target_coll,
            ids=[point_id],
            with_payload=True,
            with_vectors=False,
        )
        if points:
            p = points[0]
            return {
                "point_id": str(p.id),
                "payload": p.payload or {},
            }
        return None
    except Exception as exc:
        logger.error("Failed to retrieve vector point %s: %s", point_id, exc)
        raise QdrantConnectionError(f"Failed to retrieve vector point from Qdrant: {exc}") from exc
