import cv2
from insightface.app import FaceAnalysis


# Initialize InsightFace
face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def generate_embedding(image_path):

    # Read image
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read image")

    # Detect faces
    faces = face_app.get(image)

    if len(faces) == 0:
        raise ValueError("No face detected")

    if len(faces) > 1:
        raise ValueError(
            "Multiple faces detected. Please upload an image with one face."
        )

    # Get detected face
    face = faces[0]

    # Get face embedding
    embedding = face.embedding

    return embedding