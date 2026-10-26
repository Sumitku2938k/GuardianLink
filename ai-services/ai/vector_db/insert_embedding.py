from pathlib import Path
import uuid

from qdrant_client.models import PointStruct

from ai.face.embedding import generate_embedding
from ai.vector_db.search_embedding import client, COLLECTION_NAME


def insert_face_embedding(
    image_path: str,
    missing_person_id: str
):

    embedding = generate_embedding(image_path)

    if embedding is None:
        raise ValueError(
            "Could not generate face embedding"
        )

    print("Embedding generated successfully")
    print("Embedding dimension:", len(embedding))

    qdrant_id = str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            missing_person_id
        )
    )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=qdrant_id,
                vector=embedding.tolist(),
                payload={
                    "missing_person_id": missing_person_id
                }
            )
        ]
    )

    print("Face embedding inserted successfully")
    print("Qdrant ID:", qdrant_id)
    print("MongoDB Missing Person ID:", missing_person_id)