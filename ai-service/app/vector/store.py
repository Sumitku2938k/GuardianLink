"""
Qdrant collection configuration and lifecycle management.
Configures 512-dimensional Cosine vector index on standalone Qdrant instance.
Enforces configuration validation: rejects incompatible collection settings without deleting existing data.
"""

import logging
from typing import Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.config import settings
from app.vector.client import get_qdrant_client
from app.vector.exceptions import IncompatibleCollectionError, QdrantConnectionError

logger = logging.getLogger("guardianlink.ai.vector.store")

VECTOR_SIZE = 512
VECTOR_METRIC = Distance.COSINE


def ensure_collection_exists(
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> bool:
    """
    Idempotently verifies that the designated biometric vector collection exists in Qdrant.
    - Creates the collection with 512 dimensions and Cosine distance if not present.
    - If the collection exists with matching configuration, reuses it without recreation.
    - If the collection exists with an incompatible dimension or distance metric, raises
      IncompatibleCollectionError. Never silently deletes or resets existing data.

    Returns:
        bool: True if collection is verified/created successfully.

    Raises:
        IncompatibleCollectionError: If existing collection has incompatible parameters.
        QdrantConnectionError: If Qdrant server is unreachable or fails to respond.
    """
    target_name = collection_name or settings.COLLECTION_NAME

    try:
        qdrant = client or get_qdrant_client()
        collections_resp = qdrant.get_collections()
        existing_names = [col.name for col in collections_resp.collections]

        if target_name not in existing_names:
            logger.info(
                "Creating Qdrant vector collection '%s' (size=%d, distance=%s)",
                target_name,
                VECTOR_SIZE,
                VECTOR_METRIC,
            )
            qdrant.create_collection(
                collection_name=target_name,
                vectors_config=VectorParams(
                    size=VECTOR_SIZE,
                    distance=VECTOR_METRIC,
                ),
            )
            logger.info("Qdrant collection '%s' created successfully.", target_name)
            return True

        # Collection exists: validate configuration compatibility
        coll_info = qdrant.get_collection(collection_name=target_name)
        params = getattr(coll_info.config, "params", None)
        vectors_config = getattr(params, "vectors", None) if params else None

        if vectors_config is not None:
            # Handle standard single dense vector configuration
            actual_size = getattr(vectors_config, "size", None)
            actual_distance = getattr(vectors_config, "distance", None)

            if actual_size is not None and actual_size != VECTOR_SIZE:
                err_msg = (
                    f"Collection '{target_name}' exists with incompatible vector size: "
                    f"expected {VECTOR_SIZE}, found {actual_size}."
                )
                logger.error(err_msg)
                raise IncompatibleCollectionError(err_msg)

            if actual_distance is not None:
                # Compare distance enum or string value
                dist_str = actual_distance.value if hasattr(actual_distance, "value") else str(actual_distance)
                expected_str = VECTOR_METRIC.value if hasattr(VECTOR_METRIC, "value") else str(VECTOR_METRIC)
                if dist_str.lower() != expected_str.lower():
                    err_msg = (
                        f"Collection '{target_name}' exists with incompatible distance metric: "
                        f"expected {expected_str}, found {dist_str}."
                    )
                    logger.error(err_msg)
                    raise IncompatibleCollectionError(err_msg)

        logger.debug("Qdrant collection '%s' exists and configuration is compatible.", target_name)
        return True

    except IncompatibleCollectionError:
        raise
    except Exception as exc:
        logger.error("Failed to ensure collection '%s': %s", target_name, exc)
        raise QdrantConnectionError(f"Could not verify or create collection '{target_name}': {exc}") from exc


def get_collection_info(
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Retrieves summary diagnostic metadata for a Qdrant collection.
    """
    target_name = collection_name or settings.COLLECTION_NAME
    try:
        qdrant = client or get_qdrant_client()
        info = qdrant.get_collection(collection_name=target_name)
        vectors_count = getattr(info, "vectors_count", None) or getattr(info, "indexed_vectors_count", None) or 0
        points_count = getattr(info, "points_count", 0)

        return {
            "name": target_name,
            "status": str(info.status),
            "points_count": points_count,
            "vectors_count": vectors_count,
        }
    except Exception as exc:
        logger.error("Failed to retrieve collection info for '%s': %s", target_name, exc)
        raise QdrantConnectionError(f"Could not inspect collection '{target_name}': {exc}") from exc
