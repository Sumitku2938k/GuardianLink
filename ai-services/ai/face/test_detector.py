from detector import detect_faces


image_path = "test.png"

faces = detect_faces(image_path)

print("Faces detected:", len(faces))

for i, face in enumerate(faces):

    print(f"Face {i + 1}")
    print("Bounding box:", face["bbox"])
    print("Confidence:", face["confidence"])