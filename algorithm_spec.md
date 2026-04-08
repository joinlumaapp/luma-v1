# LUMA Compatibility Algorithm Specification
**V2 — Updated Core Matching Engine**

This document defines the mathematical structure of Luma's compatibility system.

---

## 1. Core Principles

Luma's compatibility engine:
- Does NOT rely on random matching
- Calculates both similarity AND psychological complementarity
- Uses weighted category scoring
- Normalizes scores between 47–97 (100% is mathematically impossible)
- 90+ = Süper Uyum (Super Compatibility) — triggers special UI animation
- Package type NEVER artificially inflates or alters scores
- Score represents genuine compatibility only

---

## 2. Input Structure

### Uyum Analizi (Compatibility Analysis) — MANDATORY
- 20 questions completed during onboarding
- 4 answer options per question (mapped to values 1-4)
- Cannot be skipped (required to use the app)
- Results stored permanently, can be retaken periodically
- This is the PRIMARY input for compatibility calculation

### Kişilik Testi (Personality Quiz) — OPTIONAL
- 5 questions, fun/quick format
- Results assign a personality tag (e.g., "Açık Fikirli", "Lider ve kararlı")
- Does NOT affect compatibility score calculation
- Purely cosmetic — shown on profile as a badge/tag
- Serves as social icebreaker and profile enrichment

---

## 3. Category Weights

The 20 questions are distributed across 8 psychological categories:

| Category | Weight | Questions |
|----------|--------|-----------|
| İletişim Tarzı (Communication Style) | 15% | Q1, Q2, Q3 |
| Çatışma Çözümü (Conflict Resolution) | 15% | Q4, Q5 |
| Duygusal Derinlik (Emotional Depth) | 15% | Q6, Q7, Q8 |
| Sosyal Enerji (Social Energy) | 10% | Q9, Q10 |
| Yaşam Temposu (Life Pace) | 10% | Q11, Q12 |
| Uzun Vadeli Vizyon (Long-Term Vision) | 15% | Q13, Q14, Q15 |
| İlişki Beklentisi (Relationship Expectation) | 10% | Q16, Q17 |
| Yaşam Tarzı Uyumu (Lifestyle Compatibility) | 10% | Q18, Q19, Q20 |

Total weight = 100%

---

## 4. Similarity Calculation

For each question pair (User A vs User B):

```
similarity = 1 - (|A - B| / 3)
```

Note: Denominator is 3 because answer scale is 1-4 (max difference = 3).

Example:
- User A = 4, User B = 3
- |4 - 3| = 1
- 1 / 3 = 0.333
- 1 - 0.333 = 0.667 similarity

Similarity range: 0.0 to 1.0

---

## 5. Complementarity Factor

Certain categories benefit from balanced differences rather than perfect match:
- **Sosyal Enerji**: Extreme introvert + extreme introvert = low dynamism
- **Yaşam Temposu**: Two very fast-paced people may clash

For these categories:

```
complementarity_bonus = small positive adjustment (0.00 – 0.08)
```

Applied when moderate (not extreme) differences exist.
This bonus is capped and cannot distort overall scoring.

---

## 6. Category Score Calculation

For each category:

```
category_score = (average similarity of category questions) × category_weight
```

Sum all categories:

```
raw_score = Σ category_scores
```

raw_score range: 0.0 to 1.0

---

## 7. Final Score Normalization

```
final_raw = raw_score + complementarity_bonus
final_score = 47 + (final_raw × 50)
```

Score range:
- Minimum ≈ 47
- Maximum ≈ 97
- 100 is mathematically impossible

---

## 8. Süper Uyum (Super Compatibility)

If final_score ≥ 90:
- Süper Uyum status activated
- UI effect: subtle glow animation on profile card
- Priority in Keşfet card stack
- Appears in "Günün Eşleşmesi" recommendations first

---

## 9. Anti-Manipulation Controls

- Extreme answer patterns (all same answer) → reduced reliability score
- Abnormally fast completion (< 60 seconds for 20 questions) → flag for review
- Inconsistent response patterns → reduced confidence factor
- Score inflation is mathematically impossible due to normalization
- Package type NEVER affects raw score calculation

---

## 10. Recommendation Algorithm

The compatibility score feeds into multiple systems:

### Keşfet (Discover) Card Ordering:
```
card_priority = (uyum_score × 0.5) + (distance_score × 0.2) + (activity_score × 0.15) + (profile_completeness × 0.1) + (boost_bonus × 0.05)
```

- boost_bonus: Active boost = +1.0, no boost = 0.0
- Supreme users get inherent priority_bonus in Öncelikli Gösterim

### Akış (Feed) Post Ordering:
```
post_priority = (recency × 0.3) + (uyum_with_poster × 0.25) + (engagement × 0.2) + (distance × 0.15) + (poster_activity × 0.1)
```

### Canlı (Live) Matching:
```
live_match_score = (uyum_score × 0.6) + (shared_interests × 0.2) + (distance × 0.1) + (availability × 0.1)
```

### Günün Eşleşmesi (Daily Match):
AI-powered selection considering:
- Highest uyum_score among unseen profiles
- Shared ilgi alanları (interests)
- Compatible hedef (goals)
- Reasonable distance
- Recent activity (active users preferred)

---

## 11. Profile Visibility Factors

Users appear more frequently if they have:
- High profile completion (Profil Gücü)
- Active Mood Status
- Recent post/story activity
- Higher package tier (Öncelikli Gösterim for Premium+)
- Active boost (10x visibility for 24 hours)
- Good engagement ratio (messages sent/received)

---

## 12. Ortak Mekan Önerisi (Mutual Place Suggestion)

When two users match:
1. System checks both users' "Sevdiğin Mekanlar" lists
2. If overlap exists → suggest the shared place as meeting point
3. If no overlap → suggest a popular place in the closer user's area
4. Format: "Siz ikiniz de [Mekan]'ı seviyorsunuz! Orada buluşmaya ne dersiniz?"

---

## Conclusion

Luma's algorithm:
- Eliminates random matching
- Goes beyond surface-level similarity
- Incorporates psychological balance
- Prevents score monetization (packages never affect scores)
- Maintains mathematical integrity
- Feeds into all discovery systems (Keşfet, Akış, Canlı, Günün Eşleşmesi)
