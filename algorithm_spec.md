# LUMA V1 -- Algorithm Specification
**Version:** 2.0 (New Architecture)
**Last Updated:** 2026-04-08

This document defines the complete algorithmic engine behind LUMA's compatibility scoring, feed ranking, live matching, and AI recommendation systems.

---

## 1. Core Principles

- Compatibility is calculated from genuine psychological alignment, never inflated
- Package type (Ucretsiz / Premium / Supreme) NEVER alters raw compatibility scores
- Score range is 47-97; achieving 100% is mathematically impossible
- 90+ = Super Uyum (Super Compatibility) with special UI treatment
- All ranking algorithms incorporate uyum score as a primary signal
- No Likert scale; all questions use discrete 4-choice format

---

## 2. Test System Overview

LUMA has two separate test systems. They serve different purposes and must not be confused.

### 2.1 Uyum Analizi (Compatibility Test) -- MANDATORY

| Property | Value |
|----------|-------|
| Question count | 20 |
| Answer format | 4 discrete choices per question (mapped to values 1, 2, 3, 4) |
| When taken | During onboarding (before accessing the app) |
| Can skip | NO -- required to use the app |
| Can retake | Yes, periodically (cooldown enforced) |
| Purpose | Calculates uyum yuzdesi (compatibility percentage) between two users |
| Score range | 47-97 (90+ = Super Uyum) |
| Storage | Answers stored permanently in user profile |

### 2.2 Kisilik Testi (Personality Quiz) -- OPTIONAL

| Property | Value |
|----------|-------|
| Question count | 5 |
| Answer format | Multiple choice, fun/quick format |
| When taken | Any time after onboarding |
| Can skip | YES -- entirely optional |
| Purpose | Assigns a personality tag to user profile |
| Effect on score | NONE -- purely cosmetic |
| Output | A profile badge/tag (e.g., "Acik Fikirli", "Lider ve Kararli", "Romantik Ruh", "Maceraci", "Analitik Dusunur") |

The Kisilik Testi exists solely as a social icebreaker and profile enrichment tool. It is displayed on the user's profile card but has zero weight in any algorithmic calculation.

---

## 3. The 8 Psychological Categories

The 20 Uyum Analizi questions are distributed across 8 psychological categories. Each category has a fixed weight that determines its contribution to the final score.

| # | Category (TR) | Category (EN) | Weight | Questions | Count |
|---|---------------|---------------|--------|-----------|-------|
| 1 | Iletisim Tarzi | Communication Style | 15% | Q1, Q2, Q3 | 3 |
| 2 | Catisma Cozumu | Conflict Resolution | 15% | Q4, Q5 | 2 |
| 3 | Duygusal Derinlik | Emotional Depth | 15% | Q6, Q7, Q8 | 3 |
| 4 | Sosyal Enerji | Social Energy | 10% | Q9, Q10 | 2 |
| 5 | Yasam Temposu | Life Pace | 10% | Q11, Q12 | 2 |
| 6 | Uzun Vadeli Vizyon | Long-Term Vision | 15% | Q13, Q14, Q15 | 3 |
| 7 | Iliski Beklentisi | Relationship Expectation | 10% | Q16, Q17 | 2 |
| 8 | Yasam Tarzi Uyumu | Lifestyle Compatibility | 10% | Q18, Q19, Q20 | 3 |

**Total: 100% weight across 20 questions**

### Category Design Rationale

- **High-weight categories (15% each):** Iletisim Tarzi, Catisma Cozumu, Duygusal Derinlik, and Uzun Vadeli Vizyon are the strongest predictors of relationship satisfaction in psychological research.
- **Standard-weight categories (10% each):** Sosyal Enerji, Yasam Temposu, Iliski Beklentisi, and Yasam Tarzi Uyumu are important for daily compatibility but more flexible in practice.

---

## 4. Score Calculation

### 4.1 Per-Question Similarity

For each question, compare User A's answer with User B's answer:

```
question_similarity(A, B) = 1 - (|answer_A - answer_B| / 3)
```

- Answer values: 1, 2, 3, 4
- Maximum possible difference: |1 - 4| = 3
- Denominator is always 3

**Examples:**
| User A | User B | Difference | Similarity |
|--------|--------|------------|------------|
| 1 | 1 | 0 | 1.000 |
| 2 | 3 | 1 | 0.667 |
| 1 | 3 | 2 | 0.333 |
| 1 | 4 | 3 | 0.000 |

### 4.2 Category Score

For each category, average the similarity scores of its questions:

```
category_similarity(c) = SUM(question_similarity for all questions in c) / question_count(c)
```

