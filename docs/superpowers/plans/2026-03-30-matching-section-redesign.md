# Eşleşme Bölümü Yeniden Tasarım — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eşleşme bölümünü canlı aktivite şeridi, zamanlı erişim, akıllı etiketler, yeni monetizasyon özellikleri ve zengin UI ile yeniden tasarlamak.

**Architecture:** Shared types → config sabitleri → backend endpoint'ler → mobile store'lar → UI ekranları. Her tab bağımsız paralel çalışılabilir. Yeni özellikler (Gizli Hayran, Uyum Röntgeni, Haftalık Top 3) ayrı task'lar olarak son sırada.

**Tech Stack:** TypeScript, NestJS, Prisma, React Native, Zustand, react-native-reanimated, expo-linear-gradient

**Spec:** `docs/superpowers/specs/2026-03-30-matching-section-redesign.md`

---

## Phase 1: Shared Types & Config

### Task 1: Yeni Shared Types Ekle

**Files:**
- Modify: `packages/shared/src/types/match.ts` (mevcut 58 satır)
- Modify: `packages/shared/src/types/package.ts:173-185` (GOLD_COSTS genişlet)
- Modify: `packages/shared/src/types/package.ts:82-100` (GoldTransactionType genişlet)

- [ ] **Step 1: match.ts — Yeni interface'ler ekle**

Dosyanın sonuna ekle (line 57 sonrası):

```typescript
// ─── Viewers (Kim Gördü) ─────────────────────────────────────────────
export interface ProfileViewer {
  id: string;
  viewerId: string;
  viewedUserId: string;
  viewCount: number;
  firstViewedAt: string;
  lastViewedAt: string;
  distanceKm: number | null;
}

// ─── Secret Admirer (Gizli Hayran) ──────────────────────────────────
export enum SecretAdmirerStatus {
  PENDING = 'PENDING',
  GUESSED_CORRECT = 'GUESSED_CORRECT',
  GUESSED_WRONG = 'GUESSED_WRONG',
  EXPIRED = 'EXPIRED',
}

export interface SecretAdmirer {
  id: string;
  senderId: string;
  receiverId: string;
  status: SecretAdmirerStatus;
  candidates: string[]; // 3 userId (1 real + 2 decoy)
  guessesUsed: number;
  maxGuesses: number;
  createdAt: string;
  expiresAt: string;
}

// ─── Compatibility X-Ray (Uyum Röntgeni) ────────────────────────────
export interface CompatibilityXrayCategory {
  name: string;
  nameTr: string;
  score: number;
  maxScore: number;
  highlights: string[];
}

export interface CompatibilityXray {
  userId: string;
  targetUserId: string;
  overallScore: number;
  categories: CompatibilityXrayCategory[];
  generatedAt: string;
}

// ─── Weekly Top Matches (Haftalık Top 3) ────────────────────────────
export interface WeeklyTopMatch {
  userId: string;
  name: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  isRevealed: boolean;
  matchReason: string;
}

export interface WeeklyTopMatchesResponse {
  matches: WeeklyTopMatch[];
  generatedAt: string;
  nextRefreshAt: string;
}

// ─── Message Bundle (Mesaj Paketi) ──────────────────────────────────
export interface MessageBundle {
  id: string;
  count: number;
  costGold: number;
  discountPercent: number;
}

// ─── Activity Ring (Canlı Aktivite Şeridi) ──────────────────────────
export type ActivityRingType = 'super_compatible' | 'nearby' | 'new_like' | 'locked';

export interface ActivityRingProfile {
  userId: string;
  name: string;
  photoUrl: string;
  ringType: ActivityRingType;
  compatibilityPercent: number | null;
  distanceKm: number | null;
  isRevealed: boolean;
}

// ─── Samimi Banner ──────────────────────────────────────────────────
export interface WarmNotificationBanner {
  message: string;
  detail: string | null;
  emoji: string;
  type: 'super_compatible' | 'nearby' | 'weekly_summary' | 'new_like';
}
```

- [ ] **Step 2: package.ts — GoldTransactionType'a yeni türler ekle**

`packages/shared/src/types/package.ts` line 82-100 arasındaki enum'a ekle:

```typescript
// Mevcut enum'un sonuna (line ~99, VIDEO_CALL'dan sonra) ekle:
  EXTRA_LIKES_REVEAL = 'EXTRA_LIKES_REVEAL',
  EXTRA_VIEWERS_REVEAL = 'EXTRA_VIEWERS_REVEAL',
  VIEWER_DELAY_BYPASS = 'VIEWER_DELAY_BYPASS',
  PRIORITY_VISIBILITY_1H = 'PRIORITY_VISIBILITY_1H',
  PRIORITY_VISIBILITY_3H = 'PRIORITY_VISIBILITY_3H',
  ACTIVITY_STRIP_PIN = 'ACTIVITY_STRIP_PIN',
  SECRET_ADMIRER_SEND = 'SECRET_ADMIRER_SEND',
  SECRET_ADMIRER_EXTRA_GUESS = 'SECRET_ADMIRER_EXTRA_GUESS',
  COMPATIBILITY_XRAY = 'COMPATIBILITY_XRAY',
  SUPER_COMPATIBLE_REVEAL = 'SUPER_COMPATIBLE_REVEAL',
  AI_CHAT_SUGGESTION_PACK = 'AI_CHAT_SUGGESTION_PACK',
  NEARBY_NOTIFY = 'NEARBY_NOTIFY',
  WEEKLY_TOP_REVEAL = 'WEEKLY_TOP_REVEAL',
  MESSAGE_BUNDLE_3 = 'MESSAGE_BUNDLE_3',
  MESSAGE_BUNDLE_5 = 'MESSAGE_BUNDLE_5',
  MESSAGE_BUNDLE_10 = 'MESSAGE_BUNDLE_10',
```

- [ ] **Step 3: package.ts — GOLD_COSTS'a yeni maliyetler ekle**

`packages/shared/src/types/package.ts` line 173-185 arasındaki objeye ekle:

