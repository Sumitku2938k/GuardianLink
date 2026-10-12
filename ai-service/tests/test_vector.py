"""
Unit tests for GuardianLink vector database subsystem (Mocks & Deterministic Logic).
Verifies collection configuration, dimension constraints, numerical validation,
deterministic UUIDv5 derivation, payload privacy, upsert idempotency, and error propagation.
"""

import unittest
from unittest.mock import MagicMock, patch
import numpy as np
from qdrant_client.models import (
    Distance,
    VectorParams,
    CollectionsResponse,
    CollectionDescription,
    PointStruct,
    QueryResponse,
    ScoredPoint,
)

from app.vector.indexer import (
    derive_point_id,
    validate_vector,
    upsert_child_vector,
    delete_child_vector,
    get_child_point,
    PROHIBITED_PAYLOAD_FIELDS,
)
from app.vector.store import (
    ensure_collection_exists,
    get_collection_info,
    VECTOR_SIZE,
    VECTOR_METRIC,
)
from app.vector.searcher import search_similar_faces
from app.vector.client import check_qdrant_health
from app.vector.exceptions import (
    VectorStoreError,
    QdrantConnectionError,
    IncompatibleCollectionError,
    InvalidVectorError,
    InvalidChildIdError,
)


class TestVectorUnitValidationAndId(unittest.TestCase):
    """Verifies vector numerical validation and deterministic point ID derivation."""

    def test_derive_point_id_deterministic(self):
        """Verify identical child IDs deterministically produce identical UUIDv5."""
        id1 = derive_point_id("6740b2a8d1e4c89a71e21b34")
        id2 = derive_point_id("6740b2a8d1e4c89a71e21b34")
        self.assertEqual(id1, id2)
        self.assertEqual(len(id1), 36)  # Standard UUID length

    def test_derive_point_id_distinct_for_different_children(self):
        """Verify different child IDs produce distinct UUIDv5 values."""
        id1 = derive_point_id("6740b2a8d1e4c89a71e21b34")
        id2 = derive_point_id("6740b2a8d1e4c89a71e21b35")
        self.assertNotEqual(id1, id2)

    def test_derive_point_id_rejects_empty_and_invalid(self):
        """Verify derive_point_id raises InvalidChildIdError on invalid input."""
        with self.assertRaises(InvalidChildIdError):
            derive_point_id("")
        with self.assertRaises(InvalidChildIdError):
            derive_point_id("   ")
        with self.assertRaises(InvalidChildIdError):
            derive_point_id(None)  # type: ignore
        with self.assertRaises(InvalidChildIdError):
            derive_point_id(12345)  # type: ignore

    def test_validate_vector_valid_numpy(self):
        """Verify valid 512-dimensional float32 vector passes validation."""
        vec = np.random.randn(512).astype(np.float32)
        vec /= np.linalg.norm(vec)
        result = validate_vector(vec)
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 512)

    def test_validate_vector_valid_list(self):
        """Verify valid 512-dimensional Python float list passes validation."""
        vec = [0.1] * 512
        result = validate_vector(vec)
        self.assertEqual(len(result), 512)

    def test_validate_vector_rejects_wrong_dimension(self):
        """Verify vectors with dimension != 512 are rejected."""
        with self.assertRaises(InvalidVectorError):
            validate_vector(np.ones(128, dtype=np.float32))
        with self.assertRaises(InvalidVectorError):
            validate_vector(np.ones(1024, dtype=np.float32))

    def test_validate_vector_rejects_nan(self):
        """Verify vectors containing NaN are rejected."""
        vec = np.ones(512, dtype=np.float32)
        vec[10] = np.nan
        with self.assertRaises(InvalidVectorError):
            validate_vector(vec)

    def test_validate_vector_rejects_infinity(self):
        """Verify vectors containing positive or negative infinity are rejected."""
        vec = np.ones(512, dtype=np.float32)
        vec[0] = np.inf
        with self.assertRaises(InvalidVectorError):
            validate_vector(vec)
        vec[0] = -np.inf
        with self.assertRaises(InvalidVectorError):
            validate_vector(vec)

    def test_validate_vector_rejects_zero_norm(self):
        """Verify all-zero vectors are rejected."""
        with self.assertRaises(InvalidVectorError):
            validate_vector(np.zeros(512, dtype=np.float32))

    def test_validate_vector_rejects_none_and_unsupported(self):
        """Verify None and unsupported types raise InvalidVectorError."""
        with self.assertRaises(InvalidVectorError):
            validate_vector(None)
        with self.assertRaises(InvalidVectorError):
            validate_vector("not a vector")  # type: ignore


