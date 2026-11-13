# WalnutIQ Background ML Worker Dockerfile
# Build from repository root:
#   docker build -f web-app/backend/Dockerfile -t walnutiq-ml-worker .

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    YOLO_CONFIG_DIR=/workspace/web-app/yolo/.ultralytics \
    HOST=0.0.0.0 \
    PORT=8000

# System dependencies for OpenCV, Ultralytics, and git-based CLIP install
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Install Python ML & scraping dependencies
COPY web-app/yolo/requirements.txt /workspace/web-app/yolo/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /workspace/web-app/yolo/requirements.txt && \
    pip install --no-cache-dir fastapi uvicorn pydantic && \
    pip install --no-cache-dir git+https://github.com/ultralytics/CLIP.git

# Copy backend server, YOLO scripts, and weights manifest
COPY web-app/backend /workspace/web-app/backend
COPY web-app/yolo /workspace/web-app/yolo
COPY weights /workspace/weights

EXPOSE 8000

CMD ["python", "web-app/backend/server.py"]

