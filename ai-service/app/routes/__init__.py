"""
API routes package for GuardianLink AI Microservice.
"""

from app.routes.health import router as health_router
from app.routes.enroll import router as enroll_router
from app.routes.search import router as search_router
from app.routes.delete import router as delete_router

__all__ = [
    "health_router",
    "enroll_router",
    "search_router",
    "delete_router",
]