class TestVectorCollectionLifecycleUnit(unittest.TestCase):
    """Unit tests for collection configuration and compatibility verification using mocks."""

    def test_ensure_collection_creates_when_not_exists(self):
        """Verify ensure_collection_exists creates collection with 512-D and Cosine distance."""
        mock_client = MagicMock()
        mock_client.get_collections.return_value = CollectionsResponse(collections=[])

        success = ensure_collection_exists(client=mock_client, collection_name="test_faces")
        self.assertTrue(success)
        mock_client.create_collection.assert_called_once()
        _, kwargs = mock_client.create_collection.call_args
        self.assertEqual(kwargs["collection_name"], "test_faces")
        self.assertEqual(kwargs["vectors_config"].size, 512)
        self.assertEqual(kwargs["vectors_config"].distance, Distance.COSINE)

    def test_ensure_collection_reuses_compatible_collection(self):
        """Verify existing collection with matching 512-D Cosine configuration is reused."""
        mock_client = MagicMock()
        mock_client.get_collections.return_value = CollectionsResponse(
            collections=[CollectionDescription(name="test_faces")]
        )
        # Mock collection config
        mock_info = MagicMock()
        mock_info.config.params.vectors.size = 512
        mock_info.config.params.vectors.distance = Distance.COSINE
        mock_client.get_collection.return_value = mock_info

        success = ensure_collection_exists(client=mock_client, collection_name="test_faces")
        self.assertTrue(success)
        mock_client.create_collection.assert_not_called()

    def test_ensure_collection_rejects_incompatible_size(self):
        """Verify existing collection with incompatible vector size raises IncompatibleCollectionError."""
        mock_client = MagicMock()
        mock_client.get_collections.return_value = CollectionsResponse(
            collections=[CollectionDescription(name="test_faces")]
        )
        mock_info = MagicMock()
        mock_info.config.params.vectors.size = 128  # Incompatible size
        mock_info.config.params.vectors.distance = Distance.COSINE
        mock_client.get_collection.return_value = mock_info

        with self.assertRaises(IncompatibleCollectionError) as ctx:
            ensure_collection_exists(client=mock_client, collection_name="test_faces")
        self.assertIn("incompatible vector size", str(ctx.exception))
        mock_client.create_collection.assert_not_called()

    def test_ensure_collection_rejects_incompatible_distance(self):
        """Verify existing collection with incompatible distance metric raises IncompatibleCollectionError."""
        mock_client = MagicMock()
        mock_client.get_collections.return_value = CollectionsResponse(
            collections=[CollectionDescription(name="test_faces")]
        )
        mock_info = MagicMock()
        mock_info.config.params.vectors.size = 512
        mock_info.config.params.vectors.distance = Distance.EUCLID  # Incompatible metric
        mock_client.get_collection.return_value = mock_info

        with self.assertRaises(IncompatibleCollectionError) as ctx:
            ensure_collection_exists(client=mock_client, collection_name="test_faces")
        self.assertIn("incompatible distance metric", str(ctx.exception))
        mock_client.create_collection.assert_not_called()

    def test_ensure_collection_surfaces_connection_error(self):
        """Verify Qdrant connection failures raise QdrantConnectionError."""
        mock_client = MagicMock()
        mock_client.get_collections.side_effect = Exception("Connection refused: 6333")

        with self.assertRaises(QdrantConnectionError):
            ensure_collection_exists(client=mock_client, collection_name="test_faces")


