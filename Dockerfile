# ==========================================
# 🌌 SINGULARITY - MULTI-STAGE DOCKERFILE
# Next-Gen Minecraft Server Orchestrator & Mission Control
# Crafted by NebulaX Studio
# ==========================================

# ------------------------------------------
# Stage 1: Builder
# ------------------------------------------
FROM node:22-bookworm-slim AS builder

WORKDIR /build

# Copy build manifests
COPY package.json package-lock.json* ./
COPY tsconfig.json tsconfig.server.json ./
COPY src/delivery/web-dashboard/package.json ./src/delivery/web-dashboard/

# Install build dependencies
RUN npm ci || npm install
RUN cd src/delivery/web-dashboard && (npm ci || npm install)

# Copy source code
COPY src/ ./src/

# Compile TypeScript backend and Vite React SPA
RUN npm run build:server
RUN npm run build:web

# Remove devDependencies to produce clean production tree
RUN npm prune --omit=dev

# ------------------------------------------
# Stage 2: Production Multi-Java Runtime
# ------------------------------------------
FROM debian:bookworm-slim AS runner

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV SINGULARITY_SFTP_PORT=2022
ENV SINGULARITY_SFTP_HOST=0.0.0.0
ENV SINGULARITY_SERVERS_DIR=/app/data/servers
ENV SINGULARITY_DB_PATH=/app/data/singularity.db

WORKDIR /app

# Install base utilities, procps, and Java 17
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    procps \
    gnupg \
    tar \
    unzip \
    openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

# Add Adoptium repo for Eclipse Temurin Java 21 (Default) and Java 8 (Legacy mods)
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" | tee /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && apt-get install -y --no-install-recommends \
    temurin-21-jre \
    temurin-17-jre \
    temurin-8-jre \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set default Java environment to Java 21
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jre-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Copy application artifacts from builder
COPY --from=builder /build/package.json ./package.json
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

# Create persistent storage directories
RUN mkdir -p /app/data/servers && chmod -R 777 /app/data

# Ports:
# 3000: Web Dashboard & REST/WebSocket API
# 2022: Embedded SFTP Server (Antigravity IDE & VS Code live sync)
# 25565-25585: Minecraft Server Instances Game Ports (TCP & UDP)
EXPOSE 3000 2022 25565-25585

VOLUME ["/app/data"]

HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/delivery/http/server.js"]
