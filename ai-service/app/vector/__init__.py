"""
Vector database subsystem for GuardianLink AI Microservice.
Manages Qdrant client connections, collection lifecycle, vector indexing, and candidate queries.
"""

from app.vector.client import (
    get_qdrant_client,
    close_qdrant_client,
    check_qdrant_health,
)
from app.vector.store import (
    ensure_collection_exists,
    get_collection_info,
    VECTOR_SIZE,
    VECTOR_METRIC,
)
from app.vector.indexer import (
    derive_point_id,
    validate_vector,
    upsert_child_vector,
    delete_child_vector,
    get_child_point,
)
from app.vector.searcher import (
    search_similar_faces,
)
from app.vector.exceptions import (
    VectorStoreError,
    QdrantConnectionError,
    IncompatibleCollectionError,
    InvalidVectorError,
    InvalidChildIdError,
    VectorNotFoundError,
)

__all__ = [
    "get_qdrant_client",
    "close_qdrant_client",
    "check_qdrant_health",
    "ensure_collection_exists",
    "get_collection_info",
    "VECTOR_SIZE",
    "VECTOR_METRIC",
    "derive_point_id",
    "validate_vector",
    "upsert_child_vector",
    "delete_child_vector",
    "get_child_point",
    "search_similar_faces",
    "VectorStoreError",
    "QdrantConnectionError",
    "IncompatibleCollectionError",
    "InvalidVectorError",
    "InvalidChildIdError",
    "VectorNotFoundError",
]
