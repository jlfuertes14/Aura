# Multi-runtime Dockerfile for AURA Music Extraction & Streaming Backend
# Combines Node.js 20 with Python 3, yt-dlp, and ffmpeg
FROM node:20-slim

# Install Python 3, pip, ffmpeg, and CA certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Symlink python -> python3
RUN ln -sf /usr/bin/python3 /usr/bin/python

WORKDIR /app

# Install Python audio extraction dependencies
COPY server/requirements.txt ./server/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r server/requirements.txt

# Copy server code and assets
COPY server/ ./server/
COPY assets/ ./assets/

# Keep Node memory strictly capped under 256MB for 512MB RAM free-tier containers
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=256"
ENV PORT=5000

# Health check configuration for Render / Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE 5000

CMD ["node", "server/server.js"]
