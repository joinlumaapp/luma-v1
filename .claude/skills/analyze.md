---
name: analyze
description: Analyze code quality — complexity, duplication, TODO/FIXME count, test coverage gaps
user_invocable: true
---

# Code Quality Analysis

Run a comprehensive code quality analysis on the LUMA codebase.

## Steps

1. Gather metrics in parallel:
   - Count total lines of code per workspace (backend, mobile, shared)
   - Count TODO/FIXME/XXX/HACK comments
   - Count test files and test lines
   - Check for `any` type usage
   - Count TypeScript files without corresponding test files
   - Identify largest files (potential complexity hotspots)

2. Calculate metrics:
   - Test-to-code ratio
   - Files without tests (coverage gaps)
   - TODO density per 1000 lines

3. Present analysis report in Turkish:
   ```
   LUMA V1 — Kod Kalitesi Raporu
   ──────────────────────────────
   Toplam Kod: X satır
   Test Kodu: X satır (X% oran)
   TODO/FIXME: X adet
   `any` Kullanımı: X adet
   Test Kapsamı Boşlukları: X dosya
   En Büyük Dosyalar: [list]

   Öneriler:
   - [improvement suggestions]
   ```
