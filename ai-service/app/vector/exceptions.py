"""
Custom domain exceptions for GuardianLink vector database subsystem.
Provides clear, actionable error signaling without leaking internal secrets.
"""


class VectorStoreError(Exception):
    """Base exception for all vector database operations."""
    pass


class QdrantConnectionError(VectorStoreError):
    """Raised when the standalone Qdrant server is unreachable, times out, or fails to connect."""
    pass


class IncompatibleCollectionError(VectorStoreError):
    """
    Raised when a target collection exists but possesses an incompatible
    vector dimension, distance metric, or configuration.
    """
    pass


class InvalidVectorError(VectorStoreError, ValueError):
    """
    Raised when an input biometric vector fails numerical validation
    (e.g., dimension != 512, contains NaN/Inf, zero norm, or invalid values).
    """
    pass


class InvalidChildIdError(VectorStoreError, ValueError):
    """Raised when a provided child_id is empty, non-string, or invalid format."""
    pass


class VectorNotFoundError(VectorStoreError):
    """Raised when an operation expects an existing vector point that was not found."""
    pass
