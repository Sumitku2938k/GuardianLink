# ==============================================================================
# GuardianLink AI Microservice — Dockerfile
# Multi-stage lightweight container for InsightFace & Qdrant integration
# ==============================================================================

FROM python:3.11-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install required system packages for OpenCV, ONNX Runtime, and build toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy microservice application source code and test assets
COPY app /app/app
COPY tests /app/tests
COPY .env.example /app/.env.example
COPY README.md /app/README.md

# Default network configuration
EXPOSE 8000

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch ASGI production server using single worker to prevent embedded lock collisions
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
