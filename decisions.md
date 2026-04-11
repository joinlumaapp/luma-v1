# LUMA V1 -- Architecture Decisions Log

**Purpose:** Key decisions made during development, with reasoning. Claude Code should respect these decisions and not reverse them.

---

## Decision 001: 3 Packages -- Nothing Locked, Only Quantity Limits
**Date:** 2026-04-08
**Decision:** Ucretsiz (0 TL), Premium (499 TL/ay), Supreme (1.199 TL/ay) -- 3 packages only. Every feature is accessible to all users; only quantities differ by package.
**Rejected:** Gold, Pro, Reserved (old 4-package model), feature-locking approach
**Reasoning:** Locking features frustrates users and causes churn. Letting everyone taste features creates desire to upgrade. "Tadi damaginda kalsin" strategy. Simpler for users to understand.

## Decision 002: Swipe-Based Discovery (Not Room-Based)
**Date:** 2026-04-08
**Decision:** Kesfet tab uses card swipe system (begen/pas gec/super begeni) for discovery. REMOVED old "Compatibility Room" concept entirely (5-min wait, 30-min free room, 99 TL extension).
**Reasoning:** The app evolved from a room-based concept to a modern social+dating+live discovery platform. Swipe is intuitive, proven, and allows compatibility scores to be shown on cards.

## Decision 003: Jeton Economy for Premium Actions
**Date:** 2026-04-08
**Decision:** Jeton is the universal in-app currency. Used for: Selam Gonder, Super Begeni, Boost, Canli sessions, voice/video calls (free users). Purchasable (79,99 TL / 199,99 TL / 349,99 TL) and earnable through missions/ads.
**Reasoning:** Single currency simplifies the economy. Creates engagement loop -- users can earn through activity or buy with money.

## Decision 004: 20+5 Question System (Not 45)
**Date:** 2026-04-08
**Decision:** Uyum Analizi (20 questions) is MANDATORY, calculates compatibility % (range 47-97, 90+ = Super Uyum). Kisilik Testi (5 questions) is OPTIONAL, gives profile tag only ("Acik Fikirli" gibi). 4 discrete choices per question, NOT Likert 1-5.
**Rejected:** 45 questions (20 core + 25 premium), single merged test, Likert scale
**Reasoning:** Uyum drives the matching algorithm. Kisilik is cosmetic/social only. Clear separation prevents confusion. 100% is impossible; 90+ = Super Uyum.

## Decision 005: 4 Relationship Types
**Date:** 2026-04-08
**Decision:** Takip (one-way follow), Arkadas (mutual follow), Eslesme (mutual like from Kesfet), Super Begeni (jeton-powered like).
**Reasoning:** Multiple paths to connection. Akis -> Takip -> Arkadas. Kesfet -> Begeni -> Eslesme. Canli -> Takip -> Arkadas. All roads lead to Eslesme section.

## Decision 006: 5 Hedefler (Not 3 Intention Tags)
**Date:** 2026-04-08
**Decision:** 5 hedef options: Evlenmek, Iliski bulmak, Sohbet/Arkadas, Kulturleri ogrenmek, Dunyayi gezmek. Shown on profile and used in matching algorithm.
**Rejected:** Old 3 intention tags (SERIOUS_RELATIONSHIP, EXPLORING, NOT_SURE)
**Reasoning:** Richer goal system supports LUMA's "not just dating" vision. Users looking for friendships, cultural exchange, and travel companions are equally valid.

## Decision 007: Railway for Backend Hosting
**Date:** 2026-04-08
**Decision:** Use Railway for backend deployment (Node.js + NestJS). PostgreSQL and Redis also hosted on Railway.
**Lessons learned:** Do NOT put prisma migrate in preDeployCommand (causes startup hang). Remove CSRF middleware for mobile API. Monitor deploy logs carefully.

## Decision 008: EAS for Mobile Builds
**Date:** 2026-04-08
**Decision:** Use Expo Application Services (EAS) for building and distributing mobile app. Free tier has build queue delays (15-25 min) and limited builds per month.
**Reasoning:** EAS simplifies React Native build process. Manage build quota carefully -- collect all issues before triggering a build.

