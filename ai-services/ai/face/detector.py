import cv2
from insightface.app import FaceAnalysis


# Initialize face detector
face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def detect_faces(image_path):

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read image")

    faces = face_app.get(image)

    results = []

    for face in faces:

        bbox = face.bbox.astype(int)

        results.append({
            "bbox": bbox.tolist(),
            "confidence": float(face.det_score)
        })

    return results