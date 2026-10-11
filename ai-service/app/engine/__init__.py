"""
Biometric inference engine package.
Consolidates InsightFace model loading, face detection, and embedding extraction.
"""

from app.engine.face_engine import (
    FaceEngine,
    FaceEngineError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
)
from app.engine.detector import detect_faces
from app.engine.embedding import generate_embedding

__all__ = [
    "FaceEngine",
    "FaceEngineError",
    "NoFaceDetectedError",
    "MultipleFacesDetectedError",
    "ImageDecodeError",
    "detect_faces",
    "generate_embedding",
]
