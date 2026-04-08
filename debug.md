# LUMA V1 — Debug & Known Issues Log

**Last Updated:** 2026-04-08

---

## Active Issues

### 🔴 Critical

**Railway Backend Deploy**
- Status: Intermittent failures
- Symptom: Sunucu başlamıyor, log yok
- Recent fix: preDeployCommand removed from railway.toml
- Next step: Monitor next deploy, check health endpoint

**API URL Connection**
- Status: Mobile app not connecting to production API
- Fix applied: Correct API URL in app config
- Next step: Verify after APK build completes

---

### 🟡 Medium

**EAS Build Queue**
- Status: Free tier queue delays (15-25 min)
- Build ID: a19fb2fd-9a57-4d86-93f9-...
- Contains fixes: API URL, enlarged logo, black status bar

**WebRTC Not Tested**
- Status: Video infrastructure exists but no real user testing
- Affects: Canlı tab, messaging voice/video calls
- Next step: Test with 2 devices on same network first

---

### 🟢 Low / Cosmetic

**Status Bar Styling**
- Fix applied: Siyah arka plan, beyaz ikonlar
- Included in current build

**Logo Size**
- Fix applied: Daha büyük ve yukarıda
- Included in current build

---

## Resolved Issues

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-04-08 | preDeployCommand causing Railway crash | Removed from railway.toml |
| 2026-04-08 | API URL pointing to wrong server | Updated in app.config.ts |
| 2026-04-08 | Logo too small on login screen | Enlarged and repositioned |
| 2026-04-08 | Status bar not visible on dark screens | Set to black background with white icons |
| 2026-04-08 | MD files describing old "Room" concept | All MD files rewritten to match current app |

---

## Debug Commands

```bash
# Check Railway deploy status
railway logs --latest

# Check EAS build status
npx eas build:list --limit 5

# Run local backend
cd apps/backend && npm run start:dev

# Run mobile in dev mode
cd apps/mobile && npx expo start

# Check Prisma schema
cd apps/backend && npx prisma validate

# Run tests
npm run test

# Type check
npm run type-check
```

---

## Environment Notes
- Backend: Railway (Node.js + NestJS)
- Mobile: Expo / EAS Build
- Database: PostgreSQL on Railway
- Project runs in WSL: Ubuntu on Windows
- VS Code with Claude Code extension
