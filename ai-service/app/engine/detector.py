"""
Face detection module for GuardianLink AI Microservice.
Adapted from friend's backend/ai/face/detector.py.
Preserves SCRFD detection logic while delegating to the unified FaceEngine singleton.
Implements safe multi-format image decoding, dimension validation, and structured detection output.
"""

import os
from typing import List, Dict, Any, Union, Tuple
import numpy as np
import cv2

from app.engine.face_engine import FaceEngine, ImageDecodeError


def decode_image_input(image_input: Union[str, bytes, bytearray, np.ndarray]) -> np.ndarray:
    """
    Safely decodes and normalizes varied image inputs into a standard OpenCV BGR uint8 matrix.

    Supported input types:
        - str: Filesystem path to an existing image.
        - bytes / bytearray: Raw encoded image bytes (JPEG, PNG, WebP).
        - np.ndarray: Pre-decoded NumPy image array (2D grayscale, 3D BGR, or 4D BGRA).

    Validation rules:
        - Rejects None, empty paths, empty byte buffers, and empty arrays.
        - Verifies that filepaths exist and point to readable files.
        - Normalizes 2D grayscale and 4-channel BGRA arrays to 3-channel BGR.
        - Enforces uint8 data type and positive non-zero spatial dimensions.
        - Never applies grayscale, Gaussian blur, or Canny edge filtering to production images.

    Returns:
        np.ndarray: Valid 3D OpenCV BGR image matrix with shape (height, width, 3) and dtype uint8.

    Raises:
        ImageDecodeError: On missing files, empty inputs, corrupted bytes, or invalid array shapes.
    """
    if image_input is None:
        raise ImageDecodeError("Image input cannot be None.")

    # 1. Handle NumPy array input
    if isinstance(image_input, np.ndarray):
        if image_input.size == 0:
            raise ImageDecodeError("Provided NumPy image array is empty.")

        if image_input.ndim not in (2, 3):
            raise ImageDecodeError(
                f"Invalid NumPy image array dimension: {image_input.ndim}D (expected 2D or 3D matrix)."
            )

        h, w = image_input.shape[:2]
        if h <= 0 or w <= 0:
            raise ImageDecodeError(f"Image array dimensions must be positive, got height={h}, width={w}.")

        # Convert 2D grayscale to 3-channel BGR
        if image_input.ndim == 2:
            image = cv2.cvtColor(image_input, cv2.COLOR_GRAY2BGR)
        elif image_input.shape[2] == 4:
            # Convert 4-channel BGRA to 3-channel BGR
            image = cv2.cvtColor(image_input, cv2.COLOR_BGRA2BGR)
        elif image_input.shape[2] == 1:
            image = cv2.cvtColor(image_input, cv2.COLOR_GRAY2BGR)
        elif image_input.shape[2] == 3:
            image = image_input.copy()
        else:
            raise ImageDecodeError(
                f"Unsupported number of image channels: {image_input.shape[2]} (expected 1, 3, or 4)."
            )

        if image.dtype != np.uint8:
            image = np.clip(image, 0, 255).astype(np.uint8)

        return image

    # 2. Handle raw bytes / bytearray input
    if isinstance(image_input, (bytes, bytearray)):
        if len(image_input) == 0:
            raise ImageDecodeError("Image bytes buffer is empty.")

        nparr = np.frombuffer(image_input, dtype=np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ImageDecodeError("Failed to decode image from binary bytes (corrupt or unsupported format).")

        return image

    # 3. Handle filesystem path string
    if isinstance(image_input, str):
        trimmed_path = image_input.strip()
        if not trimmed_path:
            raise ImageDecodeError("Image file path string cannot be empty.")

        if not os.path.exists(trimmed_path):
            raise ImageDecodeError(f"Image file does not exist at specified path: '{trimmed_path}'")

        if not os.path.isfile(trimmed_path):
            raise ImageDecodeError(f"Specified image path is not a regular file: '{trimmed_path}'")

        image = cv2.imread(trimmed_path, cv2.IMREAD_COLOR)
        if image is None:
            raise ImageDecodeError(f"Could not decode image from file path: '{trimmed_path}'")

        return image

    raise ImageDecodeError(
        f"Unsupported image input type '{type(image_input).__name__}'. Expected str, bytes, or np.ndarray."
    )


def get_raw_faces(image_input: Union[str, bytes, bytearray, np.ndarray]) -> Tuple[np.ndarray, List[Any]]:
    """
    Decodes the input image and executes SCRFD detection via the shared FaceEngine.
    Returns a tuple of (decoded_bgr_image, raw_faces_list).
    """
    image = decode_image_input(image_input)
    face_app = FaceEngine.get_instance().get_app()
    faces = face_app.get(image)
    return image, faces


def detect_faces(image_input: Union[str, bytes, bytearray, np.ndarray]) -> List[Dict[str, Any]]:
    """
    Executes SCRFD face detection against the input image.
    Adapted from friend's detector.py:detect_faces().

    Returns:
        List of detected faces with integer bounding box [x1, y1, x2, y2],
        float confidence score, and optional landmark coordinates.
    """
    _, faces = get_raw_faces(image_input)

    results: List[Dict[str, Any]] = []

    for face in faces:
        bbox = face.bbox.astype(int).tolist()
        confidence = float(face.det_score)

        landmarks = None
        if hasattr(face, "kps") and face.kps is not None:
            landmarks = face.kps.astype(int).tolist()

        results.append({
            "bbox": bbox,
            "confidence": confidence,
            "landmarks": landmarks,
        })

    return results
