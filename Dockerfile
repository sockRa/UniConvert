# Build stage for Node.js application
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build TypeScript
RUN npm run build

# Production stage with all conversion tools
FROM debian:bookworm-slim AS runtime

# Install runtime dependencies with aggressive size optimization
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Node.js runtime
    nodejs \
    npm \
    # FFmpeg for video/audio
    ffmpeg \
    # Pandoc for documents
    pandoc \
    # LibreOffice headless/nogui variants (much smaller than full packages)
    libreoffice-writer-nogui \
    libreoffice-calc-nogui \
    libreoffice-impress-nogui \
    # Fonts for document rendering
    fonts-liberation \
    fonts-dejavu-core \
    # Utilities
    curl \
    ca-certificates \
    # Cleanup in same layer to reduce image size
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    # Remove unnecessary files
    && rm -rf /usr/share/doc/* \
    && rm -rf /usr/share/man/* \
    && rm -rf /usr/share/locale/* \
    && rm -rf /var/cache/* \
    && rm -rf /tmp/* \
    # Create app user for security
    && useradd -m -s /bin/bash appuser

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

# Create directories for uploads and outputs and set ownership
RUN mkdir -p /app/uploads /app/outputs && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "dist/server.js"]
