# ─── Stage 1: Build ─────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies (including dev for build tooling)
RUN npm ci --ignore-scripts

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Build shared package first
RUN npm run shared:build

# Generate Prisma client
RUN cd apps/backend && npx prisma generate --schema=src/prisma/schema.prisma

# Build backend
RUN cd apps/backend && npm run build

# Prune devDependencies for production image
RUN npm prune --omit=dev --workspaces && \
    npm prune --omit=dev

# ─── Stage 2: Production ────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper PID 1 signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
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

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER luma

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/ping || exit 1

# Use dumb-init to handle signals properly (graceful shutdown)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/backend/dist/main.js"]
