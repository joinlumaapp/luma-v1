# LUMA V1 -- Debug & Known Issues Log

**Last Updated:** 2026-04-10

---

## Active Issues

### FIXED -- Onboarding State Loss on Back/Forward Navigation
- **Date fixed:** 2026-04-10
- **Symptom:** When user pressed back during onboarding and came forward again, all their input (name, date, photos, answers) was lost — app appeared to "crash" or reset
- **Root cause:** React Navigation native stack unmounts screens on back navigation. All 11 onboarding screens initialized local state as empty (useState('') / useState(null)), so every remount cleared user input. Data was only saved to the profile store on "Continue" button press.
- **Fix:**
  - Every onboarding screen now initializes local state from profile store on mount
  - Selection screens (Gender, WhoToMeet, Sports, Smoking, Children) auto-save via useEffect on selection change
  - Text screens (Name, City, Bio) auto-save on unmount via useEffect cleanup
  - BirthDate auto-saves when all 3 parts (day/month/year) are selected
  - Photos screen restores photo URIs from store on mount
- **Affected files:** 11 screens in apps/mobile/src/screens/onboarding/
- **Status:** FIXED — zero state loss on back/forward

### FIXED -- Süper Uyum Yellow Glow Too Aggressive
- **Date fixed:** 2026-04-10
- **Symptom:** When a profile card showed Süper Uyum (90%+ compatibility), the entire card flashed yellow with border glow, shadow, and opacity pulse animations — visually overwhelming
- **Fix:** Removed all yellow glow/flash animations from DiscoveryCard. Kept only a subtle pink badge pulse (scale 1.0→1.1→1.0 every 2s). Card background stays normal.
- **Files:** apps/mobile/src/components/cards/DiscoveryCard.tsx
- **Status:** FIXED

### FIXED -- Verification Badge Position Inconsistent
- **Date fixed:** 2026-04-10
- **Symptom:** Verification badge used different colors (blue/purple/gold) and positions (left/bottom/inline) across DiscoveryCard, MatchesList, FeedCard, ProfileScreen
- **Fix:** Unified to green (#10B981) 22x22 badge at top-right (top: 8, right: 8) across all user cards. Single VerifiedBadge component updated to green. FeedCard uses new green inline badge.
- **Files:** 6 files (DiscoveryCard, VerifiedBadge, FeedCard, QuickProfilePreview, MatchesListScreen, CrossedPathsScreen)
- **Status:** FIXED

### FIXED -- API URL Pointing to Unreachable Domain
- **Date fixed:** 2026-04-08
- **Symptom:** Mobile app could not connect to production API
- **Root cause:** API URL in app.config.ts was pointing to wrong/unreachable domain
- **Fix:** Updated API URL to correct Railway production endpoint
- **Status:** FIXED

### OPEN -- Firebase PRIVATE_KEY Needs Fixing
- **Severity:** Medium
- **Symptom:** Push notifications disabled; Firebase PEM error on startup
- **Root cause:** FIREBASE_PRIVATE_KEY environment variable has formatting issues (newlines not properly escaped)
- **Workaround:** App starts without crashing (error is caught gracefully), but push notifications do not work
- **Fix applied:** Wrapped Firebase init in try/catch to prevent app crash
- **Next step:** Regenerate Firebase service account key, properly escape PRIVATE_KEY in Railway env vars

### OPEN -- Netgsm SMS Not Configured Yet
- **Severity:** Medium
- **Symptom:** Real SMS OTP cannot be sent to users
- **Workaround:** Using test OTP (hardcoded code) for development and testing
- **Next step:** Get Netgsm API credentials, implement SMS sending service, switch to real OTP for production

---

## Railway Deploy Lessons Learned

| Lesson | Detail |
|--------|--------|
| preDeployCommand | Do NOT put `prisma migrate` in preDeployCommand -- causes startup hang. Removed from railway.toml. |
| CSRF middleware | CSRF middleware blocked all mobile API requests. Removed entirely for mobile API compatibility. |
| Redis IO adapter | If Redis IO adapter fails to connect, app should still start. Added graceful degradation. |
| Health endpoint | Always have a `/health` endpoint for Railway to check service status. |
| Deploy trigger | Push to main branch triggers auto-deploy on Railway. |

---

## EAS Build Quota Management

| Item | Detail |
|------|--------|
| Tier | Free (limited builds per month) |
| Queue time | 15-25 minutes per build |
| Strategy | Collect ALL issues before triggering a build. Do not waste builds on single fixes. |
| Build command | `npx eas build --platform android --profile preview` |
| Check status | `npx eas build:list --limit 5` |

---

## Resolved Issues

| Date | Issue | Resolution |
|------|-------|------------|
| 2026-04-08 | preDeployCommand causing Railway crash | Removed from railway.toml |
| 2026-04-08 | API URL pointing to wrong server | Updated in app.config.ts |
| 2026-04-08 | CSRF middleware blocking mobile requests | Removed CSRF middleware entirely |
| 2026-04-08 | Firebase PEM error crashing entire app | Wrapped in try/catch, graceful degradation |
| 2026-04-08 | Redis IO adapter failure crashing app | Added fallback, app starts without Redis adapter |
| 2026-04-08 | Logo too small on login screen | Enlarged and repositioned |
| 2026-04-08 | Status bar not visible on dark screens | Set to black background with white icons |
| 2026-04-08 | MD files describing old "Room" concept | All MD files rewritten to match current app architecture |

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
- Cache: Redis on Railway
- Project runs in WSL: Ubuntu on Windows
- VS Code with Claude Code extension
