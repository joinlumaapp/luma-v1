# LUMA Claude Code — Agents & Skills Guide

## What Are Agents?
Agents are specialized Claude Code personas, each focused on a specific department of the app. When you invoke an agent, Claude Code switches to that domain's expertise, rules, and context.

Store agents in: `.claude/agents/`

---

## Recommended Agents

### 1. mobile-ui-agent
**Role:** React Native UI development
**Focus:** All mobile screen components, navigation, animations, Zustand state
**Rules:**
- Follow Bumpy-style design (gradients, smooth animations)
- Use React Navigation for routing
- Use Zustand for state management
- All user-facing text in Turkish
- Test on both iOS and Android

### 2. backend-api-agent
**Role:** NestJS backend API development
**Focus:** REST endpoints, WebSocket events, business logic, validation
**Rules:**
- Follow NestJS module pattern
- Every endpoint needs input validation (class-validator)
- Every business logic function needs unit tests
- Use Prisma ORM for all database operations
- Document all endpoints in shared API constants

### 3. database-agent
**Role:** Database schema, migrations, and queries
**Focus:** Prisma schema, PostgreSQL optimization, Redis caching, Elasticsearch
**Rules:**
- Follow data_model.md strictly
- All schema changes via Prisma migrations
- Index frequently queried columns
- Use Redis for: jeton balance cache, online status, session data
- Use Elasticsearch for: user search, profile discovery

### 4. matching-agent
**Role:** Compatibility algorithm and recommendation engine
**Focus:** Uyum scoring, Keşfet ordering, Canlı matching, Günün Eşleşmesi
**Rules:**
- Follow algorithm_spec.md strictly
- Score range MUST be 47-97
- Package NEVER affects raw score
- Test with edge cases (all same answers, rapid completion)
- Optimize for performance (cache computed scores)

### 5. auth-agent
**Role:** Authentication and onboarding
**Focus:** Phone OTP, Google Sign-In, Apple Sign-In, onboarding flow
**Rules:**
- Phone auth via SMS OTP
- Google and Apple as social login options
- Mandatory: phone verification → profile creation → Uyum Analizi (20q)
- Optional: Kişilik Testi (5q)
- Handle edge cases (expired OTP, duplicate phone, etc.)

### 6. messaging-agent
**Role:** Real-time messaging system
**Focus:** Chat, voice calls, video calls, Selam Gönder, Buz Kırıcı
**Rules:**
- WebSocket (Socket.io) for real-time messaging
- WebRTC for voice/video calls
- Jeton deduction for premium actions (Selam, calls for free users)
- Read receipts (Okundu Bilgisi) — check package permission
- Message types: text, selam, icebreaker_game, voice_call, video_call

### 7. live-agent
**Role:** Canlı (Live) random video matching
**Focus:** Omegle-style random pairing, WebRTC video, session management
**Rules:**
- Match based on uyum score + filters + availability
- Jeton deduction per session
- End-of-session options: Takip Et, Beğen, Sonraki
- Handle disconnections gracefully
- Canlı is ONLY for random discovery, NOT for matched user calls

### 8. feed-agent
**Role:** Akış (Feed) system — stories and posts
**Focus:** Story creation/viewing, post CRUD, feed algorithm, interactions
**Rules:**
- Stories expire after 24 hours
- Post types: photo, video, text
- Feed tabs: Popüler (algorithmic) and Takip (chronological from followed)
- Story/post limits by package
- Content moderation hooks

### 9. monetization-agent
**Role:** Package system, jeton economy, boost, ads
**Focus:** Subscription management, jeton transactions, boost activation, AdMob
**Rules:**
- Follow monetization.md strictly
- 3 packages ONLY: Ücretsiz, Premium, Supreme
- NO feature fully locked — only quantity limits
- Jeton balance must be atomic (no race conditions)
- In-app purchase via App Store / Google Play APIs
- AdMob rewarded ads for free users only

### 10. notification-agent
**Role:** Push notification and in-app notification system
**Focus:** FCM push, in-app notifications, notification preferences
**Rules:**
- 3-tier system: Critical (always), Important (default on), Low (default off)
- User can toggle each type in settings
- Never send push to muted notification types
- Deep links in notification data for navigation
- Batch similar notifications (e.g., "5 kişi beğendi" instead of 5 separate)

### 11. gamification-agent
**Role:** Kaşif missions, weekly leaderboard, profile strength
**Focus:** Daily missions, jeton rewards, Bu Haftanın Yıldızları, Profil Gücü
**Rules:**
- Kaşif missions reset daily
- Leaderboard resets every Monday
- Profile strength computed from: photos, bio, interests, prompts, mekanlar, video
- Fair reward distribution (prevent farming)

### 12. moderation-agent
**Role:** Content moderation and user safety
**Focus:** Report system, block system, fake profile detection, content review
**Rules:**
- Users can report: fake_profile, harassment, spam, inappropriate_content, underage
- Block prevents all interaction
- Auto-flag suspicious patterns (rapid mass likes, copy-paste messages)
- Photo verification system for selfie_verified badge

### 13. deploy-agent
**Role:** Deployment and infrastructure
**Focus:** Docker, Railway/AWS, CI/CD, environment management
**Rules:**
- Follow existing Docker and infrastructure setup
- Test builds before deploy
- Health check endpoints required
- Zero-downtime deployments preferred

### 14. testing-agent
**Role:** Test writing and quality assurance
**Focus:** Unit tests, integration tests, E2E tests
**Rules:**
- Unit tests for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows (auth, matching, messaging)
- Use Playwright for mobile E2E if configured

---

## Skills (Quick Commands)

Skills are shortcut commands for common tasks. Store in: `.claude/skills/`

### Recommended Skills:

| Skill | Command | What It Does |
|-------|---------|-------------|
| /fix-build | fix-build | Diagnose and fix build errors |
| /fix-deploy | fix-deploy | Debug deployment issues (Railway, Docker) |
| /add-endpoint | add-endpoint | Scaffold a new NestJS API endpoint with validation |
| /add-screen | add-screen | Scaffold a new React Native screen with navigation |
| /run-tests | run-tests | Run all tests and report failures |
| /check-types | check-types | Run TypeScript type checking across all packages |
| /db-migrate | db-migrate | Create and run Prisma migration |
| /jeton-check | jeton-check | Verify jeton balance logic and transactions |
| /package-check | package-check | Verify package permissions are correct (no locked features) |
| /update-shared | update-shared | Sync shared types after API/model changes |

---

## How to Use

**In Claude Code (VS Code):**
```
@agent mobile-ui-agent "Build the Keşfet swipe card component"
@agent matching-agent "Implement the compatibility scoring from algorithm_spec.md"
@agent monetization-agent "Add jeton deduction for Süper Beğeni"
```

**Skills:**
```
/fix-build
/add-endpoint POST /api/v1/matches/like
/add-screen KesfetScreen
```

---

## Agent Selection Guide

| Task | Best Agent |
|------|-----------|
| Building a screen/component | mobile-ui-agent |
| Creating an API endpoint | backend-api-agent |
| Database schema changes | database-agent |
| Uyum score calculation | matching-agent |
| Login/signup flow | auth-agent |
| Chat features | messaging-agent |
| Random video matching | live-agent |
| Stories/posts | feed-agent |
| Payments/subscriptions | monetization-agent |
| Push notifications | notification-agent |
| Missions/leaderboard | gamification-agent |
| User reports/blocks | moderation-agent |
| Deploy issues | deploy-agent |
| Writing tests | testing-agent |
