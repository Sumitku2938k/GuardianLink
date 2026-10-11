"""
Middleware and security dependencies for GuardianLink AI Microservice.
"""

from app.middleware.internal_auth import verify_internal_key

__all__ = ["verify_internal_key"]
