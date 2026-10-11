"""
Face detection module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/face/detector.py.
Preserves SCRFD detection logic while delegating to the unified FaceEngine singleton.
"""

from typing import List, Dict, Any, Union
import numpy as np
import cv2

from app.engine.face_engine import FaceEngine, ImageDecodeError


def decode_image_input(image_input: Union[str, bytes, np.ndarray]) -> np.ndarray:
    """
    Normalizes varied image inputs (filesystem path, raw binary bytes, or numpy matrix)
    into a standard BGR OpenCV uint8 image matrix.
    """
    if isinstance(image_input, np.ndarray):
        if image_input.size == 0:
            raise ImageDecodeError("Provided numpy image array is empty.")
        return image_input

    if isinstance(image_input, bytes):
        nparr = np.frombuffer(image_input, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ImageDecodeError("Failed to decode image from binary bytes.")
        return image

    if isinstance(image_input, str):
        image = cv2.imread(image_input, cv2.IMREAD_COLOR)
        if image is None:
            raise ImageDecodeError(f"Could not read image from file path: '{image_input}'")
        return image

    raise ImageDecodeError(f"Unsupported image input type: {type(image_input).__name__}")


def detect_faces(image_input: Union[str, bytes, np.ndarray]) -> List[Dict[str, Any]]:
    """
    Executes SCRFD face detection against the input image.
    Adapted from friend's detector.py:detect_faces().

    Returns:
        List of detected faces with integer bounding box [x1, y1, x2, y2]
        and float confidence score.
    """
    image = decode_image_input(image_input)

    face_app = FaceEngine.get_instance().get_app()
    faces = face_app.get(image)

    results: List[Dict[str, Any]] = []

    for face in faces:
        bbox = face.bbox.astype(int)
        results.append({
            "bbox": bbox.tolist(),
            "confidence": float(face.det_score),
        })

    return results
