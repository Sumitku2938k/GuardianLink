from embedding import generate_embedding


image_path = "test.png"

embedding = generate_embedding(image_path)

print("Embedding generated successfully")
print("Embedding dimension:", len(embedding))

print("\nFirst 10 values:")
print(embedding[:10])