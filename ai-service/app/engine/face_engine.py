"""
Unified InsightFace model engine singleton.
Eliminates duplicate model loading across detection and embedding modules.
Ensures lazy loading so importing modules does not incur startup latency or download models during test suites.
"""

import threading
import logging
from typing import Optional, Any
from app.config import settings

logger = logging.getLogger("guardianlink.ai.engine")


class FaceEngineError(Exception):
    """Base exception for biometric face engine operations."""
    pass


class NoFaceDetectedError(FaceEngineError):
    """Raised when zero faces are detected in an image that requires a face."""
    pass


class MultipleFacesDetectedError(FaceEngineError):
    """Raised when more than one face is detected in an enrollment or reference image."""
    pass


class ImageDecodeError(FaceEngineError):
    """Raised when image bytes or path cannot be decoded into a valid pixel matrix."""
    pass


class ModelNotLoadedError(FaceEngineError):
    """Raised when inference is attempted but the deep learning model failed to load."""
    pass


class FaceEngine:
    """
    Thread-safe singleton managing the InsightFace FaceAnalysis runtime instance.
    Loads models on-demand or during explicit application lifespan startup.
    """

    _instance: Optional["FaceEngine"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        if FaceEngine._instance is not None:
            raise RuntimeError("FaceEngine is a singleton. Use FaceEngine.get_instance().")
        self._app: Optional[Any] = None
        self._is_loaded: bool = False
        self._init_lock: threading.Lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "FaceEngine":
        """Returns the thread-safe singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Resets the singleton instance (primarily for isolated test fixtures)."""
        with cls._lock:
            cls._instance = None

    def is_loaded(self) -> bool:
        """Returns True if the InsightFace model is active in memory."""
        return self._is_loaded and self._app is not None

    def load_model(self) -> Any:
        """
        Initializes the InsightFace FaceAnalysis pipeline using CPUExecutionProvider.
        Safe for concurrent callers; initializes exactly once.
        """
        if self._is_loaded and self._app is not None:
            return self._app

        with self._init_lock:
            if self._is_loaded and self._app is not None:
                return self._app

            try:
                from insightface.app import FaceAnalysis

                logger.info(
                    "Initializing InsightFace FaceAnalysis suite (model pack: %s, det_size: %s)",
                    settings.MODEL_NAME,
                    settings.DETECTION_SIZE,
                )

                app = FaceAnalysis(
                    name=settings.MODEL_NAME,
                    providers=["CPUExecutionProvider"],
                    root=settings.INSIGHTFACE_HOME or None,
                )

                app.prepare(
                    ctx_id=0,
                    det_size=settings.DETECTION_SIZE,
                )

                self._app = app
                self._is_loaded = True
                logger.info("InsightFace model suite loaded successfully into memory.")
                return self._app

            except Exception as exc:
                self._is_loaded = False
                self._app = None
                logger.error("Failed to initialize InsightFace model: %s", exc, exc_info=True)
                raise ModelNotLoadedError(f"InsightFace initialization failed: {exc}") from exc

    def get_app(self) -> Any:
        """
        Returns the prepared FaceAnalysis instance.
        Lazily loads the model if not already loaded.
        """
        if not self._is_loaded or self._app is None:
            return self.load_model()
        return self._app