```typescript
// Mevcut GOLD_COSTS objesinin sonuna ekle:
  EXTRA_LIKES_REVEAL: 20,
  EXTRA_VIEWERS_REVEAL: 15,
  VIEWER_DELAY_BYPASS: 25,
  PRIORITY_VISIBILITY_1H: 60,
  PRIORITY_VISIBILITY_3H: 150,
  ACTIVITY_STRIP_PIN: 40,
  SECRET_ADMIRER_SEND: 75,
  SECRET_ADMIRER_EXTRA_GUESS: 25,
  COMPATIBILITY_XRAY: 30,
  SUPER_COMPATIBLE_REVEAL: 20,
  AI_CHAT_SUGGESTION_PACK: 30,
  NEARBY_NOTIFY: 35,
  WEEKLY_TOP_REVEAL: 40,
  MESSAGE_BUNDLE_3: 350,
  MESSAGE_BUNDLE_5: 500,
  MESSAGE_BUNDLE_10: 800,
```

- [ ] **Step 4: package.ts — GoldSpendAction type'ı güncelle**

`packages/shared/src/types/package.ts` line 196-205 arasındaki union type'a yeni action'ları ekle:

```typescript
export type GoldSpendAction =
  | 'PROFILE_BOOST'
  | 'SUPER_LIKE'
  | 'READ_RECEIPTS'
  | 'UNDO_PASS'
  | 'SPOTLIGHT'
  | 'TRAVEL_MODE'
  | 'PRIORITY_MESSAGE'
  | 'SUGGESTED_STORY_VIEW'
  | 'FLIRT_START'
  | 'VOICE_CALL'
  | 'VIDEO_CALL'
  | 'EXTRA_LIKES_REVEAL'
  | 'EXTRA_VIEWERS_REVEAL'
  | 'VIEWER_DELAY_BYPASS'
  | 'PRIORITY_VISIBILITY_1H'
  | 'PRIORITY_VISIBILITY_3H'
  | 'ACTIVITY_STRIP_PIN'
  | 'SECRET_ADMIRER_SEND'
  | 'SECRET_ADMIRER_EXTRA_GUESS'
  | 'COMPATIBILITY_XRAY'
  | 'SUPER_COMPATIBLE_REVEAL'
  | 'AI_CHAT_SUGGESTION_PACK'
  | 'NEARBY_NOTIFY'
  | 'WEEKLY_TOP_REVEAL'
  | 'MESSAGE_BUNDLE_3'
  | 'MESSAGE_BUNDLE_5'
  | 'MESSAGE_BUNDLE_10';
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/match.ts packages/shared/src/types/package.ts
git commit -m "feat(shared): add matching redesign types — viewers, secret admirer, xray, bundles"
```

---

### Task 2: API Routes & Config Constants

**Files:**
- Modify: `packages/shared/src/constants/api.ts:63-71` (MATCHES routes genişlet)
- Modify: `apps/mobile/src/constants/config.ts` (yeni config blokları)

- [ ] **Step 1: api.ts — Yeni match endpoint'leri ekle**

`packages/shared/src/constants/api.ts` MATCHES bölümüne (line ~71 sonrası) ekle:

```typescript
    // ─── Viewers (Kim Gördü) ──────────────────────────
    GET_VIEWERS: '/matches/viewers',
    // ─── Secret Admirer ───────────────────────────────
    SEND_SECRET_ADMIRER: '/matches/secret-admirer',
    GUESS_SECRET_ADMIRER: '/matches/secret-admirer/:id/guess',
    GET_SECRET_ADMIRERS: '/matches/secret-admirers',
    // ─── Weekly Top ───────────────────────────────────
    GET_WEEKLY_TOP: '/matches/weekly-top',
    // ─── Compatibility X-Ray ──────────────────────────
    GET_COMPATIBILITY_XRAY: '/matches/:id/compatibility-xray',
    // ─── Activity Strip ───────────────────────────────
    GET_ACTIVITY_STRIP: '/matches/activity-strip',
    // ─── Warm Banner ──────────────────────────────────
    GET_WARM_BANNER: '/matches/warm-banner',
```

DISCOVERY bölümüne (line ~61 sonrası) ekle:

```typescript
    PRIORITY_BOOST: '/discovery/priority-boost',
    NEARBY_NOTIFY: '/discovery/nearby-notify',
```

- [ ] **Step 2: config.ts — Viewers reveal config ekle**

`apps/mobile/src/constants/config.ts` dosyasının LIKES_VIEW_CONFIG'den sonra (line ~232) ekle:

```typescript
// ─── Kim Gördü — Viewer Reveal Config ─────────────────────────────
export const VIEWERS_REVEAL_CONFIG = {
  FREE: { dailyReveals: 1, delayHours: 24 },
  GOLD: { dailyReveals: 5, delayHours: 6 },
  PRO: { dailyReveals: 15, delayHours: 0 },
  RESERVED: { dailyReveals: 999999, delayHours: 0 },
} as const;

// ─── Beğenenler — Likes Reveal Config (güncellenen) ───────────────
export const LIKES_REVEAL_CONFIG = {
  FREE: 2,
  GOLD: 10,
  PRO: 30,
  RESERVED: 999999,
} as const;

// ─── Mesaj Paketleri ──────────────────────────────────────────────
export const MESSAGE_BUNDLE_CONFIG = [
  { id: 'msg_bundle_1', count: 1, costGold: 150, discountPercent: 0 },
  { id: 'msg_bundle_3', count: 3, costGold: 350, discountPercent: 22 },
  { id: 'msg_bundle_5', count: 5, costGold: 500, discountPercent: 33 },
  { id: 'msg_bundle_10', count: 10, costGold: 800, discountPercent: 47 },
] as const;

// ─── Tier Ücretsiz Mesaj Hakları (aylık) ──────────────────────────
export const FREE_MESSAGE_ALLOWANCE = {
  FREE: 0,
  GOLD: 1,
  PRO: 3,
  RESERVED: 5,
} as const;

// ─── Gizli Hayran — Secret Admirer Config ─────────────────────────
export const SECRET_ADMIRER_CONFIG = {
  COST_GOLD: 75,
  EXTRA_GUESS_COST: 25,
  FREE_GUESSES: 3,
  EXPIRY_HOURS: 48,
  FREE_SENDS_PER_MONTH: { FREE: 0, GOLD: 1, PRO: 3, RESERVED: 5 },
} as const;

// ─── Uyum Röntgeni — Compatibility X-Ray Config ──────────────────
export const COMPATIBILITY_XRAY_CONFIG = {
  COST_GOLD: 30,
  FREE_PER_DAY: { FREE: 0, GOLD: 0, PRO: 10, RESERVED: 999999 },
} as const;

// ─── Haftalık Top 3 ───────────────────────────────────────────────
export const WEEKLY_TOP_CONFIG = {
  VISIBLE_COUNT: { FREE: 1, GOLD: 2, PRO: 3, RESERVED: 3 },
  REVEAL_COST_GOLD: 40,
  REFRESH_DAY: 1, // Monday
} as const;

// ─── AI Sohbet Önerileri ──────────────────────────────────────────
export const AI_CHAT_SUGGESTION_CONFIG = {
  FREE_PER_DAY: { FREE: 0, GOLD: 2, PRO: 5, RESERVED: 999999 },
  PACK_SIZE: 10,
  PACK_COST_GOLD: 30,
} as const;

// ─── Yakınında Etiketi Görünürlüğü ───────────────────────────────
export const NEARBY_VISIBILITY_CONFIG = {
  FREE: 'hidden' as const,       // Görünmez
  GOLD: 'label' as const,        // "Yakınında" text
  PRO: 'distance' as const,      // "2.3 km" detay
  RESERVED: 'distance_push' as const, // Detay + push bildirim
} as const;

// ─── Süper Uyumlu Eşik ───────────────────────────────────────────
export const SUPER_COMPATIBLE_THRESHOLD = 80; // %80+
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/constants/api.ts apps/mobile/src/constants/config.ts
git commit -m "feat(config): add matching redesign API routes and tier configs"
```

