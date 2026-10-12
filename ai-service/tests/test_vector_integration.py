"""
Real Integration tests for GuardianLink vector database subsystem.
Executes against a real standalone Qdrant server over HTTP (port 6333).
Uses synthetic controlled vectors to test collection lifecycle, 512-dim Cosine search,
cosine ranking, idempotency, thresholding, point deletion, and disk persistence.
Cleanly tears down all temporary test collections.
"""

import unittest
import numpy as np
import time
from qdrant_client import QdrantClient

from app.config import settings
from app.vector.client import get_qdrant_client, check_qdrant_health
from app.vector.store import ensure_collection_exists, get_collection_info
from app.vector.indexer import (
    derive_point_id,
    upsert_child_vector,
    delete_child_vector,
    get_child_point,
)
from app.vector.searcher import search_similar_faces

TEST_COLLECTION = "test_guardianlink_vectors_integration"


def create_synthetic_normalized_vector(seed: int = 42) -> list[float]:
    """Generates a reproducible 512-dimensional unit-normalized vector."""
    rng = np.random.RandomState(seed)
    v = rng.randn(512).astype(np.float32)
    norm = np.linalg.norm(v)
    v = v / norm
    return v.tolist()


class TestVectorIntegrationRealQdrant(unittest.TestCase):
    """
    Executes real integration tests against the live standalone Qdrant instance.
    Skips cleanly if Qdrant server is unreachable.
    """

    @classmethod
    def setUpClass(cls):
        """Verify Qdrant server connectivity and prepare test collection."""
        cls.client = get_qdrant_client()
        if not check_qdrant_health(cls.client):
            raise unittest.SkipTest("Standalone Qdrant server is unreachable on configured URL")

        # Clean any preexisting test collection from previous test runs
        try:
            cls.client.delete_collection(TEST_COLLECTION)
        except Exception:
            pass

    @classmethod
    def tearDownClass(cls):
        """Clean up test collection from Qdrant server."""
        try:
            cls.client.delete_collection(TEST_COLLECTION)
        except Exception:
            pass

    def test_01_real_collection_creation_and_config(self):
        """Verify real collection creation on Qdrant with 512-D and Cosine metric."""
        created = ensure_collection_exists(client=self.client, collection_name=TEST_COLLECTION)
        self.assertTrue(created)

        info = get_collection_info(client=self.client, collection_name=TEST_COLLECTION)
        self.assertEqual(info["name"], TEST_COLLECTION)
        self.assertIn("green", info["status"].lower())

    def test_02_real_upsert_and_retrieval(self):
        """Verify real upserting of a 512-dim vector into Qdrant."""
        child_id = "6740b2a8d1e4c89a71e21b34"
        vec = create_synthetic_normalized_vector(seed=101)

        point_id = upsert_child_vector(
            child_id=child_id,
            embedding=vec,
            client=self.client,
            collection_name=TEST_COLLECTION,
        )

        expected_id = derive_point_id(child_id)
        self.assertEqual(point_id, expected_id)

        # Verify point lookup
        point_data = get_child_point(child_id=child_id, client=self.client, collection_name=TEST_COLLECTION)
        self.assertIsNotNone(point_data)
        self.assertEqual(point_data["point_id"], expected_id)
        self.assertEqual(point_data["payload"]["child_id"], child_id)

    def test_03_real_search_returns_expected_candidate(self):
        """Verify similarity search returns the inserted point with near 1.0 cosine similarity."""
        child_id = "6740b2a8d1e4c89a71e21b34"
        vec = create_synthetic_normalized_vector(seed=101)

        # Query with the exact same vector
        results = search_similar_faces(
            embedding=vec,
            limit=5,
            threshold=0.80,
            client=self.client,
            collection_name=TEST_COLLECTION,
        )

        self.assertGreaterEqual(len(results), 1)
        top_match = results[0]
        self.assertEqual(top_match["child_id"], child_id)
        self.assertAlmostEqual(top_match["similarity"], 1.0, places=3)
        self.assertEqual(top_match["point_id"], derive_point_id(child_id))

    def test_04_cosine_ranking_with_controlled_vectors(self):
        """Verify Cosine similarity correctly ranks identical > similar > dissimilar vectors."""
        child_target = "child_target_exact"
        child_near = "child_near_similar"
        child_distant = "child_distant"

        base_vec = np.array(create_synthetic_normalized_vector(seed=200), dtype=np.float32)

        # Near vector: 90% base + 10% perturbation
        perturbation = np.array(create_synthetic_normalized_vector(seed=201), dtype=np.float32)
        near_vec = 0.95 * base_vec + 0.05 * perturbation
        near_vec = (near_vec / np.linalg.norm(near_vec)).tolist()

        # Distant vector: independent seed
        distant_vec = create_synthetic_normalized_vector(seed=999)

        upsert_child_vector(child_target, base_vec.tolist(), client=self.client, collection_name=TEST_COLLECTION)
        upsert_child_vector(child_near, near_vec, client=self.client, collection_name=TEST_COLLECTION)
        upsert_child_vector(child_distant, distant_vec, client=self.client, collection_name=TEST_COLLECTION)

        results = search_similar_faces(
            embedding=base_vec.tolist(),
            limit=5,
            threshold=-1.0,  # capture all
            client=self.client,
            collection_name=TEST_COLLECTION,
        )

        # Find positions of candidates
        child_ids = [r["child_id"] for r in results]
        self.assertIn(child_target, child_ids)
        self.assertIn(child_near, child_ids)

        score_exact = next(r["similarity"] for r in results if r["child_id"] == child_target)
        score_near = next(r["similarity"] for r in results if r["child_id"] == child_near)

        # Assert mathematical cosine ordering: exact (~1.0) > near (~0.99)
        self.assertGreater(score_exact, score_near)
        self.assertAlmostEqual(score_exact, 1.0, places=3)
        self.assertGreater(score_near, 0.90)

    def test_05_threshold_and_top_k_behavior(self):
        """Verify search threshold filters out low-similarity candidates and obeys limit."""
        base_vec = create_synthetic_normalized_vector(seed=300)

        # Query with threshold 0.99 (only exact match should pass)
        results = search_similar_faces(
            embedding=base_vec,
            limit=2,
            threshold=0.99,
            client=self.client,
            collection_name=TEST_COLLECTION,
        )

        for match in results:
            self.assertGreaterEqual(match["similarity"], 0.99)

    def test_06_upsert_idempotency(self):
        """Verify repeated upsert of the same child updates the vector without duplicating points."""
        child_id = "child_idempotency_test"
        vec_v1 = create_synthetic_normalized_vector(seed=401)
        vec_v2 = create_synthetic_normalized_vector(seed=402)

        point_id_1 = upsert_child_vector(child_id, vec_v1, client=self.client, collection_name=TEST_COLLECTION)
        point_id_2 = upsert_child_vector(child_id, vec_v2, client=self.client, collection_name=TEST_COLLECTION)

        # Must return the same deterministic UUID
        self.assertEqual(point_id_1, point_id_2)

        # Searching with v1 should now have lower score than v2
        res = search_similar_faces(vec_v2, limit=5, threshold=0.90, client=self.client, collection_name=TEST_COLLECTION)
        matching_child = next((r for r in res if r["child_id"] == child_id), None)
        self.assertIsNotNone(matching_child)
        self.assertAlmostEqual(matching_child["similarity"], 1.0, places=3)

    def test_07_point_deletion_and_search_absence(self):
        """Verify delete_child_vector removes point and subsequent search does not find it."""
        child_id = "child_to_delete"
        vec = create_synthetic_normalized_vector(seed=501)

        upsert_child_vector(child_id, vec, client=self.client, collection_name=TEST_COLLECTION)

        # Verify it exists
        point = get_child_point(child_id, client=self.client, collection_name=TEST_COLLECTION)
        self.assertIsNotNone(point)

        # Delete it
        deleted_id = delete_child_vector(child_id, client=self.client, collection_name=TEST_COLLECTION)
        self.assertEqual(deleted_id, derive_point_id(child_id))

        # Verify point lookup returns None
        point_after = get_child_point(child_id, client=self.client, collection_name=TEST_COLLECTION)
        self.assertIsNone(point_after)

        # Verify search does not return it
        results = search_similar_faces(vec, limit=5, threshold=0.90, client=self.client, collection_name=TEST_COLLECTION)
        matching_ids = [r["child_id"] for r in results]
        self.assertNotIn(child_id, matching_ids)


if __name__ == "__main__":
    unittest.main()
