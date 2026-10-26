from pathlib import Path

from qdrant_client import QdrantClient

from ai.face.embedding import generate_embedding


# --------------------------------
# Project root
# --------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]


# --------------------------------
# Qdrant
# --------------------------------

client = QdrantClient(
    path=str(BASE_DIR / "qdrant_data")
)

COLLECTION_NAME = "missing_person_faces"


def search_face(image_path: str, limit: int = 5):

    # 1. Generate embedding
    embedding = generate_embedding(image_path)

    if embedding is None:
        raise ValueError(
            "Could not generate face embedding"
        )

    print("Search embedding generated")
    print("Embedding dimension:", len(embedding))

    # 2. Search Qdrant
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=embedding.tolist(),
        limit=limit,
        with_payload=True
    )

    # 3. Display results
    print("\n========== MATCH RESULTS ==========")

    for result in results.points:

        print("\nQdrant ID:", result.id)
        print("Similarity Score:", result.score)

        print(
            "MongoDB Missing Person ID:",
            result.payload.get("missing_person_id")
        )

    return results.points


# --------------------------------
# Test
# --------------------------------

if __name__ == "__main__":

    image_path = "ai/face/test.png"

    search_face(image_path)