---

## Phase 2: Backend Endpoints

### Task 3: Backend — Viewers (Kim Gördü) Endpoint

**Files:**
- Modify: `apps/backend/src/modules/matches/matches.controller.ts`
- Modify: `apps/backend/src/modules/matches/matches.service.ts`

- [ ] **Step 1: matches.service.ts — getViewers method ekle**

```typescript
async getViewers(userId: string, tier: string): Promise<{
  viewers: ProfileViewer[];
  dailyRevealsUsed: number;
  dailyRevealsLimit: number;
}> {
  const config = {
    FREE: { dailyReveals: 1, delayHours: 24 },
    GOLD: { dailyReveals: 5, delayHours: 6 },
    PRO: { dailyReveals: 15, delayHours: 0 },
    RESERVED: { dailyReveals: 999999, delayHours: 0 },
  };

  const tierConfig = config[tier] || config.FREE;
  const delayDate = new Date();
  delayDate.setHours(delayDate.getHours() - tierConfig.delayHours);

  const viewers = await this.prisma.profileView.findMany({
    where: {
      viewedUserId: userId,
      lastViewedAt: tierConfig.delayHours > 0 ? { lte: delayDate } : undefined,
    },
    orderBy: { lastViewedAt: 'desc' },
    take: 50,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const revealsToday = await this.prisma.viewerReveal.count({
    where: { userId, createdAt: { gte: today } },
  });

  return {
    viewers: viewers.map((v) => ({
      id: v.id,
      viewerId: v.viewerId,
      viewedUserId: v.viewedUserId,
      viewCount: v.viewCount,
      firstViewedAt: v.firstViewedAt.toISOString(),
      lastViewedAt: v.lastViewedAt.toISOString(),
      distanceKm: v.distanceKm,
    })),
    dailyRevealsUsed: revealsToday,
    dailyRevealsLimit: tierConfig.dailyReveals,
  };
}
```

- [ ] **Step 2: matches.controller.ts — GET /matches/viewers ekle**

```typescript
@Get('viewers')
@UseGuards(JwtAuthGuard)
async getViewers(@CurrentUser() user: AuthUser) {
  return this.matchesService.getViewers(user.id, user.packageTier);
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/matches/
git commit -m "feat(backend): add viewers endpoint with tier-based delay and reveal limits"
```

---

### Task 4: Backend — Activity Strip & Warm Banner Endpoints

**Files:**
- Modify: `apps/backend/src/modules/matches/matches.controller.ts`
- Modify: `apps/backend/src/modules/matches/matches.service.ts`

- [ ] **Step 1: matches.service.ts — getActivityStrip method**

```typescript
async getActivityStrip(userId: string, tier: string): Promise<ActivityRingProfile[]> {
  const superCompatThreshold = 80;

  // Son 7 günde seni beğenenler + yakınındakiler
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentLikes = await this.prisma.swipe.findMany({
    where: {
      targetId: userId,
      action: 'LIKE',
      createdAt: { gte: sevenDaysAgo },
    },
    include: { swiper: { select: { id: true, firstName: true, photos: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const rings: ActivityRingProfile[] = recentLikes.map((like) => {
    const compatPercent = like.compatibilityScore || 0;
    let ringType: 'super_compatible' | 'nearby' | 'new_like' = 'new_like';
    if (compatPercent >= superCompatThreshold) ringType = 'super_compatible';
    else if (like.distanceKm !== null && like.distanceKm <= 5) ringType = 'nearby';

    return {
      userId: like.swiperId,
      name: like.swiper.firstName,
      photoUrl: like.swiper.photos?.[0] || '',
      ringType,
      compatibilityPercent: compatPercent,
      distanceKm: like.distanceKm,
      isRevealed: tier !== 'FREE' || false, // Free: ilk 2-3 açık, geri kalan kilitli
    };
  });

  return rings;
}
```

- [ ] **Step 2: matches.service.ts — getWarmBanner method**

```typescript
async getWarmBanner(userId: string): Promise<WarmNotificationBanner> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weeklyLikeCount = await this.prisma.swipe.count({
    where: {
      targetId: userId,
      action: 'LIKE',
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const superCompatLike = await this.prisma.swipe.findFirst({
    where: {
      targetId: userId,
      action: 'LIKE',
      compatibilityScore: { gte: 80 },
      createdAt: { gte: sevenDaysAgo },
    },
    include: { swiper: { select: { interests: true } } },
    orderBy: { compatibilityScore: 'desc' },
  });

  if (superCompatLike) {
    const commonInterest = superCompatLike.swiper.interests?.[0] || '';
    return {
      message: `Seninle %${superCompatLike.compatibilityScore} uyumlu biri seni beğendi!`,
      detail: commonInterest ? `İkiniz de ${commonInterest} seversiniz` : null,
      emoji: '💛',
      type: 'super_compatible',
    };
  }

  return {
    message: `Bu hafta ${weeklyLikeCount} kişi seni beğendi!`,
    detail: weeklyLikeCount > 3 ? 'Aralarında süper uyumlun da var ✨' : null,
    emoji: '💜',
    type: 'weekly_summary',
  };
}
```

