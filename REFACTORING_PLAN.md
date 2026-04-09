# LUMA V1 — REFACTORING PLAN
> Bu döküman `packages/shared/` güncellemelerinden sonra backend ve mobile'da yapılması gereken değişiklikleri listeler.
> Shared types ZATEN güncellendi. Bu plan, bağımlı dosyaların güncellenmesi içindir.
> Tarih: 2026-04-08

---

## ÖNEMLİ: Shared'da Neler Değişti?

### PackageTier (user.ts)
```
ESKİ: FREE | GOLD | PRO | RESERVED (4 paket)
YENİ: FREE | PREMIUM | SUPREME (3 paket)
```

### IntentionTag (user.ts)
```
ESKİ: SERIOUS_RELATIONSHIP | EXPLORING | NOT_SURE (3 tag)
YENİ: EVLENMEK | ILISKI | SOHBET_ARKADAS | KULTUR | DUNYA_GEZME (5 tag)
```

### Compatibility (compatibility.ts)
```
ESKİ: 45 soru (20 core + 25 premium), isPremium field, baseScore + deepScore
YENİ: 20 soru only, NO isPremium, single score (47-97), PersonalityType enum eklendi
```

### Harmony → Canlı (harmony.ts)
```
ESKİ: HarmonySession, HarmonyMessage, HarmonyExtension, HarmonyGameCard
YENİ: CanliSession, CanliEndAction, CanliMatchPreferences
```

### Tabs (app.ts)
```
ESKİ: 4 tab (Discover, Matches, Harmony, Profile)
YENİ: 5 tab (Feed/Akış, Discover/Keşfet, Live/Canlı, Matches/Eşleşme, Profile/Profil)
```

### Gold → Jeton (package.ts)
```
ESKİ: GoldTransaction, GoldTransactionType, GOLD_COSTS, GOLD_PACKS
YENİ: JetonTransaction, JetonTransactionType, JETON_COSTS, JETON_PACKS
```

---

## PHASE 1: Prisma Schema (CRITICAL — do first)

### File: `apps/backend/src/prisma/schema.prisma`

1. **PackageTier enum** — Change from 4 to 3:
```prisma
enum PackageTier {
  FREE
  PREMIUM
  SUPREME
}
```

2. **IntentionTag enum** — Change from 3 to 5:
```prisma
enum IntentionTag {
  EVLENMEK
  ILISKI
  SOHBET_ARKADAS
  KULTUR
  DUNYA_GEZME
}
```

3. **REMOVE these models entirely:**
   - `HarmonySession` and `HarmonySessionStatus` enum
   - `HarmonyMessage` and `HarmonyMessageType` enum
   - `HarmonyQuestionCard` and `QuestionCardCategory` enum
   - `HarmonyGameCard` and `GameCardType` enum
   - `HarmonyExtension`
   - `Relationship` and `RelationshipStatus` enum
   - `CouplesClubEvent`
   - `CouplesClubParticipant`

4. **REMOVE `isPremium` field** from `CompatibilityQuestion` model

5. **ADD new models:**
```prisma
model CanliSession {
  id                String   @id @default(cuid())
  userAId           String
  userBId           String
  status            CanliSessionStatus
  compatibilityScore Int
  startedAt         DateTime?
  endedAt           DateTime?
  jetonSpent        Int      @default(0)
  createdAt         DateTime @default(now())
  userA             User     @relation("canliAsA", fields: [userAId], references: [id])
  userB             User     @relation("canliAsB", fields: [userBId], references: [id])
}

enum CanliSessionStatus {
  SEARCHING
  CONNECTING
  ACTIVE
  ENDED
  CANCELLED
  FAILED
}

model Post {
  id        String   @id @default(cuid())
  userId    String
  type      PostType
  content   String?
  mediaUrl  String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  likes     PostLike[]
  comments  PostComment[]
}

enum PostType {
  PHOTO
  VIDEO
  TEXT
}

model PostLike {
  id        String   @id @default(cuid())
  postId    String
  userId    String
  createdAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  @@unique([postId, userId])
}

model PostComment {
  id        String   @id @default(cuid())
  postId    String
  userId    String
  content   String
  createdAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
}

model Story {
  id        String   @id @default(cuid())
  userId    String
  mediaUrl  String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  views     StoryView[]
}

model StoryView {
  id        String   @id @default(cuid())
  storyId   String
  userId    String
  viewedAt  DateTime @default(now())
  story     Story    @relation(fields: [storyId], references: [id])
  user      User     @relation(fields: [userId], references: [id])
  @@unique([storyId, userId])
}

model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  follower    User     @relation("followers", fields: [followerId], references: [id])
  following   User     @relation("following", fields: [followingId], references: [id])
  @@unique([followerId, followingId])
}
```

