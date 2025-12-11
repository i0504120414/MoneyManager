# Build stage
FROM node:22 AS builder

# Install curl for certificate handling
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Handle Netfree certificate (if behind corporate proxy)
RUN curl -sL https://netfree.link/dl/unix-ca.sh -o /tmp/install-ca.sh && \
    sh /tmp/install-ca.sh && \
    rm /tmp/install-ca.sh || true

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
ENV DEBUG='visa-cal'

WORKDIR /app

COPY package.json package-lock.json ./
COPY patches ./patches

# Install dependencies (ignore postinstall script initially)
RUN npm ci --ignore-scripts && \
    npx patch-package

COPY src ./src
COPY database.sql ./.env.example ./

# Runtime stage
FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DEBUG='visa-cal'

# Install chromium and dependencies for headless mode
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium \
        chromium-common \
        libnss3 \
        fonts-noto-core \
        fonts-noto-unhinted \
        libatk-bridge2.0-0 \
        libgtk-3-0 \
        libdrm2 \
        libgbm1 \
        libx11-xcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxkbcommon0 \
        libxrandr2 \
        xdg-utils \
        curl \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Handle Netfree certificate in runtime stage too
RUN curl -sL https://netfree.link/dl/unix-ca.sh -o /tmp/install-ca.sh && \
    sh /tmp/install-ca.sh && \
    rm /tmp/install-ca.sh || true

# Create non-root user for security (use UID 1001 to avoid conflicts)
RUN useradd -m -u 1001 appuser

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY src ./src
COPY patches ./patches
COPY database.sql ./.env.example ./

# Remove dev dependencies to reduce image size
RUN npm prune --omit=dev

# Set proper ownership
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

ENTRYPOINT ["node"]



