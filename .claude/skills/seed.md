---
name: seed
description: Seed the database with development test data
user_invocable: true
---

# Seed Database

Run the Prisma seed script to populate the database with test data.

## Steps

1. Ensure Docker services are running (PostgreSQL must be available)
2. Run seed command: `cd apps/backend && npx prisma db seed`
3. Report results in Turkish — how many records were created
4. If seed fails, check:
   - Is PostgreSQL running? (`docker ps | grep luma-postgres`)
   - Are migrations applied? Suggest running `/migrate` first
   - Is there a connection issue? Check DATABASE_URL