## Decision 009: Firebase for Push Notifications
**Date:** 2026-04-08
**Decision:** Firebase Cloud Messaging (FCM) for push notifications. 3-tier system: Critical (always push), Important (default on), Low Priority (default off).
**Current status:** PRIVATE_KEY needs fixing; push notifications currently disabled.
**Reasoning:** Prevents notification fatigue while ensuring critical events (matches, messages) always reach users.

## Decision 010: Redis for Caching + Rate Limiting
**Date:** 2026-04-08
**Decision:** Redis used for caching frequently accessed data and rate limiting API endpoints. If Redis IO adapter fails, app should still start (graceful degradation).
**Reasoning:** Performance optimization for discovery feed, user sessions, and preventing API abuse.

## Decision 011: PostgreSQL as Primary Database
**Date:** 2026-04-08
**Decision:** PostgreSQL with Prisma ORM. All entities: User, Profile, Match, Follow, Story, Post, Jeton, Boost, Notification, etc.
**Reasoning:** Relational data model fits user relationships, matches, and social features. Prisma provides type-safe database access.

## Decision 012: Canli = Omegle-Style, Discovery Only
**Date:** 2026-04-08
**Decision:** Canli tab is exclusively for Omegle-style random video matching. Voice/video calls between matched users happen in Messaging section. End-of-call buttons: Takip Et / Begen / Sonraki.
**Reasoning:** Separates discovery (Canli) from communication (Messaging). Users understand: Canli = meet new people, Messages = talk to existing connections.

## Decision 013: Bumpy-Inspired UI Animations
**Date:** 2026-04-08
**Decision:** Use Bumpy dating app as design reference for animations, gradients, and modern UI polish. Gradient themes (pink-peach light, purple-dark premium), micro-animations (begeni, takip, eslesme), konfeti/kalp eslesme animasyonu, Super Uyum glow.
**Reasoning:** Current design is functional but plain. Bumpy-level polish will make LUMA feel premium and competitive.

## Decision 014: Test OTP for Development
**Date:** 2026-04-08
**Decision:** Use hardcoded test OTP (e.g., 123456) during development. Netgsm SMS integration not yet configured. Real OTP for production only.
**Reasoning:** Speeds up development and testing. No SMS costs during dev phase. Will switch to Netgsm for production launch.

## Decision 015: Photos Min 2, Max 9
**Date:** 2026-04-08
**Decision:** Users must upload minimum 2 photos and can upload maximum 9. 3x3 grid display. First photo = ana profil fotosu.
**Reasoning:** Minimum 2 ensures profile quality. Maximum 9 (3x3) provides enough variety to showcase personality without overwhelming.

## Decision 016: Monorepo Structure
**Date:** 2026-04-08
**Decision:** Monorepo with apps/mobile (React Native + Expo), apps/backend (NestJS), and packages/shared (shared types, constants, API routes). All shared types in @luma/shared.
**Reasoning:** Single repository keeps frontend and backend in sync. Shared types prevent API contract mismatches. Simplifies CI/CD.

## Decision 017: Score Range 47-97 with Super Uyum at 90+
**Date:** 2026-04-08
**Decision:** Compatibility score is always between 47 and 97. 100% is mathematically impossible. Scores >= 90 trigger Super Uyum with special effects (glow animation, priority, konfeti, badge).
**Reasoning:** 47 minimum prevents demoralizing "0% compatible" results. 97 cap maintains authenticity -- perfect compatibility doesn't exist. 90+ threshold creates an aspirational tier.

## Decision 018: Phone Auth = Direct to Onboarding (No Email/Password)
**Date:** 2026-04-09
**Decision:** Phone authentication flow goes directly from OTP verification to onboarding. No email entry or password creation screen required. Phone number IS the login credential.
**Rejected:** Requiring email + password after phone OTP (old flow: Phone→OTP→Email→Password→Onboarding)
**Reasoning:** Adding email/password on top of phone OTP creates unnecessary friction. Users already authenticated via phone. Social login (Google/Apple) also skips email/password for the same reason.

