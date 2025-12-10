# Build stage
FROM node:lastest AS builder

# Install curl for certificate handling
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*



ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production


WORKDIR /app

COPY package.json package-lock.json ./
COPY patches ./patches

# Install dependencies (ignore postinstall script initially)
RUN npm ci

COPY src ./src
COPY database.sql ./.env.example ./

# Runtime stage
FROM node:slim AS runner


RUN npm run build && \
    npm prune --omit=dev && \
    npm cache clean --force && \
    rm -rf src


ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium


# Install chromium and dependencies for headless mode
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        chromium libnss3 \
        fonts-noto-core fonts-noto-unhinted \
        libatk-bridge2.0-0 libgtk-3-0 libdrm2 libgbm1 \
        libx11-xcb1 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security (use UID 1001 to avoid conflicts)
RUN useradd -m -u 1001 appuser

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY src ./src
COPY patches ./patches
COPY database.sql ./.env.example ./
COPY --from=builder /app/dst ./dst

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dst ./dst


