# ─────────────────────────────────────────────────────────
# LUMA V1 — Production-Ready Multi-Stage Dockerfile
# Build: docker build -t luma-backend .
# Run:   docker run -p 3000:3000 --env-file .env luma-backend
# ─────────────────────────────────────────────────────────

# ─── Stage 1: Dependencies ──────────────────────────────
# Separate layer for dependency installation so it is cached
# independently from source code changes.
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first for optimal layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (dev included — needed for build tooling)
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ────────────────────────────────────
FROM deps AS builder

# Copy source code (changes here do not invalidate dep cache)
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Build shared package first (backend depends on it)
RUN npm run shared:build

# Generate Prisma client for the target platform
RUN cd apps/backend && npx prisma generate --schema=src/prisma/schema.prisma

# Build backend TypeScript -> JavaScript
RUN cd apps/backend && npm run build

# Prune dev dependencies — production image only needs runtime deps
RUN npm prune --omit=dev --workspaces && \
    npm prune --omit=dev

# Remove leftover TypeScript source to shrink the layer
RUN rm -rf apps/backend/src packages/shared/src

# ─── Stage 3: Production ───────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper PID 1 signal handling
# Install wget for health check (curl not available in alpine)
RUN apk add --no-cache dumb-init wget

# Security: create a non-root user and group
RUN addgroup -g 1001 -S luma && \
    adduser -S luma -u 1001 -G luma

WORKDIR /app

# Copy built artifacts from builder (only production deps)
COPY --from=builder --chown=luma:luma /app/package.json ./
COPY --from=builder --chown=luma:luma /app/node_modules ./node_modules
COPY --from=builder --chown=luma:luma /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=luma:luma /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=luma:luma /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=luma:luma /app/apps/backend/package.json ./apps/backend/
COPY --from=builder --chown=luma:luma /app/apps/backend/node_modules/.prisma ./apps/backend/node_modules/.prisma
COPY --from=builder --chown=luma:luma /app/apps/backend/src/prisma/schema.prisma ./apps/backend/src/prisma/

# Environment defaults (overridden at runtime via .env or ECS task definition)
ENV NODE_ENV=production \
    PORT=3000

# Switch to non-root user
USER luma

EXPOSE 3000

# Health check — matches the /api/v1/health/ping endpoint in HealthModule
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/ping || exit 1

# Use dumb-init to handle signals properly (graceful shutdown for WebSockets)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]