## Decision 019: Google Sign-In via expo-auth-session
**Date:** 2026-04-09
**Decision:** Use expo-auth-session with Google provider for Google Sign-In. Backend POST /auth/google creates/finds user. Pre-fills name from Google profile into onboarding.
**Reasoning:** expo-auth-session works in Expo Go during development. Google provides name + email, reducing onboarding friction. Same pattern as Apple Sign-In for consistency.

## Decision 020: Referral System with Jeton Rewards
**Date:** 2026-04-09
**Decision:** Each user gets auto-generated LUMA-XXXX referral code. When a new user signs up with a referral code, BOTH users earn 50 jeton. Max one referral code per user.
**Reasoning:** Viral growth mechanism. Mutual reward incentivizes both inviter and invitee. 50 jeton is enough to try premium actions (3 super likes) but not enough to replace purchasing.

## Decision 021: Premium Expiration Campaign (%20 Discount)
**Date:** 2026-04-09
**Decision:** Daily cron checks for subscriptions expiring in 3 days. Sends push notification + shows full-screen modal on app open. 20% discount valid for 48 hours only. After that, normal pricing.
**Reasoning:** Reduces involuntary churn. Time-limited discount creates urgency. Full-screen modal ensures visibility.

## Decision 022: i18n with Turkish Default
**Date:** 2026-04-09
**Decision:** Use i18next + react-i18next for internationalization. Turkish is the default language. English available via Settings toggle. Device locale auto-detection with Turkish fallback.
**Reasoning:** Turkey is the launch market, so Turkish must be perfect. English opens the door for international expansion. Starting with main screens only -- full translation can be incremental.

## Decision 023: Bold Typography as Brand Identity
**Date:** 2026-04-09
**Decision:** All fontWeights shifted one level up globally (300→400, 400→500, 500→600, 600→700). All fontSizes increased by 2px. Minimum body text is 16px/500 weight. Headings minimum 700 weight.
**Reasoning:** Thin/light typography feels weak and unconfident on mobile screens. Bold, thick text creates a premium, assertive brand feel. Matches the Bumpy-inspired design direction.

## Decision 024: Merge Bio + PromptSelection into "Profilini Zenginleştir"
**Date:** 2026-04-10
**Decision:** Removed standalone BioScreen from onboarding. Bio and prompts are now combined into a single "Profilini Zenginleştir" experience — Hinge+Bumble inspired with 5 categories, 30 emoji-tagged prompts, and expand-to-answer cards. Onboarding steps reduced from 13 to 12.
**Rejected:** Two separate screens for bio text and prompts (old flow)
**Reasoning:** Users found it confusing to have both a "write your bio" screen and a "pick prompts" screen. Modern dating apps (Hinge) combine these into prompt answers that serve as both bio and conversation starters. Reduces onboarding friction and improves profile quality since prompts encourage specific, authentic answers.

## Decision 025: Prompts Between Photos (Not as Separate Section)
**Date:** 2026-04-10
**Decision:** User prompt answers are displayed BETWEEN photos on profile screens, not in a separate "Q&A" section. Uses the existing InterleavedProfileLayout algorithm with prompts pushed early in infoSections array. Each prompt card includes ❤️ like + 💬 comment buttons for conversation starters.
**Rejected:** Dedicated prompts section at bottom of profile (old Hinge-style card grid)
**Reasoning:** Interleaving prompts with photos keeps scroll engagement high, matches Hinge's storytelling flow, and makes each prompt a conversation starter. The like/comment buttons let other users react to specific answers (future: sends "X liked your answer: [prompt]" notification).

