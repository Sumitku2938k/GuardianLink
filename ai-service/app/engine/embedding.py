"""
Facial embedding generation module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/face/embedding.py.
Preserves ArcFace 512-dim embedding extraction & exactly-one-face validation rules,
delegating model management to the unified FaceEngine singleton.
Validates numerical finiteness, dimension, and L2 normalization tolerance.
"""

from typing import Union, List, Any
import numpy as np

from app.engine.face_engine import (
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    InvalidEmbeddingError,
)
from app.engine.detector import get_raw_faces

DEFAULT_NORM_TOLERANCE: float = 1e-3


def validate_face_count(faces: List[Any]) -> Any:
    """
    Validates that exactly one face is detected in the image.
    Enforces GuardianLink's reference enrollment integrity rules:
        - 0 faces -> raises NoFaceDetectedError
        - 1 face  -> returns the single Face object
        - >1 faces -> raises MultipleFacesDetectedError

    Does NOT silently pick the largest or highest-confidence face in multi-face portraits.
    """
    face_count = len(faces)

    if face_count == 0:
        raise NoFaceDetectedError("No human face detected in the image.")

    if face_count > 1:
        raise MultipleFacesDetectedError(
            f"Multiple human faces detected ({face_count}). "
            "Please provide an image containing exactly one human face."
        )

    return faces[0]


def extract_and_validate_embedding(face: Any, tolerance: float = DEFAULT_NORM_TOLERANCE) -> np.ndarray:
    """
    Extracts and numerically validates an ArcFace embedding from an InsightFace Face instance.

    Validation rules:
        - Shape must be exactly (512,).
        - Dtype must be converted to float32.
        - Values must all be finite (rejects NaN and Inf).
        - L2 norm must be non-zero and equal to 1.0 within the specified numerical tolerance.

    Returns:
        np.ndarray: Validated 512-dimensional float32 unit-normalized vector.

    Raises:
        InvalidEmbeddingError: On shape mismatch, non-finite values, zero norm, or normalization failure.
    """
    # 1. Retrieve vector from Face instance (preferring verified normed_embedding if available)
    raw_vector: Any = getattr(face, "normed_embedding", None)
    if raw_vector is None:
        raw_vector = getattr(face, "embedding", None)

    if raw_vector is None:
        raise InvalidEmbeddingError("Face instance does not contain an embedding attribute.")

    if not isinstance(raw_vector, np.ndarray):
        raw_vector = np.asarray(raw_vector)

    # 2. Validate dimensional shape
    if raw_vector.shape != (512,):
        raise InvalidEmbeddingError(
            f"Invalid embedding dimension {raw_vector.shape}; expected exactly (512,)."
        )

    # 3. Validate numerical finiteness (reject NaN and Inf)
    if not np.isfinite(raw_vector).all():
        raise InvalidEmbeddingError("Extracted embedding contains NaN or infinite values.")

    # 4. Validate non-zero magnitude and L2 normalization
    norm = float(np.linalg.norm(raw_vector))
    if norm <= 0.0 or not np.isfinite(norm):
        raise InvalidEmbeddingError("Extracted embedding has zero or invalid vector magnitude.")

    # Ensure unit L2 normalization within tolerance
    if abs(norm - 1.0) > tolerance:
        normalized_vector = (raw_vector / norm).astype(np.float32)
        final_norm = float(np.linalg.norm(normalized_vector))
        if abs(final_norm - 1.0) > tolerance:
            raise InvalidEmbeddingError(
                f"Embedding normalization failed; L2 norm {final_norm:.6f} exceeds tolerance {tolerance}."
            )
        return normalized_vector

    return raw_vector.astype(np.float32)


def generate_embedding(
    image_input: Union[str, bytes, bytearray, np.ndarray],
    tolerance: float = DEFAULT_NORM_TOLERANCE,
) -> np.ndarray:
    """
    End-to-end embedding pipeline:
    1. Decodes and validates image matrix.
    2. Runs SCRFD face detection.
    3. Enforces exactly-one-face validation rule.
    4. Extracts, validates, and normalizes 512-dimensional ArcFace vector.

    Returns:
        np.ndarray: Validated 512-dimensional float32 L2-normalized vector.
    """
    _, faces = get_raw_faces(image_input)
    single_face = validate_face_count(faces)
    embedding = extract_and_validate_embedding(single_face, tolerance=tolerance)
    return embedding
