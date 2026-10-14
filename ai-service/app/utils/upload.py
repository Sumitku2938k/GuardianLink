"""
Safe image upload handling utility for GuardianLink AI Microservice.
Enforces size constraints, stream bounds, non-empty validation, and reliable handle cleanup.
Never writes raw uploads to temporary disk files or logs binary data.
"""

import logging
from typing import Optional
from fastapi import UploadFile, HTTPException, status

from app.config import settings
from app.engine.face_engine import ImageDecodeError

logger = logging.getLogger("guardianlink.ai.upload")

DEFAULT_CHUNK_SIZE: int = 64 * 1024  # 64 KB read buffer


async def read_and_validate_image_upload(
    upload_file: UploadFile,
    max_size: Optional[int] = None,
) -> bytes:
    """
    Safely reads an uploaded image file stream in bounded chunks.

    Guarantees:
    1. Rejection of empty files (0 bytes) with ImageDecodeError (maps to 422).
    2. Enforcement of configurable maximum upload size (raises HTTP 413).
    3. Reliable release of upload file handles in a finally block.
    4. Memory-bounded stream reading without spilling to disk.
    5. Zero binary logging or PII leakage.

    Args:
        upload_file: Incoming FastAPI UploadFile object.
        max_size: Optional override for maximum byte size. Defaults to settings.MAX_UPLOAD_SIZE_BYTES.

    Returns:
        bytes: Complete, in-memory raw image binary buffer ready for cv2.imdecode.

    Raises:
        HTTPException(413): If upload exceeds max_size.
        ImageDecodeError: If upload is empty (0 bytes).
    """
    limit = max_size if max_size is not None else settings.MAX_UPLOAD_SIZE_BYTES
    total_bytes = 0
    chunks = []

    try:
        while True:
            chunk = await upload_file.read(DEFAULT_CHUNK_SIZE)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > limit:
                logger.warning(
                    "Image upload exceeded size limit: %d bytes (limit: %d bytes)",
                    total_bytes,
                    limit,
                )
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Image upload size exceeds the maximum allowed limit of {limit} bytes.",
                )
            chunks.append(chunk)

        if total_bytes == 0:
            logger.warning("Rejected empty image upload (0 bytes).")
            raise ImageDecodeError("Uploaded image file is empty (0 bytes).")

        return b"".join(chunks)

    finally:
        try:
            await upload_file.close()
        except Exception as exc:
            logger.debug("Error closing upload file handle: %s", exc)
