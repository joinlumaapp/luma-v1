---
name: audit
description: Run security audit — npm vulnerabilities, code patterns, dependency check
user_invocable: true
---

# Security Audit

Run a comprehensive security audit on the LUMA project.

## Steps

1. Run dependency audit:
   - `npm audit` — Check for known vulnerabilities
   - `npm audit --json | head -50` — Get structured output

2. Check for common security anti-patterns:
   - Search for hardcoded secrets/passwords in source code
   - Check for `any` type usage (TypeScript safety)
   - Look for console.log with sensitive data
   - Check .env files are in .gitignore
   - Verify rate limiting is configured
   - Check CORS configuration

3. Report findings in Turkish:
   - Critical vulnerabilities (must fix)
   - Warnings (should fix)
   - Best practice recommendations
   - Overall security score assessment
