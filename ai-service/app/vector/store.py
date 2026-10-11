"""
Qdrant collection configuration and lifecycle management.
Adapted from friend's backend/ai/vector_db/vector_store.py.
Configures 512-dimensional Cosine vector index on standalone Qdrant instance.
"""

import logging
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.config import settings
from app.vector.client import get_qdrant_client

logger = logging.getLogger("guardianlink.ai.vector.store")

VECTOR_SIZE = 512
VECTOR_METRIC = Distance.COSINE


def ensure_collection_exists(
    client: Optional[QdrantClient] = None,
    collection_name: Optional[str] = None,
) -> bool:
    """
    Checks if the designated biometric vector collection exists in Qdrant.
    Creates the collection with 512 dimensions and Cosine distance if not present.

    Returns:
        bool: True if collection is ready, False if vector database is unavailable.
    """
    qdrant = client or get_qdrant_client()
    target_name = collection_name or settings.COLLECTION_NAME

    try:
        collections = qdrant.get_collections()
        existing_names = [col.name for col in collections.collections]

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
        else:
            logger.debug("Qdrant collection '%s' already exists.", target_name)

        return True

    except Exception as exc:
        logger.warning(
            "Could not verify or create Qdrant collection '%s': %s",
            target_name,
            exc,
        )
        return False
