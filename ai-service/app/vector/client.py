"""
Centralized Qdrant client connection factory and lifecycle manager.
Connects to standalone Qdrant container over HTTP with configurable timeouts.
"""

import logging
import threading
from typing import Optional
from qdrant_client import QdrantClient

from app.config import settings
from app.vector.exceptions import QdrantConnectionError

logger = logging.getLogger("guardianlink.ai.vector.client")

_qdrant_client: Optional[QdrantClient] = None
_client_lock = threading.Lock()


def get_qdrant_client() -> QdrantClient:
    """
    Returns a shared, thread-safe QdrantClient instance configured with network URL,
    optional API key, and explicit timeout settings.
    """
    global _qdrant_client

    if _qdrant_client is None:
        with _client_lock:
            if _qdrant_client is None:
                logger.info(
                    "Initializing Qdrant client connection to %s (timeout=%.1fs)",
                    settings.QDRANT_URL,
                    settings.QDRANT_TIMEOUT_SECONDS,
                )
                try:
                    _qdrant_client = QdrantClient(
                        url=settings.QDRANT_URL,
                        api_key=settings.QDRANT_API_KEY or None,
                        timeout=settings.QDRANT_TIMEOUT_SECONDS,
                        check_compatibility=False,
                    )
                except Exception as exc:
                    logger.error("Failed to instantiate QdrantClient: %s", exc)
                    raise QdrantConnectionError(f"Could not connect to Qdrant at {settings.QDRANT_URL}: {exc}") from exc

    return _qdrant_client


def close_qdrant_client() -> None:
    """
    Closes the shared QdrantClient connection cleanly if open.
    Useful during application shutdown and isolated testing.
    """
    global _qdrant_client

    with _client_lock:
        if _qdrant_client is not None:
            try:
                _qdrant_client.close()
                logger.info("Closed Qdrant client connection.")
            except Exception as exc:
                logger.warning("Error while closing Qdrant client: %s", exc)
            finally:
                _qdrant_client = None


def check_qdrant_health(client: Optional[QdrantClient] = None) -> bool:
    """
    Pings the standalone Qdrant server to verify network connectivity and responsiveness.
    Returns False if unreachable without raising unhandled exceptions.
    """
    try:
        qdrant = client or get_qdrant_client()
        # Verify connectivity by requesting the collections catalog
        qdrant.get_collections()
        return True
    except Exception as exc:
        logger.warning("Qdrant health check probe failed: %s", exc)
        return False
