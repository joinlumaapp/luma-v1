---
name: build
description: Build the backend, shared package, or entire project
user_invocable: true
---

# Build Project

Build LUMA project components.

## Steps

1. Determine what to build based on user context:
   - **Shared package**: `cd packages/shared && npm run build`
   - **Backend**: `cd apps/backend && npm run build`
   - **All**: Build shared first, then backend (shared is a dependency)
2. Run the build commands
3. Report build results in Turkish
4. If build fails, analyze errors and suggest fixes
