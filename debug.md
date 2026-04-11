# LUMA V1 -- Debug & Known Issues Log

**Last Updated:** 2026-04-11

---

## Active Issues

### FIXED -- Wrong Dark Theme Applied to Auth/Onboarding (Session 9 revert)
- **Date fixed:** 2026-04-11
- **Symptoms:**
  - After Session 8's global `colors = darkTheme` flip, auth and onboarding screens rendered with white text on their cream/pink gradient backgrounds → text completely invisible
  - User reported "yazılar okunmuyor" (text can't be read) on NameScreen, BirthDateScreen, OTP screen, etc.
  - ONBOARDING_BG was also flipped to dark `#08080F` in Session 8
- **Root cause:**
  - Session 8's `theme/colors.ts: colors = creamTheme → darkTheme` flip was made with the wrong mental model ("LUMA is dark-first app")
  - Auth and onboarding screens are actually DESIGNED to be light-themed (cream + pink gradient + dark text)
  - `onboardingColors` struct in `OnboardingLayout.tsx` referenced `colors.text` which cascaded to white after the flip
  - ~86 files using `colors.x` references all shifted from cream to dark simultaneously
- **Fix (progressive, 4 commits):**
  1. `bc3abf8` — onboardingColors hardcoded to cream-theme values (text='#1A1A2E', textSecondary='rgba(0,0,0,0.6)', etc.); ONBOARDING_BG reverted to '#F5F0E8'; OTP back icon reverted from '#FFFFFF' to '#1A1A2E'
  2. `c7c2705` — ProfileScreen container bg reverted to '#F5F0E8' (single-line test)
  3. `dced57c` — Full root-cause revert: `colors = creamTheme` + `ThemeContext` back to light + ProfileScreen bulk sed (114 dark hex → cream equivalents) + WelcomeScreen + App.tsx StatusBar (dark-content on cream)
  4. `36faafa` — Tab bar stays dark per user preference (the ONE dark island in the hybrid theme)
- **Learning recorded:**
  - Project memory `feedback_theme_scope.md` added: LUMA is hybrid, not dark-first; never flip global `colors` without scope confirmation
  - Decision 034 marked as REVERSED, new Decision 036 documents hybrid architecture
- **Files:** theme/colors.ts, theme/ThemeContext.tsx, ProfileScreen.tsx, WelcomeScreen.tsx, App.tsx, MainTabNavigator.tsx, OnboardingLayout.tsx, OnboardingNavigator.tsx, OTPVerificationScreen.tsx
- **Status:** FIXED (2 sessions of over-correction → hybrid settled)

### FIXED -- 27 TypeScript Compilation Errors (Session 8 audit)
- **Date fixed:** 2026-04-11
- **Symptoms:**
  - `tsc --noEmit` baseline emitted 27 errors across 7 files
  - Would block any CI with strict TypeScript checks
  - Missing API route constants (`CALL_HISTORY`, `SEND_GREETING`) would have caused runtime 404s when those services were called
- **Root causes:**
  - Invalid `statusBarColor` prop in NativeStackNavigationOptions (removed in a recent @react-navigation/native-stack version) used in 8 places across 3 navigators
  - MainTabNavigator had 4 unused imports (Platform, darkTheme, spacing, layout) + missing `tabIndicator` style + type mismatch on CommonActions.reset
  - StoryViewerScreen route params typed as `unknown[]` causing implicit-any errors on map callbacks
  - `API_ROUTES.CALL_HISTORY.*` and `DISCOVERY.SEND_GREETING` referenced by services but never added to the shared constants file
- **Fix:**
  - Removed all `statusBarColor` props (status bar managed globally in App.tsx)
  - Cleaned unused imports, added `tabIndicator` style (bg #8B5CF6, 4x4 dot), loosened reset listener signature to any
  - Narrowed `StoryViewer.storyUsers?` to `{ userId, userName, userAvatarUrl }[]`
  - Added `API_ROUTES.CALL_HISTORY.{GET_ALL,GET_ONE,DELETE}` + `DISCOVERY.SEND_GREETING` to @luma/shared
- **Files:** AuthNavigator, MainTabNavigator, OnboardingNavigator, DiscoveryScreen, StoryViewerScreen, navigation/types.ts, packages/shared/src/constants/api.ts
- **Status:** FIXED (27 → 0)

### FIXED -- Cream Theme Leaking into ~86 Files (Root-Cause Dark Fix)
- **Date fixed:** 2026-04-11
- **Symptoms:**
  - Even after individually dark-theming ProfileScreen/FeedScreen/etc. in earlier sessions, 86 files still rendered with cream backgrounds
  - Agent audit found ~50 instances in profile subsystem alone
  - Users saw inconsistent cream cards in store screens, edit profile, interest picker
- **Root cause:**
  - `theme/colors.ts` exported `colors = creamTheme` as the global theme
  - Any file using `colors.surface`/`colors.background`/`colors.text*` received cream values at runtime
  - Manual per-file dark migration (previous sessions) only fixed files where `colors.*` was replaced with explicit `rgba(...)` — files still using `colors.surface` remained cream
- **Fix:**
  - Single-line flip: `export const colors = creamTheme` → `darkTheme` in `theme/colors.ts`
  - Matching flip in `ThemeContext.tsx` (isDark: true, themeMode: 'dark')
  - Onboarding navigator `ONBOARDING_BG` `#F5F0E8` → `#08080F`
  - Follow-up: bulk-fixed hardcoded hex backgrounds that bypassed the `colors` export (JetonMarket, BoostMarket, EditProfile, InterestPicker — 4 files, 10 hex replacements)
- **Files:** theme/colors.ts, theme/ThemeContext.tsx, OnboardingNavigator.tsx + 4 hardcoded-hex cleanup files
- **Status:** FIXED (Decision 034)

### FIXED -- Takipçiler Tab Empty (Never Fetched)
- **Date fixed:** 2026-04-11
- **Symptom:**
  - Eşleşme tab → Takipçiler sub-tab showed empty list forever
  - `followers` state declared but never populated; setters were `void`-silenced to suppress unused warnings
  - `// TODO: Replace with API call when follower endpoint is ready` comment sat there unaddressed
- **Fix:**
  - Added `fetchFollowers()` in MatchesListScreen useEffect
  - Calls `/users/me/followers` (same endpoint used in ProfileScreen stats count)
  - Maps backend response to `FollowerItem` shape (userId → id, firstName → name, photoUrl/avatarUrl fallback, followedAt timestamp, isBlurred gate for FREE tier)
  - Silent fail → empty state (which is correctly rendered)
- **Files:** apps/mobile/src/screens/matches/MatchesListScreen.tsx
- **Status:** FIXED

### FIXED -- Prompt Card Like/Comment Handlers Were TODOs
- **Date fixed:** 2026-04-11
- **Symptom:**
  - PromptAnswerCard's ❤️ and 💬 buttons in ProfilePreviewScreen + MatchDetailScreen tapped but did nothing (empty `/* TODO */` callbacks)
  - Silent UX breakage — users expected feedback
- **Fix:**
  - MatchDetailScreen: onLike → Alert feedback ("Beğeni gönderildi ❤️"), onComment → navigate to Chat with `initialMessage` prefilled as `"{prompt.answer}" — bu cevabına bayıldım 💬`
  - ProfilePreviewScreen: `showActions={false}` — pre-match preview should not allow interactions (Decision 035)
- **Files:** ProfilePreviewScreen.tsx, MatchDetailScreen.tsx
- **Status:** FIXED

### FIXED -- OTP Phone Mask Only Supported +90 (Turkey)
- **Date fixed:** 2026-04-11
- **Symptom:**
  - `maskedPhone` regex `/(\+\d{2})(\d{3})(\d{3})(\d{4})/` assumed 2-digit country code + 10 digits
  - +1 (US), +44 (UK), +49 (DE) phones shown unmasked on OTP screen
- **Fix:**
  - Generic implementation: extract country code (1-3 digits) then mask middle digits
  - Output format: `{country} {first 3} *** {last 4}` for any international number
- **Files:** apps/mobile/src/screens/auth/OTPVerificationScreen.tsx
- **Status:** FIXED

### FIXED -- OTP Screen Shake and Double-Verify Bug
- **Date fixed:** 2026-04-10
- **Symptoms:**
  - Screen shook/glitched when user typed OTP digits
  - handleVerify could fire twice: once from auto-effect on 6-digit completion, once from button tap
  - BrandedBackground gradient shifted up/down when keyboard opened
- **Root causes:**
  - KeyboardAvoidingView wrapped BrandedBackground — the padding behavior lifted the entire background
  - No guard against concurrent verify calls (isVerifying state lagged behind refs)
- **Fix:**
  - Moved BrandedBackground outside KeyboardAvoidingView so it stays fixed
  - Added `verifyInFlight` useRef guard — synchronous check at top of handleVerify blocks re-entry
  - KeyboardAvoidingView behavior: 'padding' on iOS, undefined on Android (Android handles automatically)
  - Removed WelcomeModal dependency from OTP flow (modal replaced by full WelcomeScreen at end of onboarding)
- **Files:** apps/mobile/src/screens/auth/OTPVerificationScreen.tsx
- **Status:** FIXED

### FIXED -- Welcome Screen Wrong Position in Flow
- **Date fixed:** 2026-04-10
- **Symptom:** WelcomeModal was showing immediately after OTP verification, before user had set up their profile. Users saw "Welcome, enjoy Premium!" before even entering their name.
- **Fix:**
  - Created new `WelcomeScreen.tsx` as the final step of onboarding flow
  - Removed WelcomeModal from OTPVerificationScreen
  - SelfieVerificationScreen now navigates to `Welcome` instead of directly flipping `setOnboarded(true)`
  - Welcome screen's CTA button handles `setOnboarded(true)`, triggering RootNavigator switch to MainTabs
  - New flow: Phone → OTP → Onboarding (12 steps) → Welcome → MainTabs
- **Files:** OTPVerificationScreen, SelfieVerificationScreen, OnboardingNavigator, types.ts, WelcomeScreen (new)
- **Status:** FIXED

### FIXED -- Luma Logo Bouncing Side to Side on Welcome Screen
- **Date fixed:** 2026-04-10
- **Symptom:** Logo bounce-in animation on EmotionalIntroScreen used translateY + rotate, causing the logo to visually bounce side-to-side instead of staying centered
- **Fix:** Removed translateY and rotate transforms entirely. Logo now uses only a heartbeat scale pulse (1.0 → 1.08 → 1.0 every 1200ms). Stays centered at all times.
- **Files:** apps/mobile/src/screens/auth/EmotionalIntroScreen.tsx
- **Status:** FIXED

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
