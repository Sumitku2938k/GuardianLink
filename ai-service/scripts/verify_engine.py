"""
Standalone Face Detection and Embedding Verification Script for GuardianLink.
Executes real SCRFD face detection and ArcFace feature extraction independently
of Express backend, MongoDB, Cloudinary, or Qdrant.
"""

import sys
import os
import argparse
import time
import numpy as np

# Ensure ai-service root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from app.engine.face_engine import (
    FaceEngine,
    NoFaceDetectedError,
    MultipleFacesDetectedError,
    ImageDecodeError,
    ModelNotLoadedError,
    InvalidEmbeddingError,
)
from app.engine.detector import decode_image_input, detect_faces
from app.engine.embedding import generate_embedding


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify InsightFace detection and ArcFace embedding extraction."
    )
    parser.add_argument(
        "image_path",
        nargs="?",
        default=os.path.join(AI_SERVICE_DIR, "tests", "assets", "test.png"),
        help="Path to image file for verification (default: tests/assets/test.png)",
    )
    parser.add_argument(
        "--tolerance",
        type=float,
        default=1e-3,
        help="L2 norm unit deviation tolerance (default: 0.001)",
    )
    return parser.parse_args()


def run_verification(image_path: str, tolerance: float = 1e-3) -> int:
    print("==================================================================")
    print("[GuardianLink] Face Detection & Embedding Engine Verifier")
    print("==================================================================")
    print(f"Target Image Path : {image_path}")

    decoding_status = "FAILED"
    face_count = 0
    embedding_shape = "N/A"
    embedding_dtype = "N/A"
    l2_norm_val = "N/A"
    is_finite = False
    model_status = "NOT_INITIALIZED"
    overall_result = "FAILED"

    # Step 1: Model Initialization
    try:
        t0 = time.perf_counter()
        engine = FaceEngine.get_instance()
        engine.load_model()
        init_time = time.perf_counter() - t0
        model_status = f"INITIALIZED ({init_time:.2f}s)"
        print(f"[*] Model Engine      : {model_status}")
    except ModelNotLoadedError as err:
        print(f"[!] Model Load Error  : {err}")
        print_summary(
            decoding_status, face_count, embedding_shape, embedding_dtype,
            l2_norm_val, is_finite, model_status, overall_result
        )
        return 1

    # Step 2: Image Decoding
    try:
        decoded_img = decode_image_input(image_path)
        decoding_status = f"SUCCESS (shape: {decoded_img.shape}, dtype: {decoded_img.dtype})"
        print(f"[*] Image Decoding    : {decoding_status}")
    except ImageDecodeError as err:
        print(f"[!] Decode Error      : {err}")
        print_summary(
            decoding_status, face_count, embedding_shape, embedding_dtype,
            l2_norm_val, is_finite, model_status, overall_result
        )
        return 1

    # Step 3: Face Detection
    try:
        t_det0 = time.perf_counter()
        detections = detect_faces(decoded_img)
        det_time = time.perf_counter() - t_det0
        face_count = len(detections)
        print(f"[*] Faces Detected    : {face_count} face(s) ({det_time:.3f}s)")
        for idx, det in enumerate(detections, 1):
            print(f"    - Face #{idx}: bbox={det['bbox']}, confidence={det['confidence']:.4f}")
    except Exception as err:
        print(f"[!] Detection Error   : {err}")
        print_summary(
            decoding_status, face_count, embedding_shape, embedding_dtype,
            l2_norm_val, is_finite, model_status, overall_result
        )
        return 1

    # Step 4: Exactly-One-Face Validation & Embedding Extraction
    try:
        t_emb0 = time.perf_counter()
        embedding = generate_embedding(decoded_img, tolerance=tolerance)
        emb_time = time.perf_counter() - t_emb0

        embedding_shape = str(embedding.shape)
        embedding_dtype = str(embedding.dtype)
        norm_val = float(np.linalg.norm(embedding))
        l2_norm_val = f"{norm_val:.6f}"
        is_finite = bool(np.isfinite(embedding).all())

        print(f"[*] ArcFace Embedding : Extracted ({emb_time:.3f}s)")
        print(f"    - Dimension       : {embedding_shape} (expected: (512,))")
        print(f"    - Numerical Dtype : {embedding_dtype} (expected: float32)")
        print(f"    - Vector L2 Norm  : {l2_norm_val} (target: 1.000000 +/- {tolerance})")
        print(f"    - Finite Values   : {is_finite} (no NaN / Inf)")

        # Verify all criteria
        if (
            face_count == 1
            and embedding.shape == (512,)
            and is_finite
            and abs(norm_val - 1.0) <= tolerance
        ):
            overall_result = "PASSED"
        else:
            overall_result = "FAILED (Validation criteria unmet)"

    except NoFaceDetectedError as err:
        print(f"[!] Face Validation   : REJECTED (Zero faces detected: {err})")
        overall_result = "FAILED (Zero faces)"
    except MultipleFacesDetectedError as err:
        print(f"[!] Face Validation   : REJECTED (Multiple faces detected: {err})")
        overall_result = "FAILED (Multiple faces)"
    except InvalidEmbeddingError as err:
        print(f"[!] Embedding Error   : {err}")
        overall_result = "FAILED (Invalid embedding)"
    except Exception as err:
        print(f"[!] Unexpected Error  : {err}")
        overall_result = f"FAILED ({err})"

    print_summary(
        decoding_status, face_count, embedding_shape, embedding_dtype,
        l2_norm_val, is_finite, model_status, overall_result
    )

    return 0 if overall_result == "PASSED" else 1


def print_summary(
    decoding: str,
    faces: int,
    shape: str,
    dtype: str,
    norm: str,
    finite: bool,
    model: str,
    overall: str,
) -> None:
    print("\n------------------------------------------------------------------")
    print("VERIFICATION SUMMARY REPORT:")
    print("------------------------------------------------------------------")
    print(f"  * Image decoding             : {decoding}")
    print(f"  * Number of faces detected   : {faces}")
    print(f"  * Embedding shape            : {shape}")
    print(f"  * Embedding dtype            : {dtype}")
    print(f"  * L2 norm                    : {norm}")
    print(f"  * All values finite          : {finite}")
    print(f"  * Model initialization status: {model}")
    print(f"  * Overall verification result: {overall}")
    print("------------------------------------------------------------------")


if __name__ == "__main__":
    args = parse_arguments()
    exit_code = run_verification(args.image_path, tolerance=args.tolerance)
    sys.exit(exit_code)
