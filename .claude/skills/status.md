---
name: status
description: Show comprehensive project status — git, Docker, tests, build health
user_invocable: true
---

# Project Status

Show a comprehensive status report for the LUMA project.

## Steps

1. Gather information in parallel:
   - `git status` — Working tree status
   - `git log --oneline -5` — Recent commits
   - `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"` — Running containers
   - Check if node_modules exists in root, apps/backend, apps/mobile, packages/shared
   - Check if apps/backend/dist exists (built?)
   - Check if packages/shared/dist exists (built?)
   - Check if apps/backend/prisma/migrations exists and count migrations

2. Present a formatted status report in Turkish:
   ```
   LUMA V1 — Proje Durumu
   ────────────────────────
   Git: [branch] — [clean/dirty] — [X uncommitted changes]
   Docker: [X/4 services running]
   Backend: [built/not built]
   Shared: [built/not built]
   Migrations: [X migrations applied]
   Son Commit: [commit message]
   ```
