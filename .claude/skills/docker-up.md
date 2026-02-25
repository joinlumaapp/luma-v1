---
name: docker-up
description: Start or restart Docker Compose services (PostgreSQL, Redis, Elasticsearch, Backend)
user_invocable: true
---

# Docker Services

Manage Docker Compose services for LUMA local development.

## Steps

1. Check current Docker status: `docker ps --format "table {{.Names}}\t{{.Status}}"`

2. Based on user intent:
   - **Start all**: `docker-compose up -d`
   - **Start specific**: `docker-compose up -d <service-name>`
   - **Restart**: `docker-compose restart`
   - **Stop**: `docker-compose down`
   - **Logs**: `docker-compose logs --tail=50 <service-name>`

3. Wait for health checks to pass

4. Report status in Turkish:
   ```
   Docker Servisleri
   ─────────────────
   ✓ PostgreSQL (luma-postgres) — Port 5432
   ✓ Redis (luma-redis) — Port 6379
   ✓ Elasticsearch (luma-elasticsearch) — Port 9200
   ✓ Backend API (luma-backend) — Port 3000
   ```
