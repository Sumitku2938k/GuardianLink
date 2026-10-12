"""
Adapted test coverage from friend's test_detector.py and test_embedding.py.
Verifies engine interfaces, image decoding, singleton lifecycle, and test asset validity.
Real deep learning model inference execution is designated for Phase 6.3.
"""

import os
import unittest
import numpy as np

from app.engine.face_engine import (
    FaceEngine,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
)
from app.engine.detector import decode_image_input

ASSET_PATH = os.path.join(os.path.dirname(__file__), "assets", "test.png")


class TestAdaptedEngineInterfaces(unittest.TestCase):
    """Verifies adapted engine module interfaces and image decoding."""

    def test_face_engine_singleton(self):
        """Verify FaceEngine adheres to strict singleton pattern."""
        engine1 = FaceEngine.get_instance()
        engine2 = FaceEngine.get_instance()
        self.assertIs(engine1, engine2)
        # Verify model loaded state is an observable boolean
        self.assertIsInstance(engine1.is_loaded(), bool)

    def test_decode_image_from_filepath(self):
        """Verify decode_image_input decodes reference asset from filepath."""
        self.assertTrue(os.path.exists(ASSET_PATH))
        img = decode_image_input(ASSET_PATH)
        self.assertIsInstance(img, np.ndarray)
        self.assertEqual(len(img.shape), 3)  # Height, Width, Channels (BGR)
        self.assertEqual(img.shape[2], 3)    # 3 color channels

    def test_decode_image_from_bytes(self):
        """Verify decode_image_input decodes reference asset from raw binary bytes."""
        with open(ASSET_PATH, "rb") as f:
            raw_bytes = f.read()

        img = decode_image_input(raw_bytes)
        self.assertIsInstance(img, np.ndarray)
        self.assertEqual(len(img.shape), 3)

    def test_decode_image_invalid_input(self):
        """Verify decode_image_input raises ImageDecodeError on corrupt data."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(b"not_a_valid_image_header")

        with self.assertRaises(ImageDecodeError):
            decode_image_input("non_existent_file_path_12345.jpg")

    def test_domain_exception_hierarchy(self):
        """Verify domain exception inheritance."""
        self.assertTrue(issubclass(NoFaceDetectedError, Exception))
        self.assertTrue(issubclass(MultipleFacesDetectedError, Exception))
        self.assertTrue(issubclass(ImageDecodeError, Exception))


if __name__ == "__main__":
    unittest.main()
