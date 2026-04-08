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
