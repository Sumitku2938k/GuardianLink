#!/usr/bin/env python3
"""
GuardianLink AI Microservice — Vector Store Verification Tool (Phase 6.4).
Verifies Qdrant standalone connectivity, collection initialization, 512-D vector upsert,
cosine similarity query, privacy boundary, and point deletion independently of Express/FastAPI.
"""

import sys
import os
import argparse
import numpy as np

# Ensure ai-service root is on python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_ROOT = os.path.dirname(CURRENT_DIR)
if AI_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, AI_SERVICE_ROOT)

from app.config import settings
from app.vector.client import get_qdrant_client, check_qdrant_health
from app.vector.store import ensure_collection_exists, get_collection_info, VECTOR_SIZE, VECTOR_METRIC
from app.vector.indexer import (
    derive_point_id,
    upsert_child_vector,
    delete_child_vector,
    get_child_point,
    PROHIBITED_PAYLOAD_FIELDS,
)
from app.vector.searcher import search_similar_faces


def run_verification(collection_name: str = "test_verification_faces", child_id: str = "verify_child_101"):
    print("=" * 66)
    print("[GuardianLink] Qdrant Vector Store Diagnostic Verifier")
    print("=" * 66)
    print(f"Target Qdrant URL   : {settings.QDRANT_URL}")
    print(f"Verification Coll   : {collection_name}")
    print(f"Target Child ID     : {child_id}")
    print("-" * 66)

    # 1. Health check
    print("[*] Probing Qdrant server health...")
    client = get_qdrant_client()
    is_healthy = check_qdrant_health(client)
    if not is_healthy:
        print("[!] FAILURE: Standalone Qdrant server is unreachable.")
        sys.exit(1)
    print("    -> Qdrant server is ONLINE and responsive.")

    # 2. Ensure collection
    print(f"[*] Ensuring collection '{collection_name}' (dim={VECTOR_SIZE}, metric={VECTOR_METRIC.name})...")
    try:
        ensure_collection_exists(client=client, collection_name=collection_name)
        info = get_collection_info(client=client, collection_name=collection_name)
        print(f"    -> Collection verified: status={info['status']}, points={info['points_count']}")
    except Exception as exc:
        print(f"[!] FAILURE ensuring collection: {exc}")
        sys.exit(1)

    # 3. Create synthetic 512-D normalized vector
    print("[*] Generating synthetic 512-D unit-normalized vector...")
    rng = np.random.RandomState(42)
    raw_v = rng.randn(512).astype(np.float32)
    norm = float(np.linalg.norm(raw_v))
    v = (raw_v / norm).tolist()
    print(f"    -> Dimension: {len(v)}, L2 norm: {np.linalg.norm(v):.6f}")

    # 4. Upsert vector with minimal payload
    print(f"[*] Upserting vector point for child_id '{child_id}'...")
    try:
        point_id = upsert_child_vector(
            child_id=child_id,
            embedding=v,
            payload={"child_id": child_id, "parent_email": "should_be_stripped@test.local"},
            client=client,
            collection_name=collection_name,
        )
        expected_point_id = derive_point_id(child_id)
        assert point_id == expected_point_id, "Point ID mismatch"
        print(f"    -> Upserted successfully. Point ID: {point_id}")
    except Exception as exc:
        print(f"[!] FAILURE upserting vector: {exc}")
        sys.exit(1)

    # 5. Verify payload privacy
    print("[*] Inspecting stored payload privacy...")
    pt = get_child_point(child_id=child_id, client=client, collection_name=collection_name)
    if not pt:
        print("[!] FAILURE: Upserted point could not be retrieved.")
        sys.exit(1)
    stored_payload = pt["payload"]
    if "parent_email" in stored_payload or any(f in stored_payload for f in PROHIBITED_PAYLOAD_FIELDS):
        print("[!] FAILURE: Prohibited PII was not stripped from payload!")
        sys.exit(1)
    print(f"    -> Payload verified: {stored_payload} (PII safely excluded)")

    # 6. Similarity search
    print("[*] Executing Cosine similarity search for identical vector...")
    try:
        results = search_similar_faces(
            embedding=v,
            limit=5,
            threshold=0.80,
            client=client,
            collection_name=collection_name,
        )
        if not results:
            print("[!] FAILURE: Search returned no candidates for identical vector.")
            sys.exit(1)
        top_cand = results[0]
        print(f"    -> Top candidate: child_id={top_cand['child_id']}, similarity={top_cand['similarity']:.6f}")
        assert top_cand["child_id"] == child_id
        assert abs(top_cand["similarity"] - 1.0) < 0.005
    except Exception as exc:
        print(f"[!] FAILURE executing similarity search: {exc}")
        sys.exit(1)

    # 7. Delete point
    print(f"[*] Deleting vector point for child_id '{child_id}'...")
    try:
        del_id = delete_child_vector(child_id=child_id, client=client, collection_name=collection_name)
        assert del_id == point_id
        assert get_child_point(child_id=child_id, client=client, collection_name=collection_name) is None
        print(f"    -> Deleted successfully. Point removed from Qdrant.")
    except Exception as exc:
        print(f"[!] FAILURE deleting point: {exc}")
        sys.exit(1)

    # Clean up test collection
    try:
        client.delete_collection(collection_name)
        print(f"[*] Cleaned up verification collection '{collection_name}'.")
    except Exception:
        pass

    print("-" * 66)
    print("VERIFICATION SUMMARY REPORT:")
    print("-" * 66)
    print("  * Qdrant server connection   : SUCCESS (HTTP 6333)")
    print(f"  * Collection configuration   : SUCCESS ({VECTOR_SIZE}-D, {VECTOR_METRIC.name})")
    print(f"  * Point ID generation        : SUCCESS (UUIDv5: {point_id})")
    print("  * Vector validation & upsert : SUCCESS")
    print("  * Privacy constraints        : SUCCESS (zero PII stored)")
    print(f"  * Cosine similarity search   : SUCCESS (score: {top_cand['similarity']:.6f})")
    print("  * Vector deletion            : SUCCESS")
    print("  * Overall verification result: PASSED")
    print("=" * 66)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GuardianLink Qdrant Vector Verifier")
    parser.add_argument("--collection", default="test_verification_faces", help="Collection name for testing")
    parser.add_argument("--child-id", default="verify_child_101", help="Child ID to test")
    args = parser.parse_args()

    run_verification(collection_name=args.collection, child_id=args.child_id)