- [ ] **Step 3: matches.controller.ts — endpoint'ler ekle**

```typescript
@Get('activity-strip')
@UseGuards(JwtAuthGuard)
async getActivityStrip(@CurrentUser() user: AuthUser) {
  return this.matchesService.getActivityStrip(user.id, user.packageTier);
}

@Get('warm-banner')
@UseGuards(JwtAuthGuard)
async getWarmBanner(@CurrentUser() user: AuthUser) {
  return this.matchesService.getWarmBanner(user.id);
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/matches/
git commit -m "feat(backend): add activity strip and warm banner endpoints"
```

---

### Task 5: Backend — Secret Admirer, Xray, Weekly Top Endpoints

**Files:**
- Create: `apps/backend/src/modules/matches/secret-admirer.service.ts`
- Create: `apps/backend/src/modules/matches/compatibility-xray.service.ts`
- Modify: `apps/backend/src/modules/matches/matches.controller.ts`
- Modify: `apps/backend/src/modules/matches/matches.service.ts`
- Modify: `apps/backend/src/modules/matches/matches.module.ts`

- [ ] **Step 1: secret-admirer.service.ts oluştur**

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const SECRET_ADMIRER_CONFIG = {
  COST_GOLD: 75,
  EXTRA_GUESS_COST: 25,
  FREE_GUESSES: 3,
  EXPIRY_HOURS: 48,
  FREE_SENDS_PER_MONTH: { FREE: 0, GOLD: 1, PRO: 3, RESERVED: 5 },
};

@Injectable()
export class SecretAdmirerService {
  constructor(private readonly prisma: PrismaService) {}

  async send(senderId: string, receiverId: string, tier: string): Promise<{ id: string; costGold: number }> {
    // Aylık ücretsiz hak kontrolü
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sentThisMonth = await this.prisma.secretAdmirer.count({
      where: { senderId, createdAt: { gte: monthStart } },
    });

    const freeAllowance = SECRET_ADMIRER_CONFIG.FREE_SENDS_PER_MONTH[tier] || 0;
    const costGold = sentThisMonth < freeAllowance ? 0 : SECRET_ADMIRER_CONFIG.COST_GOLD;

    // 2 rastgele decoy seç
    const decoys = await this.prisma.user.findMany({
      where: {
        id: { notIn: [senderId, receiverId] },
        isActive: true,
      },
      select: { id: true },
      take: 2,
      orderBy: { lastActiveAt: 'desc' },
    });

    if (decoys.length < 2) {
      throw new BadRequestException('Yeterli aday bulunamadı');
    }

    const candidates = [senderId, decoys[0].id, decoys[1].id]
      .sort(() => Math.random() - 0.5); // Shuffle

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SECRET_ADMIRER_CONFIG.EXPIRY_HOURS);

    const admirer = await this.prisma.secretAdmirer.create({
      data: {
        senderId,
        receiverId,
        status: 'PENDING',
        candidates,
        guessesUsed: 0,
        maxGuesses: SECRET_ADMIRER_CONFIG.FREE_GUESSES,
        expiresAt,
      },
    });

    return { id: admirer.id, costGold };
  }

  async guess(
    admirerId: string,
    receiverId: string,
    guessedUserId: string,
  ): Promise<{ correct: boolean; matchCreated: boolean; guessesRemaining: number }> {
    const admirer = await this.prisma.secretAdmirer.findUnique({
      where: { id: admirerId },
    });

    if (!admirer || admirer.receiverId !== receiverId) {
      throw new BadRequestException('Gizli hayran bulunamadı');
    }
    if (admirer.status !== 'PENDING') {
      throw new BadRequestException('Bu gizli hayran zaten sonuçlandı');
    }
    if (admirer.guessesUsed >= admirer.maxGuesses) {
      throw new BadRequestException('Tahmin hakkınız doldu');
    }

    const correct = guessedUserId === admirer.senderId;
    const newGuessesUsed = admirer.guessesUsed + 1;
    const guessesRemaining = admirer.maxGuesses - newGuessesUsed;

    let matchCreated = false;
    const newStatus = correct
      ? 'GUESSED_CORRECT'
      : guessesRemaining <= 0
        ? 'GUESSED_WRONG'
        : 'PENDING';

    await this.prisma.secretAdmirer.update({
      where: { id: admirerId },
      data: { guessesUsed: newGuessesUsed, status: newStatus },
    });

    // Doğru tahmin → eşleşme oluştur
    if (correct) {
      await this.prisma.match.create({
        data: {
          userAId: admirer.senderId,
          userBId: admirer.receiverId,
          isActive: true,
          animationType: 'NORMAL',
        },
      });
      matchCreated = true;
    }

    return { correct, matchCreated, guessesRemaining };
  }
}
```

- [ ] **Step 2: compatibility-xray.service.ts oluştur**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CompatibilityXray, CompatibilityXrayCategory } from '@luma/shared';

const XRAY_CATEGORIES: Array<{ name: string; nameTr: string }> = [
  { name: 'values', nameTr: 'Değerler' },
  { name: 'interests', nameTr: 'İlgi Alanları' },
  { name: 'lifestyle', nameTr: 'Yaşam Tarzı' },
  { name: 'communication', nameTr: 'İletişim' },
  { name: 'future_plans', nameTr: 'Gelecek Planları' },
];

@Injectable()
export class CompatibilityXrayService {
  constructor(private readonly prisma: PrismaService) {}

  async getXray(userId: string, targetUserId: string): Promise<CompatibilityXray> {
    const userAnswers = await this.prisma.questionAnswer.findMany({
      where: { userId },
    });
    const targetAnswers = await this.prisma.questionAnswer.findMany({
      where: { userId: targetUserId },
    });

    // Mevcut uyumluluk hesaplama mantığını 5 kategoriye böl
    const categories: CompatibilityXrayCategory[] = XRAY_CATEGORIES.map((cat) => {
      const catQuestions = userAnswers.filter((a) => a.category === cat.name);
      const matching = catQuestions.filter((uq) =>
        targetAnswers.some((tq) => tq.questionId === uq.questionId && tq.answer === uq.answer),
      );
      const score = catQuestions.length > 0
        ? Math.round((matching.length / catQuestions.length) * 100)
        : 50;

      return {
        name: cat.name,
        nameTr: cat.nameTr,
        score,
        maxScore: 100,
        highlights: matching.slice(0, 2).map((m) => m.questionText || m.questionId),
      };
    });

    const overallScore = Math.round(
      categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
    );

    return {
      userId,
      targetUserId,
      overallScore,
      categories,
      generatedAt: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 3: matches.service.ts — getWeeklyTop method**

```typescript
async getWeeklyTop(userId: string, tier: string): Promise<WeeklyTopMatchesResponse> {
  const visibleCount = { FREE: 1, GOLD: 2, PRO: 3, RESERVED: 3 };
  const limit = visibleCount[tier] || 1;

  // Son 7 gün içinde en yüksek uyumlu beğenenler
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const topLikes = await this.prisma.swipe.findMany({
    where: {
      targetId: userId,
      action: 'LIKE',
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      swiper: {
        select: { id: true, firstName: true, age: true, photos: true },
      },
    },
    orderBy: { compatibilityScore: 'desc' },
    take: 3,
  });

  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);

  return {
    matches: topLikes.map((like, index) => ({
      userId: like.swiperId,
      name: like.swiper.firstName,
      age: like.swiper.age || 0,
      photoUrl: like.swiper.photos?.[0] || '',
      compatibilityPercent: like.compatibilityScore || 0,
      isRevealed: index < limit,
      matchReason: like.compatibilityScore >= 80 ? 'Süper uyumlu' : 'Yüksek uyum',
    })),
    generatedAt: new Date().toISOString(),
    nextRefreshAt: nextMonday.toISOString(),
  };
}
```

- [ ] **Step 4: matches.controller.ts — yeni endpoint'ler**

```typescript
@Post('secret-admirer')
@UseGuards(JwtAuthGuard)
async sendSecretAdmirer(
  @CurrentUser() user: AuthUser,
  @Body() body: { receiverId: string },
) {
  return this.secretAdmirerService.send(user.id, body.receiverId, user.packageTier);
}