## Decision 026: Onboarding State Persistence via Store Init + Unmount Save
**Date:** 2026-04-10
**Decision:** Every onboarding screen initializes its local state from the profile store on mount. Selection screens auto-save on change via useEffect. Text screens save on unmount via useEffect cleanup. Prevents data loss when user goes back and forward in the onboarding flow.
**Rejected:** Passing data via route params, using global form context, skipping auto-save
**Reasoning:** React Navigation native stack unmounts screens on back navigation, losing all local state. Users hit "continue" on later screens and lost their entries when returning. Using the profile store as the source of truth, with local state mirroring it, gives instant UI updates without losing persistence.

## Decision 028: Welcome Screen Position — End of Onboarding
**Date:** 2026-04-10
**Decision:** The "Hoş Geldin" celebration screen shows AFTER onboarding is fully complete, not after OTP verification. New flow: Phone → OTP → Onboarding (12 steps) → Welcome → MainTabs. The Welcome screen is the final step of the OnboardingNavigator stack, with back gesture disabled. SelfieVerificationScreen navigates to Welcome, and Welcome's CTA button calls `setOnboarded(true)` which triggers RootNavigator to switch to MainTabs.
**Rejected:** Welcome modal immediately after OTP (old flow), navigation.reset at Welcome screen
**Reasoning:** A welcome screen before the user has set up their profile is meaningless — they haven't "joined" anything yet. Celebrating at the END of onboarding rewards the user for completing all 12 steps and creates a satisfying conclusion. Since RootNavigator switches on the `isOnboarded` flag, the Welcome button flipping that flag automatically transitions to MainTabs without needing navigation.reset — the whole onboarding stack is unmounted by the switch.

