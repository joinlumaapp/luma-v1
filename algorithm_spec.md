# 🧠 LUMA Compatibility Algorithm Specification
LUMA FINAL LOCK V1 – Core Matching Engine

This document defines the mathematical structure of Luma’s compatibility system.
Core logic is locked and cannot be altered. Only optimization is allowed.

---

## 1. Core Principles

Luma’s compatibility engine:

- Does not rely on random matching
- Does not calculate similarity only
- Includes psychological complementarity
- Uses weighted category scoring
- Normalizes scores between 47–97
- Never produces 100%
- 90+ = Super Compatibility

---

## 2. Input Structure

Each user completes:

- 20 Mandatory Core Questions
- 25 Deep Questions (Premium – optional)

Each answer uses a 1–5 Likert scale.

---

## 3. Category Weights

Questions are distributed across 8 psychological categories:

1. Communication Style – 15%
2. Conflict Resolution – 15%
3. Emotional Depth – 15%
4. Social Energy – 10%
5. Life Pace – 10%
6. Long-Term Vision – 15%
7. Relationship Expectation – 10%
8. Lifestyle Compatibility – 10%

Total weight = 100%

---

## 4. Similarity Calculation

For each question:

similarity = 1 - (|A - B| / 4)

Example:
User A = 5  
User B = 4  

|5 - 4| = 1  
1 / 4 = 0.25  
1 - 0.25 = 0.75 similarity  

Similarity range = 0 to 1

---

## 5. Complementarity Factor

Certain categories (especially Social Energy and Life Pace) benefit from balanced differences rather than perfect similarity.

Example:
Extreme introvert + extreme introvert → low dynamism  
Introvert + moderately social → balanced dynamic  

Therefore:

complementarity_bonus = small positive adjustment (0 – 0.08)

This bonus is controlled and cannot distort the system.

---

## 6. Category Score Calculation

For each category:

category_score = (average similarity of category) × category_weight

All category scores are summed:

raw_score = Σ category_scores

raw_score range = 0 to 1

---

## 7. Deep Question Confidence Factor

If both users completed Deep Questions:

deep_factor = +0.03 to +0.07 confidence multiplier

If only one user completed them:
- Deep questions are ignored
- Base score remains unchanged

Premium never increases compatibility artificially.
It only increases confidence precision.

---

## 8. Final Score Normalization

final_raw = raw_score + complementarity_bonus + deep_factor

final_score = 47 + (final_raw × 50)

Score range:
Minimum ≈ 47  
Maximum ≈ 97  

100 is mathematically impossible.

---

## 9. Super Compatibility

If:

final_score ≥ 90

→ Super Compatibility

UI effect: subtle glow animation.

---

## 10. Anti-Manipulation Controls

- Extreme answer patterns are weight-balanced.
- Abnormally fast test completion reduces reliability score.
- Inconsistent response patterns reduce confidence factor.
- Score inflation is impossible.

---

## 11. Daily Match Limits (Applied After Scoring)

Free: 1 per day  
Gold: 3 per day  
Premium: 5 per day + 1 prioritized Super Match  

The algorithm produces compatibility.
The display engine filters based on package limits.

---

## Conclusion

Luma’s algorithm:

- Eliminates random matching
- Goes beyond surface-level similarity
- Incorporates psychological balance
- Prevents score monetization
- Maintains mathematical integrity

This document defines the locked core of LUMA FINAL LOCK V1.