# --- Stage 1: Build (install all deps, compile native addons) ---
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Prune devDependencies — keeps only what's needed at runtime
RUN npm prune --omit=dev

# --- Stage 2: Production image ---
FROM node:22-slim

WORKDIR /app

# Copy only production node_modules and app source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src

ENV NODE_ENV=production
ENV PORT=8000

# Non-root user for security
RUN groupadd --gid 1001 app && useradd --uid 1001 --gid app --shell /bin/bash app
RUN chown app:app /app
USER app

# SQLite DB (safespot.db) is created in /app at runtime — mount a volume here to persist data
VOLUME ["/app"]

EXPOSE 8000

CMD ["node", "src/index.js"]
