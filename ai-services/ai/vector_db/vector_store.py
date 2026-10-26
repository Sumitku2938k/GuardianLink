from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams


# Local Qdrant storage
client = QdrantClient(
    path="qdrant_data"
)


COLLECTION_NAME = "missing_person_faces"


def create_collection():

    collections = client.get_collections()

    existing_collections = [
        collection.name
        for collection in collections.collections
    ]

    if COLLECTION_NAME not in existing_collections:

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=512,
                distance=Distance.COSINE
            )
        )

        print("Qdrant collection created")

    else:

        print("Qdrant collection already exists")


if __name__ == "__main__":

    create_collection()