@Post('secret-admirer/:id/guess')
@UseGuards(JwtAuthGuard)
async guessSecretAdmirer(
  @CurrentUser() user: AuthUser,
  @Param('id') admirerId: string,
  @Body() body: { guessedUserId: string },
) {
  return this.secretAdmirerService.guess(admirerId, user.id, body.guessedUserId);
}

@Get('secret-admirers')
@UseGuards(JwtAuthGuard)
async getSecretAdmirers(@CurrentUser() user: AuthUser) {
  return this.secretAdmirerService.getReceived(user.id);
}

@Get('weekly-top')
@UseGuards(JwtAuthGuard)
async getWeeklyTop(@CurrentUser() user: AuthUser) {
  return this.matchesService.getWeeklyTop(user.id, user.packageTier);
}

@Get(':id/compatibility-xray')
@UseGuards(JwtAuthGuard)
async getCompatibilityXray(
  @CurrentUser() user: AuthUser,
  @Param('id') targetUserId: string,
) {
  return this.compatibilityXrayService.getXray(user.id, targetUserId);
}
```

- [ ] **Step 5: matches.module.ts — yeni servisleri kaydet**

```typescript
import { SecretAdmirerService } from './secret-admirer.service';
import { CompatibilityXrayService } from './compatibility-xray.service';

@Module({
  providers: [MatchesService, SecretAdmirerService, CompatibilityXrayService],
  controllers: [MatchesController],
})
export class MatchesModule {}
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/matches/
git commit -m "feat(backend): add secret admirer, compatibility xray, weekly top endpoints"
```

---

### Task 6: Backend — Payments Service Genişletme

**Files:**
- Modify: `apps/backend/src/modules/payments/payments.service.ts:117-125`

- [ ] **Step 1: GOLD_COSTS objesine yeni maliyetler ekle**

`payments.service.ts` line 117-125 arasındaki GOLD_COSTS objesine ekle:

```typescript
  // Eşleşme bölümü yeni maliyetler
  extra_likes_reveal: 20,
  extra_viewers_reveal: 15,
  viewer_delay_bypass: 25,
  priority_visibility_1h: 60,
  priority_visibility_3h: 150,
  activity_strip_pin: 40,
  secret_admirer_send: 75,
  secret_admirer_extra_guess: 25,
  compatibility_xray: 30,
  super_compatible_reveal: 20,
  ai_chat_suggestion_pack: 30,
  nearby_notify: 35,
  weekly_top_reveal: 40,
  message_bundle_3: 350,
  message_bundle_5: 500,
  message_bundle_10: 800,
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/payments/
git commit -m "feat(backend): add matching redesign jeton costs to payments service"
```

---

## Phase 3: Mobile Stores

### Task 7: viewersStore — Kim Gördü State Management

**Files:**
- Create: `apps/mobile/src/stores/viewersStore.ts`

- [ ] **Step 1: viewersStore.ts oluştur**

```typescript
// viewersStore — Kim Gördü (profile viewers) state management with reveal tracking

import { create } from 'zustand';
import type { ProfileViewer } from '@luma/shared';
import { apiClient } from '../services/apiClient';
import { API_ROUTES } from '@luma/shared';
import { useAuthStore } from './authStore';
import { VIEWERS_REVEAL_CONFIG } from '../constants/config';

interface ViewersState {
  viewers: ProfileViewer[];
  revealedIds: Set<string>;
  dailyRevealsUsed: number;
  dailyRevealsLimit: number;
  isLoading: boolean;
  error: string | null;

  fetchViewers: () => Promise<void>;
  revealViewer: (viewerId: string) => Promise<boolean>;
  getDailyRevealsRemaining: () => number;
  isViewerRevealed: (viewerId: string) => boolean;
}

