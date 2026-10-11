"""
Vector database subsystem for GuardianLink AI Microservice.
Manages Qdrant client connections, collection lifecycle, vector indexing, and candidate queries.
"""

from app.vector.client import get_qdrant_client, check_qdrant_health
from app.vector.store import ensure_collection_exists
from app.vector.indexer import derive_point_id, upsert_child_vector
from app.vector.searcher import search_similar_faces

__all__ = [
    "get_qdrant_client",
    "check_qdrant_health",
    "ensure_collection_exists",
    "derive_point_id",
    "upsert_child_vector",
    "search_similar_faces",
]
