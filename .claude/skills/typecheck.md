---
name: typecheck
description: Run TypeScript strict type checking across all packages
user_invocable: true
---

# TypeScript Type Check

Run strict TypeScript type checking across the entire LUMA monorepo.

## Steps

1. Run type checking for each workspace:
   - `cd packages/shared && npx tsc --noEmit`
   - `cd apps/backend && npx tsc --noEmit`
2. If any errors found:
   - List each error with file path, line number, and error message
   - Group errors by file
   - Suggest fixes for common issues
3. Report results in Turkish with total error count