class TestVectorUpsertSearchDeleteUnit(unittest.TestCase):
    """Unit tests for upsert, search, deletion, and payload minimalism using mocks."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.dummy_vector = [0.1] * 512

    def test_upsert_uses_deterministic_point_id_and_minimal_payload(self):
        """Verify upsert_child_vector creates PointStruct with derived UUID and minimal child_id payload."""
        child_id = "child_test_123"
        expected_point_id = derive_point_id(child_id)

        point_id = upsert_child_vector(
            child_id=child_id,
            embedding=self.dummy_vector,
            client=self.mock_client,
            collection_name="test_faces",
        )

        self.assertEqual(point_id, expected_point_id)
        self.mock_client.upsert.assert_called_once()
        _, kwargs = self.mock_client.upsert.call_args
        self.assertEqual(kwargs["collection_name"], "test_faces")
        points = kwargs["points"]
        self.assertEqual(len(points), 1)
        self.assertEqual(points[0].id, expected_point_id)
        self.assertEqual(points[0].payload, {"child_id": child_id})

    def test_upsert_strips_sensitive_pii_fields(self):
        """Verify sensitive parent and contact fields are strictly excluded from Qdrant payload."""
        child_id = "child_pii_test"
        dangerous_payload = {
            "parent_name": "John Doe",
            "parent_email": "john@example.com",
            "parent_phone": "+1234567890",
            "address": "123 Main St",
            "photo_url": "https://example.com/photo.jpg",
            "embedding": self.dummy_vector,
        }

        upsert_child_vector(
            child_id=child_id,
            embedding=self.dummy_vector,
            payload=dangerous_payload,
            client=self.mock_client,
            collection_name="test_faces",
        )

        _, kwargs = self.mock_client.upsert.call_args
        stored_payload = kwargs["points"][0].payload
        self.assertEqual(stored_payload, {"child_id": child_id})
        for prohibited in PROHIBITED_PAYLOAD_FIELDS:
            self.assertNotIn(prohibited, stored_payload)

    def test_delete_child_vector_targets_expected_point(self):
        """Verify delete_child_vector targets the deterministic UUID point selector."""
        child_id = "child_delete_test"
        expected_point_id = derive_point_id(child_id)

        point_id = delete_child_vector(
            child_id=child_id,
            client=self.mock_client,
            collection_name="test_faces",
        )

        self.assertEqual(point_id, expected_point_id)
        self.mock_client.delete.assert_called_once()
        _, kwargs = self.mock_client.delete.call_args
        self.assertEqual(kwargs["collection_name"], "test_faces")
        self.assertEqual(kwargs["points_selector"], [expected_point_id])

    def test_search_similar_faces_returns_only_required_fields(self):
        """Verify search_similar_faces maps output strictly to child_id, similarity, and point_id."""
        mock_scored_point = MagicMock()
        mock_scored_point.id = "c86a1df8-d6a1-5d6a-8d6a-1df8d6a15d6a"
        mock_scored_point.score = 0.88412345
        mock_scored_point.payload = {
            "child_id": "child_match_456",
            "internal_secret": "do_not_expose",
        }

        mock_query_response = MagicMock()
        mock_query_response.points = [mock_scored_point]
        self.mock_client.query_points.return_value = mock_query_response

        results = search_similar_faces(
            embedding=self.dummy_vector,
            limit=5,
            threshold=0.60,
            client=self.mock_client,
            collection_name="test_faces",
        )

        self.assertEqual(len(results), 1)
        res = results[0]
        self.assertEqual(set(res.keys()), {"child_id", "similarity", "point_id"})
        self.assertEqual(res["child_id"], "child_match_456")
        self.assertEqual(res["similarity"], 0.884123)
        self.assertEqual(res["point_id"], "c86a1df8-d6a1-5d6a-8d6a-1df8d6a15d6a")

    def test_search_empty_results_returns_empty_list(self):
        """Verify empty collection or no-match query returns an empty list without error."""
        mock_query_response = MagicMock()
        mock_query_response.points = []
        self.mock_client.query_points.return_value = mock_query_response

        results = search_similar_faces(
            embedding=self.dummy_vector,
            limit=5,
            threshold=0.60,
            client=self.mock_client,
            collection_name="test_faces",
        )

        self.assertEqual(results, [])

    def test_search_rejects_invalid_limit(self):
        """Verify invalid limit values (< 1 or > 50) raise ValueError."""
        with self.assertRaises(ValueError):
            search_similar_faces(self.dummy_vector, limit=0, client=self.mock_client)
        with self.assertRaises(ValueError):
            search_similar_faces(self.dummy_vector, limit=100, client=self.mock_client)

    def test_search_rejects_invalid_threshold(self):
        """Verify invalid threshold values (< -1.0 or > 1.0) raise ValueError."""
        with self.assertRaises(ValueError):
            search_similar_faces(self.dummy_vector, threshold=1.5, client=self.mock_client)
        with self.assertRaises(ValueError):
            search_similar_faces(self.dummy_vector, threshold=-2.0, client=self.mock_client)

    def test_health_check_returns_false_on_connection_failure(self):
        """Verify check_qdrant_health returns False when Qdrant is unreachable."""
        self.mock_client.get_collections.side_effect = Exception("Connection refused")
        health = check_qdrant_health(client=self.mock_client)
        self.assertFalse(health)


if __name__ == "__main__":
    unittest.main()
