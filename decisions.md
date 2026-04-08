# LUMA V1 — Architecture Decisions Log

**Purpose:** Key decisions made during development, with reasoning. Claude Code should respect these decisions and not reverse them.

---

## Decision 001: 3 Packages (Not 4)
**Date:** 2026-04-08
**Decision:** Ücretsiz, Premium, Supreme — 3 packages only
**Rejected:** Gold, Pro, Reserved (old naming), 4-package model
**Reasoning:** Simpler for users to understand. Ücretsiz = try everything with limits, Premium = comfortable usage, Supreme = unlimited. No confusion.

## Decision 002: No Feature Locking
**Date:** 2026-04-08
**Decision:** Every feature accessible to all users. Only quantities differ by package.
**Reasoning:** Locking features frustrates users and causes churn. Letting everyone taste features creates desire to upgrade. "Tadı damağında kalsın" strategy.

## Decision 003: Uyum Analizi = 20 Questions, Kişilik Testi = 5 Questions
**Date:** 2026-04-08
**Decision:** Uyum Analizi (20q) is MANDATORY, calculates compatibility %. Kişilik Testi (5q) is OPTIONAL, gives profile tag only.
**Rejected:** 45 questions (20 core + 25 premium), single merged test
**Reasoning:** Uyum drives the matching algorithm. Kişilik is cosmetic/social only. Clear separation prevents confusion.

## Decision 004: Canlı = Random Discovery ONLY
**Date:** 2026-04-08
**Decision:** Canlı tab is exclusively for Omegle-style random video matching. Voice/video calls between matched users happen in Messaging section.
**Reasoning:** Separates discovery (Canlı) from communication (Messaging). Users understand: Canlı = meet new people, Messages = talk to existing connections.

## Decision 005: 4 Relationship Types
**Date:** 2026-04-08
**Decision:** Takip (one-way follow), Arkadaş (mutual follow), Eşleşme (mutual like from Keşfet), Süper Beğeni (jeton-powered like)
**Reasoning:** Multiple paths to connection. Akış → Takip → Arkadaş. Keşfet → Beğeni → Eşleşme. Canlı → Takip → Arkadaş. All roads lead to Eşleşme section.

## Decision 006: 5 Hedef Options
**Date:** 2026-04-08
**Decision:** Evlenmek, Bir ilişki bulmak, Sohbet etmek ve arkadaşlarla tanışmak, Diğer kültürleri öğrenmek, Dünyayı gezmek
**Rejected:** 3 intention tags (Serious Relationship, Exploring, Not Sure)
**Reasoning:** More specific goals help matching algorithm and set clear expectations between users.

## Decision 007: Apple Sign-In Required
**Date:** 2026-04-08
**Decision:** Phone OTP + Google Sign-In + Apple Sign-In — all three
**Reasoning:** iOS App Store requires Apple Sign-In when other social login methods are offered. Without it, app will be rejected.

## Decision 008: 3-Tier Notification System
**Date:** 2026-04-08
**Decision:** Critical (always push), Important (default on, toggleable), Low Priority (default off, toggleable)
**Reasoning:** Prevents notification fatigue while ensuring critical events (matches, messages) always reach users.

## Decision 009: Compatibility Score Range 47-97
**Date:** 2026-04-08
**Decision:** Keep mathematical range of 47-97. 100% is impossible. 90+ = Süper Uyum.
**Reasoning:** Realistic scoring prevents users from expecting "perfect match." Süper Uyum at 90+ creates excitement and special treatment.

## Decision 010: Eşleşme 5 Sub-Tabs
**Date:** 2026-04-08
**Decision:** Eşleşmeler → Mesajlar → Beğenenler → Takipçiler → Kim Gördü (horizontal scrollable)
**Reasoning:** Takipçiler tab added for follow system visibility. Package-gated blur (free: blurred, premium: limited, supreme: full) creates upgrade incentive.

## Decision 011: Bumpy Design Reference
**Date:** 2026-04-08
**Decision:** Use Bumpy dating app as design reference for animations, gradients, and modern UI polish.
**Reasoning:** Current design is functional but plain. Bumpy-level polish will make LUMA feel premium and competitive.

## Decision 012: Jeton Economy
**Date:** 2026-04-08
**Decision:** Jeton is the universal in-app currency. Used for: Selam Gönder, Süper Beğeni, Boost, Canlı sessions, voice/video calls (free users).
**Reasoning:** Single currency simplifies the economy. Earnable through missions/ads, purchasable with money. Creates engagement loop.

## Decision 013: V1 New Features
**Date:** 2026-04-08
**Decision:** Add to V1: Günün Eşleşmesi, Ortak Mekan Önerisi, Mood Status, Buz Kırıcı Oyunlar, Haftalık Uyum Raporu
**Reasoning:** These features differentiate LUMA from competitors. They increase engagement, retention, and give reasons to return daily.

## Decision 014: No "Compatibility Room" Concept
**Date:** 2026-04-08
**Decision:** REMOVED old "Compatibility Room" concept entirely (5-min wait, 30-min free room, 99₺ extension)
**Reasoning:** The app evolved from a room-based concept to a modern social+dating+live discovery platform. Room concept is obsolete.