Then apply the category weight:

```
category_score(c) = category_similarity(c) * category_weight(c)
```

### 4.3 Raw Score

Sum all weighted category scores:

```
raw_score = SUM(category_score(c) for c in all_categories)
```

`raw_score` range: 0.0 to 1.0

### 4.4 Complementarity Bonus

Certain categories benefit from balanced differences rather than perfect similarity:

- **Sosyal Enerji:** Two extreme introverts or two extreme extroverts may lack dynamism
- **Yasam Temposu:** Two very fast-paced people may clash

For these two categories, a small complementarity bonus is applied when moderate (not extreme) differences exist:

```
IF category IN [Sosyal Enerji, Yasam Temposu]:
    IF 0 < average_difference <= 1.5:
        complementarity_bonus += 0.00 to 0.08 (proportional to moderate difference)
```

Rules:
- Maximum total complementarity bonus: **0.08**
- Only applies to the two designated categories
- Extreme differences (avg diff > 1.5) receive NO bonus
- Perfect matches (avg diff = 0) receive NO bonus

### 4.5 Final Score Normalization

```
adjusted_raw = raw_score + complementarity_bonus
final_score = 47 + (adjusted_raw * 50)
```

| Scenario | adjusted_raw | final_score |
|----------|-------------|-------------|
| Worst possible | 0.00 | 47 |
| Average | 0.50 | 72 |
| Very high | 0.90 | 92 |
| Theoretical max | 1.00 + 0.08 | 97 (capped) |

**The score is capped at 97.** Even with maximum complementarity bonus, the score cannot exceed 97.

---

## 5. Super Uyum (Super Compatibility)

### Threshold
```
IF final_score >= 90 THEN super_uyum = TRUE
```

### Effects of Super Uyum

| Effect | Description |
|--------|-------------|
| UI glow animation | Subtle glow effect on profile card in Kesfet |
| Priority in Kesfet | Pushed to top of card stack |
| Gunun Eslesmesi priority | Considered first for daily match recommendation |
| Special match animation | Konfeti + kalp animation on match |
| Profile badge | "Super Uyum" indicator visible to both users |
| Notification | Both users notified when Super Uyum detected |

---

## 6. Kesfet (Discovery) Feed Ranking Algorithm

The Kesfet tab shows a swipeable card stack. Card ordering is determined by:

```
card_priority = (uyum_score * 0.40)
             + (distance_score * 0.20)
             + (activity_score * 0.15)
             + (profile_completeness * 0.10)
             + (hedef_alignment * 0.10)
             + (boost_bonus * 0.05)
```

### Factor Definitions

| Factor | Range | Calculation |
|--------|-------|-------------|
| `uyum_score` | 0.0-1.0 | `(final_score - 47) / 50`, normalized from 47-97 range |
| `distance_score` | 0.0-1.0 | `1 - (distance_km / max_filter_distance)`, clamped to 0 |
| `activity_score` | 0.0-1.0 | Based on last active time: <1h=1.0, <6h=0.8, <24h=0.5, <72h=0.2, else=0.0 |
| `profile_completeness` | 0.0-1.0 | Profil Gucu: photos + bio + prompts + interests filled ratio |
| `hedef_alignment` | 0.0-1.0 | 1.0 if same hedef, 0.5 if compatible hedefs, 0.0 if incompatible |
| `boost_bonus` | 0.0 or 1.0 | 1.0 if user has active boost (24 hours), else 0.0 |

### Additional Rules
- Supreme users receive `oncelikli_gosterim` bonus: +0.05 added to final card_priority
- Premium users receive +0.02 added to final card_priority
- Users already swiped (liked or passed) are excluded
- Blocked/reported users are excluded
- Users outside filter preferences (age, distance, gender) are excluded
- Minimum uyum score for display: 50 (users below 50 are deprioritized heavily)

---

## 7. Akis (Feed) Ranking Algorithm

The Akis tab shows stories and posts from all users (Populer tab) or followed users (Takip tab).

### 7.1 Populer Tab Ranking

```
post_priority = (recency * 0.25)
             + (uyum_with_poster * 0.25)
             + (engagement * 0.20)
             + (distance * 0.15)
             + (poster_activity * 0.10)
             + (content_type_bonus * 0.05)
```

| Factor | Range | Calculation |
|--------|-------|-------------|
| `recency` | 0.0-1.0 | Exponential decay: `e^(-hours_since_post / 48)` |
| `uyum_with_poster` | 0.0-1.0 | Normalized uyum score with the post author |
| `engagement` | 0.0-1.0 | `(likes + comments * 2 + shares * 3) / max_engagement`, clamped |
| `distance` | 0.0-1.0 | Same calculation as Kesfet |
| `poster_activity` | 0.0-1.0 | How recently the poster was active |
| `content_type_bonus` | 0.0-1.0 | Video=1.0, Photo=0.7, Text=0.3 (richer content preferred) |

