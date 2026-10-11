"""
Internal service authentication dependency.
Protects /internal/* endpoints from direct unauthorized or external browser access.
"""

import secrets
from fastapi import Header, HTTPException, status
from app.config import settings


async def verify_internal_key(
    x_internal_service_key: str | None = Header(
        default=None,
        alias="X-Internal-Service-Key",
        description="Shared pre-shared secret key for internal service-to-service calls",
    ),
) -> str:
    """
    Validates that incoming internal requests supply the expected shared secret key.
    Uses constant-time comparison to prevent timing side-channel attacks.
    """
    if not x_internal_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required header: X-Internal-Service-Key",
            headers={"WWW-Authenticate": "InternalKey"},
        )

    expected_key = settings.INTERNAL_SERVICE_KEY

    # Use constant-time comparison to protect against timing attacks
    if not secrets.compare_digest(x_internal_service_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service key. Access denied.",
            headers={"WWW-Authenticate": "InternalKey"},
        )

    return x_internal_service_key
