"""
Facial embedding generation module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/face/embedding.py.
Preserves ArcFace 512-dim embedding extraction & exactly-one-face validation rules,
delegating model management to the unified FaceEngine singleton.
"""

from typing import Union
import numpy as np

from app.engine.face_engine import (
    FaceEngine,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
)
from app.engine.detector import decode_image_input


def generate_embedding(image_input: Union[str, bytes, np.ndarray]) -> np.ndarray:
    """
    Extracts a 512-dimensional ArcFace facial embedding for enrollment or search.
    Adapted from friend's embedding.py:generate_embedding().

    Validation rules:
        - Exactly one face must be present.
        - Zero faces -> raises NoFaceDetectedError.
        - Multiple faces -> raises MultipleFacesDetectedError.

    Returns:
        np.ndarray: 512-dimensional L2-normalized float32 vector.
    """
    image = decode_image_input(image_input)

    face_app = FaceEngine.get_instance().get_app()
    faces = face_app.get(image)

    if len(faces) == 0:
        raise NoFaceDetectedError("No face detected in the image.")

    if len(faces) > 1:
        raise MultipleFacesDetectedError(
            f"Multiple faces detected ({len(faces)}). Please upload an image containing exactly one face."
        )

    # Extract detected face
    face = faces[0]

    # Return normalized 512-dim embedding
    embedding: np.ndarray = face.embedding

    return embedding