### 7.2 Takip Tab Ranking

For the Takip tab (followed users only), the formula changes:

```
post_priority = (recency * 0.40)
             + (engagement * 0.25)
             + (uyum_with_poster * 0.15)
             + (interaction_history * 0.15)
             + (content_type_bonus * 0.05)
```

`interaction_history` = how often you interact with this user's content (likes, comments, profile visits). Ranges 0.0-1.0. Higher interaction = higher priority (similar to Instagram's close friends signal).

---

## 8. Canli (Live) Matching Algorithm

Canli is an Omegle-style random video matching feature. When a user enters Canli, the system selects a match from the available pool.

```
live_match_score = (uyum_score * 0.45)
               + (shared_interests * 0.20)
               + (hedef_alignment * 0.15)
               + (distance * 0.10)
               + (wait_time_factor * 0.10)
```

| Factor | Range | Calculation |
|--------|-------|-------------|
| `uyum_score` | 0.0-1.0 | Normalized compatibility score |
| `shared_interests` | 0.0-1.0 | `shared_interest_count / max(interest_count_A, interest_count_B)` |
| `hedef_alignment` | 0.0-1.0 | Same as Kesfet |
| `distance` | 0.0-1.0 | Preference for closer users |
| `wait_time_factor` | 0.0-1.0 | Users waiting longer get priority: `min(wait_seconds / 30, 1.0)` |

### Canli Rules
- Each session costs jeton (amount varies by package)
- Ucretsiz users have limited daily sessions
- Supreme users: unlimited sessions
- Users can follow each other during/after session
- Follow from Canli creates Takip (one-way), mutual becomes Arkadas
- Canli is discovery ONLY; voice/video calls between matches happen in Messaging
- Gender filter available (costs additional jeton for Ucretsiz users)

---

## 9. Gunun Eslesmesi (Daily Match) AI Recommendation Algorithm

Every day at a configured time, the system selects profiles to recommend to each user. This is the highest-quality signal in the app.

### Selection Process

```
daily_match_score = (uyum_score * 0.35)
                 + (unseen_bonus * 0.20)
                 + (hedef_alignment * 0.15)
                 + (shared_interests * 0.10)
                 + (distance * 0.10)
                 + (profile_quality * 0.05)
                 + (recency * 0.05)
```

| Factor | Range | Calculation |
|--------|-------|-------------|
| `uyum_score` | 0.0-1.0 | Normalized compatibility score |
| `unseen_bonus` | 0.0-1.0 | 1.0 if never shown to user before, 0.0 if previously shown |
| `hedef_alignment` | 0.0-1.0 | Goal compatibility |
| `shared_interests` | 0.0-1.0 | Interest overlap ratio |
| `distance` | 0.0-1.0 | Geographical proximity preference |
| `profile_quality` | 0.0-1.0 | Profil Gucu metric |
| `recency` | 0.0-1.0 | How recently the candidate was active |

### Selection Rules
- Only users with `uyum_score >= 75` are eligible for Gunun Eslesmesi
- Super Uyum users (90+) are prioritized first
- Previously recommended profiles are excluded for 30 days
- The same profile cannot be Gunun Eslesmesi for the same user twice in a row
- Blocked/reported users are excluded
- User must have completed Uyum Analizi to be eligible as either sender or receiver

### Package-Based Allocation
- Ucretsiz: 1/hafta (weekly)
- Premium: 1/gun (daily)
- Supreme: 3/gun (3 daily recommendations)

---

## 10. How Uyum Score Affects Visibility Across Sections

The uyum score is the backbone of LUMA. It influences every section differently:

| Section | Uyum Influence | Details |
|---------|---------------|---------|
| **Kesfet** | 40% weight | Primary sort factor; higher uyum = earlier in card stack |
| **Akis (Populer)** | 25% weight | Posts from high-uyum users shown higher in feed |
| **Akis (Takip)** | 15% weight | Lower weight since user already chose to follow |
| **Canli** | 45% weight | Strongest signal for live matching quality |
| **Gunun Eslesmesi** | 35% weight + 75 threshold | Must meet minimum; highest uyum considered first |
| **Begeniler** | Sort order | Users who liked you sorted by uyum (highest first) |
| **Kim Gordu** | Sort order | Profile viewers sorted by uyum |
| **Takipciler** | Sort order | New followers sorted by uyum |
| **Super Uyum badge** | Display trigger | Shows on cards/profiles when uyum >= 90 |

