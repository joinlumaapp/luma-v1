---
name: migrate
description: Run Prisma database migrations (generate, migrate, push, reset)
user_invocable: true
---

# Database Migration

Run Prisma database migrations for the LUMA backend.

## Steps

1. Determine which migration action is needed:
   - **Generate client**: `cd apps/backend && npx prisma generate`
   - **Create migration**: `cd apps/backend && npx prisma migrate dev --name <migration-name>`
   - **Apply migrations**: `cd apps/backend && npx prisma migrate deploy`
   - **Push schema** (dev only): `cd apps/backend && npx prisma db push`
   - **Reset database** (dev only): Ask for confirmation first, then `cd apps/backend && npx prisma migrate reset`
2. If creating a new migration, ask user for a descriptive migration name
3. Report results in Turkish
4. Warn before any destructive operations (reset, push with data loss)