6. **Update User model relations** — remove harmony/relationship relations, add:
```prisma
  canliAsA     CanliSession[] @relation("canliAsA")
  canliAsB     CanliSession[] @relation("canliAsB")
  posts        Post[]
  stories      Story[]
  followers    Follow[]       @relation("followers")
  following    Follow[]       @relation("following")
  postLikes    PostLike[]
  postComments PostComment[]
  storyViews   StoryView[]
```

7. **After schema changes, run:**
```bash
npx prisma migrate dev --name v1-refactor-packages-and-features
npx prisma generate
```

---

## PHASE 2: Backend Modules

### 2A. DELETE these entire module directories:
- `apps/backend/src/modules/harmony/` (tüm dosyalar)
- `apps/backend/src/modules/relationships/` (tüm dosyalar)

### 2B. Remove from `app.module.ts`:
- `HarmonyModule` import and registration
- `RelationshipsModule` import and registration

### 2C. Update these backend files:

**`modules/payments/payments.service.ts`:**
- Replace all GOLD/PRO/RESERVED references with PREMIUM/SUPREME
- Rename `goldBalance` field references → keep as `goldBalance` in DB (it maps to "jeton" in UI)
- Update package feature definitions to match new PACKAGE_FEATURES from shared
- Remove `harmonyMinutes` from package features
- Update gold pack pricing to match JETON_PACKS

**`modules/payments/dto/subscribe.dto.ts`:**
- Update enum values: remove GOLD, PRO, RESERVED; add PREMIUM, SUPREME

**`modules/discovery/discovery.service.ts`:**
- Replace GOLD/PRO/RESERVED tier checks with PREMIUM/SUPREME
- Remove relationship status checks (lines ~98-163)
- Update swipe limits to match new DISCOVERY_LIMITS

**`modules/compatibility/compatibility.service.ts`:**
- Remove ALL isPremium filtering — treat all 20 questions equally
- Remove deepScore calculation — single score only
- Remove premiumQuestions feature gating
- Keep score range 47-97

**`modules/profiles/profiles.service.ts`:**
- Change BOOST_DURATION_MINUTES from 30 to 1440 (24 hours)
- Change BOOST_GOLD_COST to 120 (jeton)
- Rename BOOST_GOLD_COST → BOOST_JETON_COST

**`modules/notifications/notifications.service.ts`:**
- Remove `notifyRelationshipRequest()`
- Add `notifyNewFollower()`, `notifySuperLike()`, `notifyCanliMatch()`

**`modules/health/app-info.controller.ts`:**
- Update feature counts (3 packages, 20 questions, 5 tabs, etc.)

**`prisma/seed.ts`:**
- Update all PackageTier references (GOLD→PREMIUM, PRO→SUPREME, remove RESERVED)
- Remove harmony question/game card seeding
- Remove isPremium from question seeds
- Update IntentionTag values
- Remove relationship/couples club seed data

### 2D. CREATE new backend modules:
- `modules/canli/` — Canlı (Live) video matching service
- `modules/feed/` — Akış (Feed) with posts and stories
- `modules/follows/` — Follow system

---

## PHASE 3: Mobile App

### 3A. DELETE these screen/service directories:
- `apps/mobile/src/screens/harmony/` (tüm dosyalar)
- `apps/mobile/src/screens/relationship/`
- `apps/mobile/src/screens/couples-club/`
- `apps/mobile/src/services/harmonyService.ts`
- `apps/mobile/src/services/relationshipService.ts`
- `apps/mobile/src/services/couplesClubService.ts`
- `apps/mobile/src/stores/harmonyStore.ts`
- `apps/mobile/src/stores/relationshipStore.ts`
- `apps/mobile/src/components/harmony/` (tüm dosyalar)

