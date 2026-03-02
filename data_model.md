# 📊 LUMA Data Model

## User
- id
- phone_number
- selfie_verified (boolean)
- package_type (free | gold | premium)
- founder_badge (boolean)
- relationship_mode (boolean)
- daily_match_count
- super_match_used (boolean)

---

## Profile
- user_id
- name
- age
- city
- bio
- photos (max 3)
- intention_tag

---

## CompatibilityTest
- user_id
- category_scores (JSON)
- base_score
- deep_score
- complementarity_factor
- final_score (normalized 47–97)

---

## Match
- user1_id
- user2_id
- compatibility_score
- created_at
- chat_started_at

---

## Room
- match_id
- started_at
- ended_at
- extended (boolean)
- extension_paid (boolean)

---

## RelationshipMode
- user1_id
- user2_id
- status (pending | active | exit_pending)
- exit_requested_at