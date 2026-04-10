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

## Decision 027: Green Verification Badge at Top-Right
**Date:** 2026-04-10
**Decision:** Verification checkmark badge is green (#10B981), 22x22px, positioned at top-right (top: 8, right: 8) on all user cards and avatars. Replaces previous inconsistent positioning (some left, some bottom) and colors (blue/purple/gold).
**Rejected:** Blue Twitter-style badge, gold premium-only badge, badge next to name
**Reasoning:** Green = trust + safety in dating context. Top-right is the universal "status indicator" position (iOS, WhatsApp, Instagram). Single consistent badge style across all screens reduces visual noise. Badge indicates full verification (selfie + profile complete), not package tier.