export const useViewersStore = create<ViewersState>((set, get) => ({
  viewers: [],
  revealedIds: new Set(),
  dailyRevealsUsed: 0,
  dailyRevealsLimit: 1,
  isLoading: false,
  error: null,

  fetchViewers: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get(API_ROUTES.MATCHES.GET_VIEWERS);
      const data = res.data;
      set({
        viewers: data.viewers,
        dailyRevealsUsed: data.dailyRevealsUsed,
        dailyRevealsLimit: data.dailyRevealsLimit,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bir hata oluştu';
      set({ error: message, isLoading: false });
    }
  },

  revealViewer: async (viewerId: string) => {
    const { dailyRevealsUsed, dailyRevealsLimit, revealedIds } = get();
    if (dailyRevealsUsed >= dailyRevealsLimit) return false;

    const newRevealed = new Set(revealedIds);
    newRevealed.add(viewerId);
    set({
      revealedIds: newRevealed,
      dailyRevealsUsed: dailyRevealsUsed + 1,
    });
    return true;
  },

  getDailyRevealsRemaining: () => {
    const { dailyRevealsUsed, dailyRevealsLimit } = get();
    return Math.max(0, dailyRevealsLimit - dailyRevealsUsed);
  },

  isViewerRevealed: (viewerId: string) => {
    return get().revealedIds.has(viewerId);
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/stores/viewersStore.ts
git commit -m "feat(mobile): add viewersStore for Kim Gördü reveal tracking"
```

---

### Task 8: matchStore Genişletme — Activity Strip & Warm Banner

**Files:**
- Modify: `apps/mobile/src/stores/matchStore.ts`

- [ ] **Step 1: matchStore.ts — State ve action'lara ekle**

Interface'e (line ~39) ekle:

```typescript
  // Yeni state
  activityStrip: ActivityRingProfile[];
  warmBanner: WarmNotificationBanner | null;
  isLoadingStrip: boolean;

  // Yeni action'lar
  fetchActivityStrip: () => Promise<void>;
  fetchWarmBanner: () => Promise<void>;
```

Import'lara ekle:

```typescript
import type { ActivityRingProfile, WarmNotificationBanner } from '@luma/shared';
```

Store implementasyonuna (zustand create içine) ekle:

```typescript
  activityStrip: [],
  warmBanner: null,
  isLoadingStrip: false,

  fetchActivityStrip: async () => {
    set({ isLoadingStrip: true });
    try {
      const res = await apiClient.get('/matches/activity-strip');
      set({ activityStrip: res.data, isLoadingStrip: false });
    } catch {
      set({ isLoadingStrip: false });
    }
  },

  fetchWarmBanner: async () => {
    try {
      const res = await apiClient.get('/matches/warm-banner');
      set({ warmBanner: res.data });
    } catch {
      // Banner opsiyonel, hata gösterme
    }
  },
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/stores/matchStore.ts
git commit -m "feat(mobile): extend matchStore with activity strip and warm banner"
```

---

### Task 9: likesRevealStore — Beğenenler Zamanlı Erişim

**Files:**
- Create: `apps/mobile/src/stores/likesRevealStore.ts`

- [ ] **Step 1: likesRevealStore.ts oluştur**

```typescript
// likesRevealStore — Beğenenler tab daily reveal limit tracking

import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { LIKES_REVEAL_CONFIG } from '../constants/config';
import type { PackageTier } from './authStore';

interface LikesRevealState {
  revealedIds: Set<string>;
  dailyRevealsUsed: number;

  revealProfile: (profileId: string) => boolean;
  getDailyLimit: () => number;
  getDailyRemaining: () => number;
  isRevealed: (profileId: string) => boolean;
  resetDaily: () => void;
}

export const useLikesRevealStore = create<LikesRevealState>((set, get) => ({
  revealedIds: new Set(),
  dailyRevealsUsed: 0,

  revealProfile: (profileId: string) => {
    const { dailyRevealsUsed, revealedIds } = get();
    const limit = get().getDailyLimit();
    if (dailyRevealsUsed >= limit) return false;
    if (revealedIds.has(profileId)) return true;

    const newRevealed = new Set(revealedIds);
    newRevealed.add(profileId);
    set({ revealedIds: newRevealed, dailyRevealsUsed: dailyRevealsUsed + 1 });
    return true;
  },

  getDailyLimit: () => {
    const tier = (useAuthStore.getState().user?.packageTier || 'FREE') as PackageTier;
    return LIKES_REVEAL_CONFIG[tier] ?? LIKES_REVEAL_CONFIG.FREE;
  },

  getDailyRemaining: () => {
    return Math.max(0, get().getDailyLimit() - get().dailyRevealsUsed);
  },

  isRevealed: (profileId: string) => {
    return get().revealedIds.has(profileId);
  },

  resetDaily: () => {
    set({ revealedIds: new Set(), dailyRevealsUsed: 0 });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/stores/likesRevealStore.ts
git commit -m "feat(mobile): add likesRevealStore for timed access in Beğenenler tab"
```

---

## Phase 4: Mobile UI — Tab Ekranları

### Task 10: Eşleşmeler Tab — Canlı Aktivite Şeridi Component

**Files:**
- Create: `apps/mobile/src/components/matches/ActivityStrip.tsx`
- Create: `apps/mobile/src/components/matches/WarmBanner.tsx`
- Create: `apps/mobile/src/components/matches/DailyRevealCounter.tsx`

- [ ] **Step 1: ActivityStrip.tsx oluştur**

Canlı aktivite şeridi — yatay ScrollView, renkli profil halkaları. Detaylı implementasyon:
- `ActivityRingProfile[]` prop alır
- Her halka `LinearGradient` ile renklendirilir (ringType'a göre)
- Süper uyumlu halka: `palette.gold[400]` → `palette.gold[600]` + pulse animasyon (reanimated)
- Yakında: `palette.coral[500]` → `palette.coral[600]`
- Yeni beğeni: `palette.purple[400]` → `palette.purple[600]`
- Kilitli: gri + blur(3px) + 🔒 ikonu
- Altında: uyumluluk % veya "📍 1.2km" veya "💫 Yeni"
- Tap → `onPress(userId, isRevealed)` callback

- [ ] **Step 2: WarmBanner.tsx oluştur**

Samimi bildirim banner component:
- `WarmNotificationBanner` prop alır
- Background: `linear-gradient(135deg, rgba(purple[500], 0.12), rgba(pink[500], 0.08))`
- Border: `rgba(purple[500], 0.2)`, borderRadius 14
- Sol emoji (36x36 daire), sağda mesaj + detail text
- Animasyonlu giriş (fadeIn + slideUp)

- [ ] **Step 3: DailyRevealCounter.tsx oluştur**

Günlük erişim sayacı component:
- Props: `used: number`, `limit: number`, `onBuyExtra: () => void`
- Dolu/boş bar segmentleri (filled = `purple[500]`, empty = `rgba(purple[500], 0.2)`)
- "1/2 kaldı" text
- Sağda "25💰 Ekstra" butonu (gold gradient)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/matches/
git commit -m "feat(mobile): add ActivityStrip, WarmBanner, DailyRevealCounter components"
```

---

### Task 11: Eşleşmeler Tab — MatchesListScreen Güncelleme

**Files:**
- Modify: `apps/mobile/src/screens/matches/MatchesListScreen.tsx`

- [ ] **Step 1: Import'ları ekle**

```typescript
import { ActivityStrip } from '../../components/matches/ActivityStrip';
import { WarmBanner } from '../../components/matches/WarmBanner';
import { DailyRevealCounter } from '../../components/matches/DailyRevealCounter';
import { SUPER_COMPATIBLE_THRESHOLD } from '../../constants/config';
```

- [ ] **Step 2: Eşleşmeler tab renderına şeridi ekle**

Mevcut FlatList'in ListHeaderComponent'ine ekle:
1. `<ActivityStrip profiles={activityStrip} onPress={handleStripPress} />`
2. `<WarmBanner banner={warmBanner} />`
3. `<DailyRevealCounter used={revealsUsed} limit={revealsLimit} onBuyExtra={handleBuyExtra} />`

- [ ] **Step 3: Match kartlarına akıllı etiketler ekle**

Mevcut MatchCard renderına etiket satırı ekle:
- Uyumluluk badge: `%87 Uyumlu` (purple veya gold background)
- Yakında badge: `📍 Yakında` (coral background) — `distanceKm < 5` ise
- Doğrulanmış: `✅ Doğrulanmış` (success background) — `isVerified` ise
- Intention tag: Ciddi İlişki / Keşfediyor (muted background)

- [ ] **Step 4: Süper uyumlu kart vurgusu**

`compatibilityPercent >= SUPER_COMPATIBLE_THRESHOLD` olan kartlara:
- Altın border: `borderColor: palette.gold[400]` + `borderWidth: 1.5`
- Glow shadow: `shadowColor: palette.gold[400]`, `shadowOpacity: 0.15`, `shadowRadius: 12`
- "✨ Süper Uyumlu" etiketi
- İtalik samimi açıklama text

- [ ] **Step 5: useEffect'te yeni fetch'leri çağır**

```typescript
useEffect(() => {
  fetchMatches();
  fetchActivityStrip();
  fetchWarmBanner();
}, []);
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/matches/MatchesListScreen.tsx
git commit -m "feat(mobile): add activity strip, warm banner, smart labels to matches tab"
```

---

### Task 12: Beğenenler Tab — LikesYouScreen Güncelleme

**Files:**
- Modify: `apps/mobile/src/screens/discovery/LikesYouScreen.tsx`

- [ ] **Step 1: Import reveal store ve config**

```typescript
import { useLikesRevealStore } from '../../stores/likesRevealStore';
import { DailyRevealCounter } from '../../components/matches/DailyRevealCounter';
import { SUPER_COMPATIBLE_THRESHOLD, NEARBY_VISIBILITY_CONFIG } from '../../constants/config';
```

- [ ] **Step 2: Grid kartlarını güncelle**

Mevcut kart render'ını güncelle:
- `isRevealed` kontrolü: `likesRevealStore.isRevealed(profile.userId)`
- Açık kart: fotoğraf + uyumluluk badge (sol üst) + yakınında badge (sağ üst, varsa) + isim/yaş/zaman
- Kilitli kart: `blur(12px)` + 🔒 merkez + "Açmak için dokun"
- Süper uyumlu ipucu (kilitli bile): altın dashed border + "✨ Süper uyumlu!" text
- Tap handler: `revealProfile(userId)` çağır, başarısızsa jeton modal göster

- [ ] **Step 3: ListHeaderComponent'e ekle**

Samimi banner + DailyRevealCounter

- [ ] **Step 4: Premium CTA'yı güncelle**

Grid altına:
- "Tüm beğenenlerini görmek ister misin?"
- "Gold üyeler günde 10 profil açabiliyor"
- MembershipPlans'a navigate butonu

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/discovery/LikesYouScreen.tsx
git commit -m "feat(mobile): add timed access, nearby labels, super compatible hints to likes tab"
```

---

### Task 13: Kim Gördü Tab — ViewersPreviewScreen Yeniden Yazım

**Files:**
- Modify: `apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx`

- [ ] **Step 1: Store'u bağla**

```typescript
import { useViewersStore } from '../../stores/viewersStore';
import { DailyRevealCounter } from '../../components/matches/DailyRevealCounter';
import { WarmBanner } from '../../components/matches/WarmBanner';
```

- [ ] **Step 2: Grid'den liste formatına geçir**

FlatList ile liste görünümü:
- Açık satır: Avatar (44x44) + online dot + İsim, yaş + zaman + etiketler + "Profiline N kez baktı 👀"
- Kilitli satır: blur avatar + "??? — 🔒 Açmak için dokun"
- Tap → reveal (hak varsa) veya jeton modal

- [ ] **Step 3: Gecikme sistemi UI**

Altta info text: "⏳ Free hesaplar 24 saat gecikmeli görür · Gold+ anlık bildirim"
Tier'e göre dinamik metin

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/matches/ViewersPreviewScreen.tsx
git commit -m "feat(mobile): rewrite Kim Gördü as list view with delay system and reveal tracking"
```

---

### Task 14: Mesajlar Tab — ChatListScreen Güncelleme

**Files:**
- Modify: `apps/mobile/src/screens/chat/ChatListScreen.tsx`

- [ ] **Step 1: Eşleşmeden mesaj CTA banner ekle**

ListHeaderComponent'e:
- 💬 ikonu + "Eşleşmeden mesaj at!" + "Tekli: 150💰 · 3'lü paket: 350💰"
- "Al" butonu → JetonMarket veya inline purchase modal
- `MESSAGE_BUNDLE_CONFIG` import et

- [ ] **Step 2: Süper uyumlu sohbet vurgusu**

ConversationCard render'ında:
- `compatibilityPercent >= 80` ise: altın background + altın avatar halka + ✨ badge + glow
- Uyumluluk etiketi küçük badge olarak

- [ ] **Step 3: Yeni eşleşme — selam ver teşviki**

Mesaj olmayan eşleşmelerde:
- Dashed border (`rgba(purple[500], 0.2)`)
- "Henüz mesaj yok — selam ver! 👋" italic text
- 👋 compact butonu sağda

- [ ] **Step 4: AI sohbet önerisi barı**

Liste altına:
- 🤖 ikonu + öneri text + "Dene →" link
- `AI_CHAT_SUGGESTION_CONFIG` import et, tier kontrolü

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens/chat/ChatListScreen.tsx
git commit -m "feat(mobile): add message CTA, super compatible highlight, AI suggestions to chat list"
```

---

## Phase 5: Yeni Özellik Ekranları

### Task 15: Gizli Hayran Ekranı

**Files:**
- Create: `apps/mobile/src/screens/matches/SecretAdmirerScreen.tsx`
- Create: `apps/mobile/src/stores/secretAdmirerStore.ts`

- [ ] **Step 1: secretAdmirerStore.ts oluştur**

Gizli Hayran state management:
- `receivedAdmirers: SecretAdmirer[]`
- `fetchReceived()` — GET /matches/secret-admirers
- `sendAdmirer(receiverId)` — POST /matches/secret-admirer
- `guess(admirerId, guessedUserId)` — POST /matches/secret-admirer/:id/guess

- [ ] **Step 2: SecretAdmirerScreen.tsx oluştur**

3 aday kartı gösterim:
- 3 profil kartı yan yana (bulanık, tap ile seç)
- "Bu 3 kişiden biri seni gizlice beğendi!" başlık
- Tahmin hakkı sayacı
- Doğru tahmin → eşleşme animasyonu
- Yanlış tahmin → kalan hak gösterimi

- [ ] **Step 3: Navigation'a ekle**

MatchesStackNavigator'a `SecretAdmirer` screen ekle

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/matches/SecretAdmirerScreen.tsx apps/mobile/src/stores/secretAdmirerStore.ts
git commit -m "feat(mobile): add Secret Admirer (Gizli Hayran) screen and store"
```

---

### Task 16: Uyum Röntgeni & Haftalık Top 3

**Files:**
- Create: `apps/mobile/src/components/matches/CompatibilityXrayCard.tsx`
- Create: `apps/mobile/src/screens/matches/WeeklyTopScreen.tsx`
- Create: `apps/mobile/src/stores/weeklyTopStore.ts`

- [ ] **Step 1: CompatibilityXrayCard.tsx oluştur**

5 kategori bar chart component:
- Her kategori: isim + skor barı (filled portion) + yüzde
- Renk: score >= 80 → gold, 60-79 → purple, < 60 → gray
- Highlights listesi her kategorinin altında
- Animasyonlu bar dolma (reanimated)

- [ ] **Step 2: weeklyTopStore.ts oluştur**

```typescript
import { create } from 'zustand';
import type { WeeklyTopMatchesResponse } from '@luma/shared';
import { apiClient } from '../services/apiClient';

interface WeeklyTopState {
  data: WeeklyTopMatchesResponse | null;
  isLoading: boolean;
  fetchWeeklyTop: () => Promise<void>;
  revealMatch: (userId: string) => void;
}

export const useWeeklyTopStore = create<WeeklyTopState>((set, get) => ({
  data: null,
  isLoading: false,

  fetchWeeklyTop: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/matches/weekly-top');
      set({ data: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  revealMatch: (userId: string) => {
    const { data } = get();
    if (!data) return;
    set({
      data: {
        ...data,
        matches: data.matches.map((m) =>
          m.userId === userId ? { ...m, isRevealed: true } : m,
        ),
      },
    });
  },
}));
```

- [ ] **Step 3: WeeklyTopScreen.tsx oluştur**

3 kart layout:
- Her kart: büyük fotoğraf (açık veya blur) + uyumluluk % + matchReason
- Blur karta tap → jeton ile aç (40💰) veya tier upgrade CTA
- "Her Pazartesi güncellenir" alt text + nextRefreshAt geri sayım
- Header: "Haftalık En Uyumlu 3 Kişin"

- [ ] **Step 4: Navigation'a ekle**

MatchesStackNavigator'a `WeeklyTop` ve mevcut navigation'lara link ekle

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/matches/CompatibilityXrayCard.tsx apps/mobile/src/screens/matches/WeeklyTopScreen.tsx apps/mobile/src/stores/weeklyTopStore.ts
git commit -m "feat(mobile): add Compatibility X-Ray card, Weekly Top 3 screen and store"
```

---

## Phase 6: Navigation & Integration

### Task 17: Navigation Güncellemesi

**Files:**
- Modify: `apps/mobile/src/navigation/MainTabNavigator.tsx` (MatchesStackNavigator bölümü)

- [ ] **Step 1: Yeni ekranları MatchesStack'e ekle**

```typescript
<Stack.Screen name="SecretAdmirer" component={SecretAdmirerScreen}
  options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
<Stack.Screen name="WeeklyTop" component={WeeklyTopScreen}
  options={{ animation: 'slide_from_bottom' }} />
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/navigation/
git commit -m "feat(mobile): add SecretAdmirer and WeeklyTop to matches navigation stack"
```

---

### Task 18: Final Integration & TypeScript Kontrolü

**Files:**
- All modified files

- [ ] **Step 1: TypeScript build kontrolü**

```bash
cd apps/mobile && npx tsc --noEmit
```

Hata varsa düzelt.

- [ ] **Step 2: Shared package build**

```bash
cd packages/shared && npm run build
```

- [ ] **Step 3: Backend build kontrolü**

```bash
cd apps/backend && npx tsc --noEmit
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors from matching redesign integration"
```

---

## Task Dependency Graph

```
Task 1 (Shared Types) ──→ Task 2 (API Routes + Config)
                              │
                    ┌─────────┴──────────┐
                    ▼                     ▼
            Task 3-6 (Backend)    Task 7-9 (Stores)
                    │                     │
                    └─────────┬───────────┘
                              ▼
                    Task 10-14 (UI Tabs) — paralel çalışılabilir
                              │
                              ▼
                    Task 15-16 (Yeni Özellikler) — paralel
                              │
                              ▼
                    Task 17 (Navigation)
                              │
                              ▼
                    Task 18 (Final Integration)
```

**Paralel çalışılabilir gruplar:**
- Task 3, 4, 5, 6 (Backend endpoint'ler) — birbirinden bağımsız
- Task 7, 8, 9 (Store'lar) — birbirinden bağımsız
- Task 10, 11, 12, 13, 14 (UI tab'lar) — birbirinden bağımsız
- Task 15, 16 (Yeni özellikler) — birbirinden bağımsız
