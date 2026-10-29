FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for OpenCV and InsightFace ONNX runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# Copy application source
COPY . .

# Expose internal integration port (service-to-service communication)
EXPOSE 8001

CMD ["uvicorn", "integration_app:app", "--host", "0.0.0.0", "--port", "8001"]