### 3B. Update `apps/mobile/src/constants/config.ts`:
```typescript
// LOCKED_ARCHITECTURE
export const LOCKED_ARCHITECTURE = {
  UYUM_QUESTIONS: 20,
  KISILIK_QUESTIONS: 5,
  OPTIONS_PER_QUESTION: 4,
  INTENTION_TAGS: 5,
  PACKAGES: 3,        // was 4
  MENU_TABS: 5,       // was 4
};

// PROFILE_CONFIG
export const PROFILE_CONFIG = {
  MAX_PHOTOS: 9,      // was 6
  MIN_PHOTOS: 2,
  MAX_INTERESTS: 15,
  MAX_PROMPTS: 3,
  MAX_FAVORITE_PLACES: 8,
  PROFILE_VIDEO_MIN_SEC: 10,
  PROFILE_VIDEO_MAX_SEC: 30,
};

// Remove HARMONY_CONFIG entirely
// Remove PREMIUM_QUESTIONS: 25

// PACKAGE_TIERS — update to 3 packages
export const PACKAGE_TIERS = [
  { id: 'free', name: 'Ücretsiz', price: 0 },
  { id: 'premium', name: 'Premium', price: 499 },
  { id: 'supreme', name: 'Supreme', price: 1199 },
];

// INTENTION_TAGS — update to 5 tags
export const INTENTION_TAGS = [
  { id: 'evlenmek', label: 'Evlenmek', icon: 'heart' },
  { id: 'iliski', label: 'Bir ilişki bulmak', icon: 'heart-outline' },
  { id: 'sohbet_arkadas', label: 'Sohbet etmek ve arkadaşlarla tanışmak', icon: 'chatbubbles' },
  { id: 'kultur', label: 'Diğer kültürleri öğrenmek', icon: 'globe' },
  { id: 'dunya_gezme', label: 'Dünyayı gezmek', icon: 'airplane' },
];
```

### 3C. Update `apps/mobile/src/navigation/MainTabNavigator.tsx`:
- Change from 4 tabs to 5 tabs: Feed, Discover, Live, Matches, Profile
- Remove HarmonyListScreen import
- Add FeedScreen and CanliScreen imports

### 3D. Update `apps/mobile/src/navigation/types.ts`:
- Remove HarmonyList, HarmonyRoom, Relationship, CouplesClub types
- Add Feed, Canli navigation types

### 3E. Update `apps/mobile/src/components/premium/`:
- `SubscriptionStatusCard.tsx`: Remove GOLD/PRO/RESERVED colors/names, add PREMIUM/SUPREME
- `GoldBalance.tsx`: Rename to JetonBalance.tsx, update all Gold→Jeton references

### 3F. Update `apps/mobile/src/services/`:
- `iapService.ts`: Update product IDs for premium/supreme, remove gold/pro/reserved
- `paymentService.ts`: Remove premiumQuestions, harmonyMinutes from features

### 3G. CREATE new mobile screens/services:
- `screens/feed/FeedScreen.tsx` — Akış tab
- `screens/canli/CanliScreen.tsx` — Canlı tab
- `services/feedService.ts`
- `services/canliService.ts`
- `services/followService.ts`
- `stores/feedStore.ts`
- `stores/canliStore.ts`
- `stores/followStore.ts`

---

## PHASE 4: Test Updates

After all code changes, update ALL test files to use new enum values:
- Replace `PackageTier.GOLD` → `PackageTier.PREMIUM`
- Replace `PackageTier.PRO` → `PackageTier.SUPREME`
- Remove `PackageTier.RESERVED` references
- Remove all harmony/relationship test suites
- Update mock data with new IntentionTag values
- Remove isPremium from question test data

---

## EXECUTION ORDER
1. Prisma schema → generate → migrate
2. Backend module deletions (harmony, relationships)
3. Backend service updates (payments, discovery, compatibility, profiles, notifications)
4. Backend new modules (canli, feed, follows)
5. Mobile deletions (harmony, relationship, couples-club screens/services/stores)
6. Mobile config updates
7. Mobile navigation updates
8. Mobile service/component updates
9. Mobile new screens (feed, canli)
10. Test updates across all modules

## NOT: Her aşamadan sonra `npx prisma generate` ve TypeScript derleme kontrolü yapılmalı!