### Visibility Boosters (Independent of Uyum)
These factors increase a user's visibility independently:

| Booster | Effect | Duration |
|---------|--------|----------|
| Profil Gucu (high) | +10% visibility in Kesfet | Permanent while maintained |
| Active Mood Status | +5% visibility in all sections | While mood is active |
| Recent story/post | +5% visibility in Kesfet | 24 hours after posting |
| Premium package | +2% visibility in Kesfet | While subscribed |
| Supreme package | +5% visibility in Kesfet (Oncelikli Gosterim) | While subscribed |
| Active Boost | 10x visibility in Kesfet | 24 hours |
| Good engagement ratio | +3% visibility | Rolling 7-day window |

---

## 11. Ortak Mekan Onerisi (Mutual Place Suggestion)

When two users match (mutual like in Kesfet):

1. System checks both users' "Sevdigin Mekanlar" lists (max 8 each)
2. If overlap exists: suggest the shared place as meeting point
3. If no overlap: suggest a popular place geographically between both users
4. Format: "Siz ikiniz de [Mekan]'i seviyorsunuz! Orada bulusmaya ne dersiniz?"

This feature runs automatically on match creation and is shown in the match notification.

---

## 12. Anti-Manipulation Controls

| Control | Trigger | Action |
|---------|---------|--------|
| All-same answers | All 20 answers identical | Reduced reliability flag, warning to user |
| Speed abuse | < 60 seconds for 20 questions | Flagged for review, answers may be invalidated |
| Inconsistent pattern | Contradictory answers in related categories | Reduced confidence factor applied |
| Score inflation | N/A | Mathematically impossible due to normalization |
| Package bias | N/A | Package type has zero effect on raw score calculation |
| Bot detection | Repeated identical patterns across accounts | Account flagged for manual review |

### Confidence Factor

If anti-manipulation flags are triggered, a confidence factor (0.0-1.0) is applied:

```
displayed_score = final_score * confidence_factor
```

Default confidence_factor = 1.0 (no reduction). Flags can reduce it to minimum 0.7.

---

## 13. Hedef (Goal) Alignment Matrix

LUMA has 5 hedef options. Their compatibility with each other affects ranking:

| | Evlenmek | Iliski bulmak | Sohbet/Arkadas | Kulturleri ogrenmek | Dunyayi gezmek |
|---|---------|---------------|----------------|---------------------|----------------|
| **Evlenmek** | 1.0 | 0.7 | 0.2 | 0.3 | 0.3 |
| **Iliski bulmak** | 0.7 | 1.0 | 0.5 | 0.5 | 0.5 |
| **Sohbet/Arkadas** | 0.2 | 0.5 | 1.0 | 0.8 | 0.8 |
| **Kulturleri ogrenmek** | 0.3 | 0.5 | 0.8 | 1.0 | 0.9 |
| **Dunyayi gezmek** | 0.3 | 0.5 | 0.8 | 0.9 | 1.0 |

- Same hedef = 1.0 (perfect alignment)
- Compatible hedefs (e.g., Sohbet + Kultur) = 0.8
- Incompatible hedefs (e.g., Evlenmek + Sohbet) = 0.2

This matrix is used wherever `hedef_alignment` appears in the algorithms above.

---

## 14. Technical Implementation Notes

### Score Caching
- Uyum scores are computed on-demand and cached in Redis
- Cache TTL: 24 hours (recalculated if either user retakes Uyum Analizi)
- Batch precomputation runs nightly for active user pairs

### Performance
- Kesfet card stack: precompute top 100 candidates per user
- Canli matching: real-time computation from available pool (< 100ms target)
- Gunun Eslesmesi: batch job runs daily at configured time (e.g., 09:00 TR time)
- Akis ranking: computed on scroll with pagination

### Database
- User answers stored in `user_compatibility_answers` table
- Cached scores stored in Redis with key pattern `uyum:{userA}:{userB}`
- Kisilik Testi results stored as profile metadata (tag string)

---

## Summary

LUMA's algorithm engine:
- Uses 20 mandatory questions across 8 psychological categories
- Calculates genuine compatibility (47-97 range) with no artificial inflation
- Powers all discovery systems: Kesfet, Akis, Canli, Gunun Eslesmesi
- Treats Super Uyum (90+) as a premium signal with special UI and priority
- Keeps Kisilik Testi (5 optional questions) purely cosmetic
- Never allows package type to alter raw compatibility scores
- Incorporates hedef alignment, distance, activity, and profile quality as secondary signals
