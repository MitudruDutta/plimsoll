FROM python:3.12-slim

WORKDIR /app

# Keep generated caches and bytecode outside the image runtime surface.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies used by health checks.
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
ARG BACKEND_REQUIREMENTS=requirements.docker.txt
COPY requirements*.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r "${BACKEND_REQUIREMENTS}"

# Copy application code
COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/healthz || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
