---
name: lint
description: Run ESLint and TypeScript type checking across all workspaces
user_invocable: true
---

# Lint & Type Check

Run linting and type checking for the entire LUMA monorepo.

## Steps

1. Run ESLint across all workspaces:
   - `npm run lint --workspaces --if-present`
2. Run TypeScript type checking:
   - `npm run typecheck --workspaces --if-present`
   - Or fallback: `cd apps/backend && npx tsc --noEmit && cd ../../packages/shared && npx tsc --noEmit`
3. Report results in Turkish — list any errors with file paths and line numbers
4. If there are fixable errors, offer to auto-fix with `npx eslint --fix`
