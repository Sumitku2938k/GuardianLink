"""
Phase 6.3 Face Detection & Embedding Engine Test Suite for GuardianLink.
Comprehensive testing covering:
1. Safe Image Decoding (paths, bytes, 2D/3D/4D numpy arrays, corrupted data, invalid types).
2. SCRFD Face Detection (single-face, zero-face, multi-face, bounding boxes, confidences).
3. Exactly-One-Face Validation (NoFaceDetectedError, MultipleFacesDetectedError).
4. ArcFace 512-dim Embedding Generation (finite values, float32, L2 norm == 1.0 +/- tolerance).
5. Numerical validation of invalid embeddings (NaN/Inf, wrong dimensions, zero norm).
6. Model Lifecycle & Thread-Safe Singleton Reusability.
"""

import os
import threading
import unittest
import numpy as np
import cv2

from app.engine.face_engine import (
    FaceEngine,
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

ASSET_PATH = os.path.join(os.path.dirname(__file__), "assets", "test.png")


class TestImageDecoding(unittest.TestCase):
    """Category A: Safe Multi-Format Image Decoding Tests."""

    def test_decode_from_filepath_success(self):
        """Valid file path returns valid uint8 3-channel BGR image."""
        self.assertTrue(os.path.exists(ASSET_PATH))
        img = decode_image_input(ASSET_PATH)
        self.assertIsInstance(img, np.ndarray)
        self.assertEqual(img.dtype, np.uint8)
        self.assertEqual(img.ndim, 3)
        self.assertEqual(img.shape[2], 3)
        self.assertGreater(img.shape[0], 0)
        self.assertGreater(img.shape[1], 0)

    def test_decode_from_raw_bytes_success(self):
        """Valid raw binary bytes return valid uint8 3-channel BGR image."""
        with open(ASSET_PATH, "rb") as f:
            raw_bytes = f.read()
        img = decode_image_input(raw_bytes)
        self.assertIsInstance(img, np.ndarray)
        self.assertEqual(img.dtype, np.uint8)
        self.assertEqual(img.ndim, 3)
        self.assertEqual(img.shape[2], 3)

    def test_decode_from_bytearray_success(self):
        """Bytearray input decodes identically to bytes."""
        with open(ASSET_PATH, "rb") as f:
            barr = bytearray(f.read())
        img = decode_image_input(barr)
        self.assertIsInstance(img, np.ndarray)
        self.assertEqual(img.shape[2], 3)

    def test_decode_from_numpy_bgr_array(self):
        """Direct 3-channel NumPy array is validated and returned."""
        dummy_bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        dummy_bgr[10:20, 10:20] = [255, 0, 0]
        result = decode_image_input(dummy_bgr)
        self.assertEqual(result.shape, (100, 100, 3))
        self.assertEqual(result.dtype, np.uint8)

    def test_decode_from_numpy_grayscale_converts_to_bgr(self):
        """2D grayscale array is automatically converted to 3-channel BGR."""
        gray = np.ones((80, 80), dtype=np.uint8) * 128
        result = decode_image_input(gray)
        self.assertEqual(result.ndim, 3)
        self.assertEqual(result.shape, (80, 80, 3))
        self.assertEqual(result[0, 0, 0], 128)
        self.assertEqual(result[0, 0, 1], 128)
        self.assertEqual(result[0, 0, 2], 128)

    def test_decode_from_numpy_bgra_converts_to_bgr(self):
        """4-channel BGRA image is converted to 3-channel BGR."""
        bgra = np.zeros((50, 50, 4), dtype=np.uint8)
        bgra[:, :] = [50, 100, 150, 255]
        result = decode_image_input(bgra)
        self.assertEqual(result.shape, (50, 50, 3))
        self.assertEqual(result[0, 0, 0], 50)
        self.assertEqual(result[0, 0, 1], 100)
        self.assertEqual(result[0, 0, 2], 150)

    def test_decode_rejects_none(self):
        """None input raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(None)

    def test_decode_rejects_empty_bytes(self):
        """Empty bytes buffer raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(b"")

    def test_decode_rejects_empty_filepath(self):
        """Empty filepath string raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input("   ")

    def test_decode_rejects_nonexistent_filepath(self):
        """Non-existent path raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input("non_existent_image_12345.jpg")

    def test_decode_rejects_directory_path(self):
        """Directory path instead of file raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(os.path.dirname(ASSET_PATH))

    def test_decode_rejects_corrupted_bytes(self):
        """Corrupted image header raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(b"GARBAGE_HEADER_NOT_AN_IMAGE_DATA_1234567890")

    def test_decode_rejects_unsupported_types(self):
        """Integers, lists, and dicts raise ImageDecodeError."""
        for invalid in [12345, [1, 2, 3], {"path": "test.jpg"}]:
            with self.subTest(invalid=invalid):
                with self.assertRaises(ImageDecodeError):
                    decode_image_input(invalid)

    def test_decode_rejects_invalid_array_dimensions(self):
        """1D array and 4D tensor raise ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(np.array([1, 2, 3], dtype=np.uint8))
        with self.assertRaises(ImageDecodeError):
            decode_image_input(np.zeros((1, 10, 10, 3), dtype=np.uint8))

    def test_decode_rejects_empty_numpy_array(self):
        """Empty NumPy array raises ImageDecodeError."""
        with self.assertRaises(ImageDecodeError):
            decode_image_input(np.array([], dtype=np.uint8))


class TestFaceDetection(unittest.TestCase):
    """Category B: SCRFD Face Detection Tests."""

    @classmethod
    def setUpClass(cls):
        # Pre-load shared model once for detection test class
        FaceEngine.get_instance().load_model()
        cls.ref_img = cv2.imread(ASSET_PATH)

    def test_single_face_detection_real_inference(self):
        """Reference portrait test.png yields exactly one face with valid confidence."""
        detections = detect_faces(self.ref_img)
        self.assertEqual(len(detections), 1)

        face = detections[0]
        bbox = face["bbox"]
        confidence = face["confidence"]

        # Validate bounding box: [x1, y1, x2, y2]
        self.assertEqual(len(bbox), 4)
        x1, y1, x2, y2 = bbox
        self.assertGreater(x2, x1)
        self.assertGreater(y2, y1)

        # Validate confidence score (should be high on clear portrait)
        self.assertGreater(confidence, 0.70)
        self.assertLessEqual(confidence, 1.0)

    def test_zero_face_detection_real_inference(self):
        """Solid black synthetic image yields 0 detected faces."""
        black_img = np.zeros((640, 640, 3), dtype=np.uint8)
        detections = detect_faces(black_img)
        self.assertEqual(len(detections), 0)

    def test_multi_face_detection_real_inference(self):
        """Horizontally tiled portrait yields >= 2 detected faces."""
        tiled_img = np.hstack([self.ref_img, self.ref_img])
        detections = detect_faces(tiled_img)
        self.assertGreaterEqual(len(detections), 2)


class TestEmbeddingGenerationAndValidation(unittest.TestCase):
    """Category C: Exactly-One-Face & ArcFace Embedding Validation Tests."""

    @classmethod
    def setUpClass(cls):
        FaceEngine.get_instance().load_model()
        cls.ref_img = cv2.imread(ASSET_PATH)

    def test_generate_embedding_real_inference(self):
        """Single-face image generates a valid 512-dim unit-normalized ArcFace embedding."""
        emb = generate_embedding(self.ref_img)

        # 1. Type and Shape
        self.assertIsInstance(emb, np.ndarray)
        self.assertEqual(emb.shape, (512,))
        self.assertEqual(emb.dtype, np.float32)

        # 2. Numerical finiteness (no NaN or Inf)
        self.assertTrue(np.isfinite(emb).all())

        # 3. L2 Unit Normalization (target: 1.0 +/- 1e-3)
        l2_norm = float(np.linalg.norm(emb))
        self.assertAlmostEqual(l2_norm, 1.0, places=3)

    def test_generate_embedding_from_filepath(self):
        """generate_embedding accepts file path string directly."""
        emb = generate_embedding(ASSET_PATH)
        self.assertEqual(emb.shape, (512,))
        self.assertTrue(np.isfinite(emb).all())

    def test_generate_embedding_from_bytes(self):
        """generate_embedding accepts raw bytes buffer directly."""
        with open(ASSET_PATH, "rb") as f:
            raw_bytes = f.read()
        emb = generate_embedding(raw_bytes)
        self.assertEqual(emb.shape, (512,))
        self.assertTrue(np.isfinite(emb).all())

    def test_zero_face_raises_no_face_detected_error(self):
        """Solid black image raises NoFaceDetectedError."""
        black_img = np.zeros((640, 640, 3), dtype=np.uint8)
        with self.assertRaises(NoFaceDetectedError):
            generate_embedding(black_img)

    def test_multi_face_raises_multiple_faces_detected_error(self):
        """Horizontally tiled image with 2 faces raises MultipleFacesDetectedError."""
        tiled_img = np.hstack([self.ref_img, self.ref_img])
        with self.assertRaises(MultipleFacesDetectedError):
            generate_embedding(tiled_img)

    def test_validate_face_count_unit_logic(self):
        """Unit test for validate_face_count function."""
        # 0 faces
        with self.assertRaises(NoFaceDetectedError):
            validate_face_count([])

        # 2 faces
        with self.assertRaises(MultipleFacesDetectedError):
            validate_face_count(["face1", "face2"])

        # 1 face
        result = validate_face_count(["single_face"])
        self.assertEqual(result, "single_face")

    def test_extract_and_validate_embedding_rejects_wrong_shape(self):
        """extract_and_validate_embedding rejects vectors not equal to (512,)."""
        class MockFace:
            embedding = np.ones((128,), dtype=np.float32)

        with self.assertRaises(InvalidEmbeddingError):
            extract_and_validate_embedding(MockFace())

    def test_extract_and_validate_embedding_rejects_nan_and_inf(self):
        """extract_and_validate_embedding rejects NaN or Inf vectors."""
        nan_vec = np.ones((512,), dtype=np.float32)
        nan_vec[0] = np.nan

        class MockNanFace:
            embedding = nan_vec

        with self.assertRaises(InvalidEmbeddingError):
            extract_and_validate_embedding(MockNanFace())

        inf_vec = np.ones((512,), dtype=np.float32)
        inf_vec[0] = np.inf

        class MockInfFace:
            embedding = inf_vec

        with self.assertRaises(InvalidEmbeddingError):
            extract_and_validate_embedding(MockInfFace())

    def test_extract_and_validate_embedding_rejects_zero_vector(self):
        """extract_and_validate_embedding rejects all-zero vectors."""
        class MockZeroFace:
            embedding = np.zeros((512,), dtype=np.float32)

        with self.assertRaises(InvalidEmbeddingError):
            extract_and_validate_embedding(MockZeroFace())

    def test_extract_and_validate_embedding_normalizes_unnormalized_vector(self):
        """extract_and_validate_embedding normalizes an unnormalized vector with valid magnitude."""
        unnormalized = np.full((512,), 2.0, dtype=np.float32)

        class MockUnnormalizedFace:
            embedding = unnormalized

        result = extract_and_validate_embedding(MockUnnormalizedFace())
        self.assertEqual(result.shape, (512,))
        self.assertAlmostEqual(float(np.linalg.norm(result)), 1.0, places=3)


class TestModelLifecycleAndSingleton(unittest.TestCase):
    """Category D: Model Lifecycle & Thread-Safety Tests."""

    def test_singleton_identity(self):
        """Repeated access to FaceEngine returns the exact same instance."""
        e1 = FaceEngine.get_instance()
        e2 = FaceEngine.get_instance()
        self.assertIs(e1, e2)

    def test_reused_initialized_model(self):
        """Repeated calls to get_app() reuse the identical initialized model object."""
        engine = FaceEngine.get_instance()
        app1 = engine.get_app()
        app2 = engine.get_app()
        self.assertIs(app1, app2)

    def test_concurrent_access_reentry(self):
        """Multi-threaded concurrent calls safely share a single FaceEngine instance."""
        instances = []
        errors = []

        def worker():
            try:
                inst = FaceEngine.get_instance()
                instances.append(inst)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0)
        self.assertEqual(len(instances), 10)
        first = instances[0]
        for inst in instances:
            self.assertIs(inst, first)


if __name__ == "__main__":
    unittest.main()
