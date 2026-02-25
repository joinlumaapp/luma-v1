---
name: test
description: Run backend unit tests, E2E tests, or specific module tests
user_invocable: true
---

# Run Tests

Run the test suite for the LUMA backend. Determine which tests to run based on user context.

## Steps

1. Check if a specific module was mentioned (e.g., "test auth" → run auth tests only)
2. Run the appropriate test command:
   - **All unit tests**: `cd apps/backend && npx jest --passWithNoTests`
   - **Specific module**: `cd apps/backend && npx jest --testPathPattern="modules/<module-name>" --passWithNoTests`
   - **E2E tests**: `cd apps/backend && npx jest --config test/jest-e2e.json --passWithNoTests`
   - **With coverage**: `cd apps/backend && npx jest --coverage --passWithNoTests`
3. Report results in Turkish to the user with pass/fail counts and any failures
