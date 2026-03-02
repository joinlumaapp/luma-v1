# 🤖 LUMA Agent Architecture

This document defines internal system agents for LUMA.

---

## 1. Compatibility Engine Agent

Responsibilities:
- Process 20 mandatory base questions
- Process 25 deep questions (Premium optional)
- Calculate category-weighted scores
- Apply complementarity factor (not only similarity)
- Normalize final score between 47–97

Rules:
- 100% compatibility does NOT exist
- 90+ = Super Compatibility
- Premium does NOT modify compatibility percentage

---

## 2. Recommendation Agent

Responsibilities:
- Generate daily candidate list
- Apply daily limits based on package
- Prioritize Premium users in ranking
- Apply daily Super Compatibility right (Premium)

---

## 3. Security Agent

Responsibilities:
- SMS verification rate limiting
- Selfie AI verification validation
- Fake account detection
- Multi-device abuse detection

---

## 4. Room Agent

Responsibilities:
- Activate Compatibility Room 5 minutes after chat starts
- Start 30-minute free session timer
- Handle 99 TL / 60-minute extension process
- Control voice & video permission logic