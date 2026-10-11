"""
Centralized Qdrant client connection factory.
Connects to standalone Qdrant container over HTTP/gRPC.
Replaces the friend project's local embedded on-disk mode to eliminate multi-worker file lock contention.
"""

import logging
from typing import Optional
from qdrant_client import QdrantClient

from app.config import settings

logger = logging.getLogger("guardianlink.ai.vector.client")

_qdrant_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """
    Returns a shared QdrantClient instance configured with network URL and optional API key.
    """
    global _qdrant_client

    if _qdrant_client is None:
        logger.info("Initializing Qdrant client connection to %s", settings.QDRANT_URL)
        _qdrant_client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
            timeout=10.0,
        )

    return _qdrant_client


def check_qdrant_health() -> bool:
    """
    Pings the Qdrant server to verify network connectivity and responsiveness.
    Returns False if unreachable without raising unhandled exceptions.
    """
    try:
        client = get_qdrant_client()
        # Verify cluster/server health by requesting collections catalog
        client.get_collections()
        return True
    except Exception as exc:
        logger.warning("Qdrant health check probe failed: %s", exc)
        return False
