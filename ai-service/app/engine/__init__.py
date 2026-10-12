"""
Biometric inference engine package for GuardianLink AI Microservice.
Consolidates InsightFace model loading, face detection, and embedding extraction.
"""

from app.engine.face_engine import (
    FaceEngine,
    FaceEngineError,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
    ModelNotLoadedError,
    InvalidEmbeddingError,
)
from app.engine.detector import (
    decode_image_input,
    detect_faces,
    get_raw_faces,
)
from app.engine.embedding import (
    validate_face_count,
    extract_and_validate_embedding,
    generate_embedding,
)

__all__ = [
    "FaceEngine",
    "FaceEngineError",
    "NoFaceDetectedError",
    "MultipleFacesDetectedError",
    "ImageDecodeError",
    "ModelNotLoadedError",
    "InvalidEmbeddingError",
    "decode_image_input",
    "detect_faces",
    "get_raw_faces",
    "validate_face_count",
    "extract_and_validate_embedding",
    "generate_embedding",
]
