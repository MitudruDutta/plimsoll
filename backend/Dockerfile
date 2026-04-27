FROM python:3.12-slim

WORKDIR /app

# Keep generated caches and bytecode outside the image runtime surface.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

# Install uv and system dependencies used by health checks.
COPY --from=ghcr.io/astral-sh/uv:0.9.7 /uv /uvx /usr/local/bin/
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install runtime dependencies from the repo-level pyproject.
ARG INSTALL_AI=false
ARG INSTALL_SCRIPTS=true
COPY pyproject.toml .
RUN set -e; \
    EXTRAS=""; \
    if [ "$INSTALL_AI" = "true" ]; then EXTRAS="$EXTRAS --extra ai"; fi; \
    if [ "$INSTALL_SCRIPTS" = "true" ]; then EXTRAS="$EXTRAS --extra scripts"; fi; \
    uv pip install --system --no-cache -r pyproject.toml $EXTRAS

# Create an unprivileged runtime user before copying the app.
RUN groupadd --system plimsoll && \
    useradd --system --gid plimsoll --home-dir /app --shell /usr/sbin/nologin plimsoll

# Copy application code
COPY backend/ .
RUN mkdir -p /app/data && chown -R plimsoll:plimsoll /app

EXPOSE 8000

USER plimsoll

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/healthz || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
