# LUMA Claude Code — Agents & Skills Guide

## What Are Agents?
Agents are specialized Claude Code personas, each focused on a specific department of the app. When you invoke an agent, Claude Code switches to that domain's expertise, rules, and context.

Store agents in: `.claude/agents/`

---

## 14 Specialized Agents

### 1. mobile-ui (mobile-ui.md)
**Role:** React Native UI development
**Focus:** All mobile screen components, navigation, animations, Zustand state
**Rules:**
- Follow Bumpy-style design (gradients, smooth animations)
- Use React Navigation for routing
- Use Zustand for state management
- All user-facing text in Turkish
- Test on both iOS and Android

### 2. backend-core (backend-core.md)
**Role:** NestJS backend API development
**Focus:** REST endpoints, WebSocket events, business logic, validation
**Rules:**
- Follow NestJS module pattern
- Every endpoint needs input validation (class-validator)
- Every business logic function needs unit tests
- Use Prisma ORM for all database operations
- Document all endpoints in shared API constants

### 3. database (database.md)
**Role:** Database schema, migrations, and queries
**Focus:** Prisma schema, PostgreSQL optimization, Redis caching, Elasticsearch
**Rules:**
- All schema changes via Prisma migrations
- Index frequently queried columns
- Use Redis for: jeton balance cache, online status, session data
- Use Elasticsearch for: user search, profile discovery

### 4. compatibility (compatibility.md)
**Role:** Compatibility algorithm and recommendation engine
**Focus:** Uyum scoring, Kesfet ordering, Canli matching, Gunun Eslesmesi
**Rules:**
- Score range MUST be 47-97
- Package NEVER affects raw score
- Test with edge cases (all same answers, rapid completion)
- Optimize for performance (cache computed scores)

### 5. auth-security (auth-security.md)
**Role:** Authentication, onboarding, and security
**Focus:** Phone OTP, Google Sign-In, Apple Sign-In, onboarding flow
**Rules:**
- Phone auth via SMS OTP
- Google and Apple as social login options
- Mandatory: phone verification -> profile creation -> Uyum Analizi (20q)
- Optional: Kisilik Testi (5q)
- Handle edge cases (expired OTP, duplicate phone, etc.)

### 6. realtime (realtime.md)
**Role:** Real-time messaging, calls, and live connections
**Focus:** Chat, voice calls, video calls, Selam Gonder, Buz Kirici, Canli video
**Rules:**
- WebSocket (Socket.io) for real-time messaging
- WebRTC for voice/video calls and Canli
- Jeton deduction for premium actions
- Read receipts — check package permission
- Canli = random discovery ONLY, not matched user calls

### 7. discovery (discovery.md)
**Role:** Kesfet tab — card swipe and discovery features
**Focus:** Swipe UI, filters, boost, Super Begeni, Gunun Eslesmesi, DailyPicks
**Rules:**
- Uyum score displayed on cards
- Package-based filter limits
- Jeton deduction for Super Begeni
- Match animation (konfeti/kalp) on mutual like

### 8. matching (matching.md)
**Role:** Eslesme tab — matches, likes, followers, viewers
**Focus:** Match list, likes you, followers, kim gordu, secret admirer, weekly top
**Rules:**
- 5 sub-tabs: Eslesmeler, Mesajlar, Begeenenler, Takipciler, Kim Gordu
- Package-based blur/visibility
- Date planner for matched users

### 9. profile (profile.md)
**Role:** Profile tab — user profile, editing, gamification
**Focus:** Profile display, edit flow, Kasif missions, Bu Haftanin Yildizlari, Profil Gucu
**Rules:**
- Max 6 photos, min 2
- Profil Gucu bar computed from completeness
- Kasif missions reset daily
- Leaderboard resets every Monday

### 10. payments (payments.md)
**Role:** Package system, jeton economy, boost, ads
**Focus:** Subscription management, jeton transactions, boost activation, AdMob
**Rules:**
- 3 packages ONLY: Ucretsiz, Premium, Supreme
- NO feature fully locked — only quantity limits
- Jeton balance must be atomic (no race conditions)
- In-app purchase via App Store / Google Play APIs
- AdMob rewarded ads for free users only

### 11. notifications (notifications.md)
**Role:** Push notification and in-app notification system
**Focus:** FCM push, in-app notifications, notification preferences
**Rules:**
- 3-tier system: Critical (always), Important (default on), Low (default off)
- User can toggle each type in settings
- Never send push to muted notification types
- Deep links in notification data for navigation
- Batch similar notifications

### 12. moderation (moderation.md)
**Role:** Content moderation and user safety
**Focus:** Report system, block system, fake profile detection, content review
**Rules:**
- Users can report: fake_profile, harassment, spam, inappropriate_content, underage
- Block prevents all interaction
- Auto-flag suspicious patterns
- Photo verification system for selfie_verified badge

### 13. infrastructure (infrastructure.md)
**Role:** Deployment and infrastructure (covers old ci-cd.md too)
**Focus:** Docker, Railway/AWS, CI/CD, environment management
**Rules:**
- Follow existing Docker and infrastructure setup
- Test builds before deploy
- Health check endpoints required
- Zero-downtime deployments preferred

### 14. testing (testing.md)
**Role:** Test writing and quality assurance
**Focus:** Unit tests, integration tests, E2E tests
**Rules:**
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Use Playwright for mobile E2E if configured

---

## Additional Agent Files in `.claude/agents/`

The following agent files also exist in the repository for specialized subsystems:

| File | Purpose |
|------|---------|
| analytics.md | Analytics event tracking and reporting |
| badges.md | Badge system (founder badge, selfie verified, etc.) |
| harmony.md | Harmony/compatibility sub-algorithms |
| places.md | Sevdigin Mekanlar feature |
| relationship.md | Relationship types and social graph logic |
| shared-types.md | @luma/shared package types management |

---

## 10 Skills (Quick Commands)

Skills are shortcut commands for common tasks. Store in: `.claude/skills/`

| Skill File | Command | What It Does |
|------------|---------|--------------|
| build.md | /build | Build the project and report errors |
| lint.md | /lint | Run linting across all packages |
| typecheck.md | /typecheck | Run TypeScript type checking across all packages |
| test.md | /test | Run all tests and report failures |
| migrate.md | /migrate | Create and run Prisma migration |
| seed.md | /seed | Seed database with test data |
| status.md | /status | Show project health: git status, build, types, tests |
| analyze.md | /analyze | Analyze code quality and find potential issues |
| audit.md | /audit | Security and dependency audit |
| docker-up.md | /docker-up | Start Docker containers for local development |

---

## How to Use

**In Claude Code:**
```
@agent mobile-ui "Build the Kesfet swipe card component"
@agent compatibility "Implement the compatibility scoring"
@agent payments "Add jeton deduction for Super Begeni"
```

**Skills:**
```
/build
/test
/status
/migrate
```

---

## Agent Selection Guide

| Task | Best Agent |
|------|-----------|
| Building a screen/component | mobile-ui |
| Creating an API endpoint | backend-core |
| Database schema changes | database |
| Uyum score calculation | compatibility |
| Login/signup flow | auth-security |
| Chat, calls, live video | realtime |
| Kesfet swipe & discovery | discovery |
| Matches/likes/followers | matching |
| Profile editing/gamification | profile |
| Payments/subscriptions | payments |
| Push notifications | notifications |
| User reports/blocks | moderation |
| Deploy issues | infrastructure |
| Writing tests | testing |