## Decision 027: Green Verification Badge at Top-Right
**Date:** 2026-04-10
**Decision:** Verification checkmark badge is green (#10B981), 22x22px, positioned at top-right (top: 8, right: 8) on all user cards and avatars. Replaces previous inconsistent positioning (some left, some bottom) and colors (blue/purple/gold).
**Rejected:** Blue Twitter-style badge, gold premium-only badge, badge next to name
**Reasoning:** Green = trust + safety in dating context. Top-right is the universal "status indicator" position (iOS, WhatsApp, Instagram). Single consistent badge style across all screens reduces visual noise. Badge indicates full verification (selfie + profile complete), not package tier.

## Decision 029: Profile Screen Dark Theme (#08080F)
**Date:** 2026-04-11
**Decision:** Profile ekranı koyu tema (#08080F) — tüm kartlar koyu, beyaz arka plan kaldırıldı. Container background `#08080F`, all cards use `rgba(255,255,255,0.06)` with `rgba(255,255,255,0.1)` borders (borderRadius 16 for cards, 12 for grid cells). Text colors: white (titles/values), `rgba(255,255,255,0.7)` (body), `rgba(255,255,255,0.6)` (muted labels), `rgba(255,255,255,0.5)` (tiny meta).
**Rejected:** Cream theme (#F5F0E8), mixed light/dark cards, per-card theme variations
**Reasoning:** The app uses a single dark visual language on dating/social content. A cream profile against dark content tabs (Keşfet, Akış, Eşleşme) created jarring context switches. Unifying on dark gives premium feel and consistent brand identity. All prompt cards (including PromptAnswerCard shared component) also migrated to dark.

## Decision 030: Profilini Zenginleştir — 15 Prompts Max (was 3)
**Date:** 2026-04-11
**Decision:** Profilini Zenginleştir max 3 → 15 prompt'a çıkarıldı. `MAX_PROMPTS = 15`. Prompt bank expanded from 30 → 44 prompts across 5 categories. Users can now pick up to 15 prompts to fill out during onboarding (and later from profile edit).
**Rejected:** Hinge's 3-prompt limit, unlimited prompts, per-category minimums
**Reasoning:** 3 prompts was too few to meaningfully fill the Hinge-style interleaved photo layout (only 3 prompt cards distributed between up to 9 photos). 15 prompts lets users express multiple facets (personality + lifestyle + dreams + entertainment + food/travel) and fully populate the interleaved layout. Still capped to prevent profile bloat.

## Decision 031: Gönderilerim Removed from Profile Tab
**Date:** 2026-04-11
**Decision:** Gönderilerim profil ekranından kaldırıldı, sadece Akış'ta gösterilecek. The profile tab no longer shows a "Gönderilerim (X)" section listing recent posts — that concern belongs entirely to the Akış (Feed) tab. Post count is still shown in the profile stats row (Gönderi | Takipçi | Takip) via `myPosts.length`.
**Rejected:** Keep both places (duplicate content), show posts only on tap-through, hide behind "Daha Fazla" toggle
**Reasoning:** Profile is about identity (photos, prompts, about, compatibility). Akış is about content (posts, comments, stories). Showing posts in both violates separation of concerns and makes profile feel bloated. Users already have a "Gönderi" stats button that navigates to MyPosts screen for full list.

## Decision 032: Global Status Bar in App.tsx
**Date:** 2026-04-11
**Decision:** Status bar global olarak App.tsx'te yönetilecek, her zaman koyu tema. Single `<StatusBar style="light" backgroundColor="#08080F" />` JSX in App.tsx + module-level `setStatusBarStyle('light')` / `setStatusBarBackgroundColor('#08080F', false)` / `setStatusBarTranslucent(false)` for Android early-init. No per-screen `<StatusBar>` components anywhere (all ~23 previous usages removed across 17 files in Session 6).
**Rejected:** Per-screen StatusBar (old approach), dark mode detection, mixed light/dark based on current screen
**Reasoning:** The entire app uses a dark theme now, so the status bar never needs to change. Per-screen StatusBar components conflicted with react-native-screens native handling on Android, causing flashes and unreliable color on screen transitions. A single source of truth avoids race conditions.

## Decision 033: All Text Minimum fontWeight 600, Titles 800
**Date:** 2026-04-11
**Decision:** Tüm yazılar minimum fontWeight 600, başlıklar 800. No `fontWeight '400'` or `'500'` anywhere in the app. Typography scale:
- **800 (ExtraBold):** Main section titles (Hakkımda, Günlük Görevler, Bu Haftanın Yıldızları, Uyum Analizi), major buttons (Boost, Luma'ya Başla), large display text
- **700 (Bold):** Sub-titles, button labels (Düzenle, Premium'a Geç), values (Hakkımda grid values), card titles
- **600 (SemiBold):** Body text, hints, labels, minimum weight for any visible text
**Rejected:** fontWeight 400/500 medium text, inconsistent per-screen weights
**Reasoning:** Dark backgrounds need bolder text for contrast and readability. Premium brands (Hinge, Bumble) use heavy typography. User repeatedly flagged thin text as unreadable. Baking the minimum into a rule prevents regression — reviewers now know "no thin text" is a hard constraint.

## Decision 034: Global `colors` Export = darkTheme (Single Source Dark Mode) [REVERSED by 036]
**Date:** 2026-04-11
**Status:** ⚠️ REVERSED on 2026-04-11 — see Decision 036.
**Decision:** `theme/colors.ts` exports `colors = darkTheme` as the global theme object. `ThemeContext` also provides `darkTheme` always (`isDark: true`, `themeMode: 'dark'`). Light/cream themes are still defined as exports (`creamTheme`, `lightTheme`) for reference but NOT used at runtime. Onboarding navigator `contentStyle` background is also `#08080F`.
**Rejected:** Cream as default with per-screen override, dynamic dark/light toggle, system theme detection, multi-theme support
**Reasoning at the time:** Session 8 audit found 86 files still rendering in cream because they referenced `colors.surface`, `colors.background`, `colors.text*`. Instead of editing 86 files one by one, flipping the single `colors` export line was thought to cascade dark values to every consumer.
**Why it was reversed:** This decision broke auth and onboarding screens, which are DESIGNED to be light-themed (cream + pink gradient + dark text). The global flip made them dark with white text on their cream backgrounds (invisible). The premise "LUMA is dark-first" was wrong — LUMA is **hybrid** light/dark, and the flip violated the actual design.

## Decision 035: Prompt Card Interactions Gated by Match State
**Date:** 2026-04-11
**Decision:** PromptAnswerCard's `showActions` (❤️ like + 💬 comment buttons) is:
- **ProfilePreviewScreen** (pre-match preview from Keşfet swipe): `showActions={false}` — no interaction allowed before matching
- **MatchDetailScreen** (viewing an existing match): `showActions={true}` with functional handlers — `onLike` shows feedback Alert ("Beğeni gönderildi ❤️"), `onComment` navigates to Chat with the prompt answer prefilled as `initialMessage` (`"{answer}" — bu cevabına bayıldım 💬`)
- **FeedProfileScreen** (viewing a user's profile from the feed): `showActions={true}` — users can interact with posts/profiles freely
- **ProfileScreen** (own profile): `showActions={false}` — can't like/comment on yourself
**Rejected:** Actions always enabled (breaks UX before match), actions never enabled (wastes the Hinge-style interaction pattern), implementing a full "like a prompt" backend endpoint (premature — not in spec)
**Reasoning:** Hinge popularized "like a specific prompt answer" as an alternative to a generic like. LUMA mimics this only after a match is established, because pre-match swipes already have a binary like/pass decision — a third "like the prompt" signal would confuse the matching flow. The `onComment` → Chat prefill is the most useful micro-interaction: it gives the user an instant conversation starter contextualized to what attracted them.

## Decision 036: Hybrid Light/Dark Theme — Cream is Default, Tab Bar + Premium are Dark
**Date:** 2026-04-11 (reverses Decision 034)
**Decision:** LUMA uses a **hybrid** light/dark theme architecture:
- **Default/light (cream `#F5F0E8`)**: Auth screens, all onboarding screens, Profile tab, Feed/Discovery/Live/Matches tabs, Welcome screen, modals
- **Dark islands (`#08080F`)**: Main bottom tab bar, "Bu Haftanın Yıldızları" cards on Profile, Üyelik/Jeton/Boost market screens
- **Gradient buttons** (purple-pink `#8B5CF6 → #EC4899` or orange `#F59E0B → #F97316`): rendered on any theme, always white text

Implementation:
- `theme/colors.ts`: `colors = creamTheme` (reverted from darkTheme)
- `theme/ThemeContext.tsx`: `isDark: false`, `themeMode: 'light'`
- `OnboardingNavigator.ONBOARDING_BG`: `#F5F0E8`
- `App.tsx` StatusBar: `style="dark"`, `backgroundColor="#F5F0E8"` — dark icons on cream
- `MainTabNavigator.tabBarStyle.backgroundColor`: `#08080F` (dark) — the ONE exception
- `ProfileScreen.tsx`: cream container, white cards, dark text — star cards block hardcoded dark as exception, gradient button text hardcoded white (6 styles)
- `components/onboarding/OnboardingLayout.tsx`: `onboardingColors` struct with hardcoded light-theme values (doesn't follow `colors` export) — this was the Session 8 fix that should have been the whole solution

**Rejected:**
- Full dark theme (broke auth/onboarding — Decision 034, reversed)
- Full light theme (would make tab bar + premium sections inconsistent with brand premium feel)
- Dynamic theme detection (not in scope)

**Reasoning:** LUMA is NOT a dark-first app and NOT a light-first app — it is **deliberately hybrid**. Auth and onboarding are light because user-trust moments deserve warm, inviting visuals (pink-cream gradients). The main content tabs are light for readability on long-duration content (feed, messages, profile). The tab bar is dark because it's a persistent navigation frame that should recede visually and contrast with the bright content above it. Premium sections (star cards, membership, jeton market) use dark to signal "premium / reserved" visual weight. Gradient buttons span both themes because they're brand elements, not theme-dependent UI chrome.

**Do NOT flip the global `colors` export.** Any future request to "make the app dark" or "unify themes" should trigger a scope discussion: which specific screens, why, and confirmation that the auth/onboarding light design is NOT affected. See `feedback_theme_scope.md` in project memory.
