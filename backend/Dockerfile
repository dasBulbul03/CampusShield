FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# gcc is required only to build a few Python wheels. It is purged after
# installation so the shipped image carries no compiler toolchain.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove gcc \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN chmod +x entrypoint.sh migrate.sh run.sh \
    && addgroup --system app \
    && adduser --system --ingroup app app \
    && mkdir -p /app/uploads \
    && chown -R app:app /app

# Convenience for local docker-compose / docker run only.
# ECS does NOT read this instruction - the task definition supplies its own
# healthCheck, and the ALB target group probes /health over HTTP.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

USER app

EXPOSE 8000

CMD ["./entrypoint.sh"]
