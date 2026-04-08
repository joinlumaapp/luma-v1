# LUMA Data Model

## Core Entities

### User
- id (UUID)
- phone_number (unique)
- email (nullable — for Google/Apple sign-in)
- auth_provider (phone | google | apple)
- selfie_verified (boolean)
- package_type (free | premium | supreme)
- package_expires_at (timestamp, nullable)
- jeton_balance (integer, default 0)
- founder_badge (boolean — first 777 users)
- created_at
- updated_at
- last_active_at
- is_banned (boolean)
- is_deleted (boolean)

### Profile
- id
- user_id (FK → User)
- name (string, required)
- birth_date (date, required)
- age (computed from birth_date)
- gender (male | female | other)
- city (string)
- latitude (float)
- longitude (float)
- bio (text, nullable)
- hedef (enum: evlenmek | iliski | sohbet_arkadas | kultur | dunya_gezme)
- kisilik_tipi (string, nullable — from Kişilik Testi: "Açık Fikirli", "Lider ve kararlı", etc.)
- profile_video_url (string, nullable — 10-30 sec)
- profile_strength (integer, 0-100 — computed)
- mood_status (string, nullable — "Sohbete açığım", "Bugün sessizim", etc.)
- mood_updated_at (timestamp, nullable)

### ProfilePhoto
- id
- profile_id (FK → Profile)
- photo_url (string)
- order (integer, 1-9)
- is_main (boolean — order 1 = main)
- created_at

### ProfileDetail
- id
- profile_id (FK → Profile)
- detail_type (enum: kilo | cinsel_yonelim | burc | egzersiz | egitim | medeni_durum | cocuklar | icki | sigara | evcil_hayvan | din | degerler | boy | is | spor | alkol)
- detail_value (string)

### ProfileInterest
- id
- profile_id (FK → Profile)
- interest_name (string)
- Max 15 per profile

### ProfilePrompt
- id
- profile_id (FK → Profile)
- prompt_question (string)
- prompt_answer (string)
- order (integer, 1-3)
- Max 3 per profile

### FavoritePlace
- id
- profile_id (FK → Profile)
- place_name (string)
- place_category (enum: park | kafe | sahil | other)
- Max 8 per profile

---

## Compatibility System

### UyumAnalizi (Compatibility Test)
- id
- user_id (FK → User)
- answers (JSON — array of 20 answers, each 1-4)
- category_scores (JSON — scores for each of 8 categories)
- completed_at (timestamp)
- completion_time_seconds (integer — for anti-manipulation)
- is_valid (boolean — false if flagged for manipulation)

### KisilikTesti (Personality Quiz)
- id
- user_id (FK → User)
- answers (JSON — array of 5 answers)
- result_type (string — "Açık Fikirli", "Lider ve kararlı", "Sessiz ve derin", "Eğlenceli ve enerjik", "Mantıklı ve analitik")
- completed_at (timestamp)

### CompatibilityScore (cached between user pairs)
- id
- user1_id (FK → User)
- user2_id (FK → User)
- raw_score (float, 0-1)
- complementarity_bonus (float, 0-0.08)
- final_score (integer, 47-97)
- is_super_uyum (boolean — true if ≥ 90)
- calculated_at (timestamp)
- UNIQUE constraint on (user1_id, user2_id) where user1_id < user2_id

---

## Relationships & Matching

### Follow
- id
- follower_id (FK → User)
- following_id (FK → User)
- created_at
- UNIQUE constraint on (follower_id, following_id)
- Note: Mutual follow = Arkadaş (computed, not stored separately)

### Like
- id
- liker_id (FK → User)
- liked_id (FK → User)
- like_type (normal | super)
- source (kesfet | akis | canli | profil)
- jeton_spent (integer, 0 for normal)
- created_at
- UNIQUE constraint on (liker_id, liked_id)

### Match
- id
- user1_id (FK → User)
- user2_id (FK → User)
- compatibility_score (integer — from CompatibilityScore)
- matched_at (timestamp)
- is_active (boolean)
- UNIQUE constraint on (user1_id, user2_id)

---

## Messaging

### Conversation
- id
- match_id (FK → Match, nullable)
- type (match_chat | friend_chat)
- created_at
- last_message_at

### Message
- id
- conversation_id (FK → Conversation)
- sender_id (FK → User)
- content (text)
- message_type (text | selam | icebreaker_game | voice_call | video_call)
- jeton_spent (integer — for Selam Gönder)
- is_read (boolean)
- read_at (timestamp, nullable)
- created_at

### Call
- id
- conversation_id (FK → Conversation)
- caller_id (FK → User)
- receiver_id (FK → User)
- call_type (voice | video)
- started_at (timestamp)
- ended_at (timestamp, nullable)
- duration_seconds (integer)
- jeton_spent (integer)

---

## Content (Akış)

### Story
- id
- user_id (FK → User)
- media_url (string)
- media_type (image | video)
- created_at
- expires_at (timestamp — created_at + 24 hours)
- view_count (integer)

### StoryView
- id
- story_id (FK → Story)
- viewer_id (FK → User)
- viewed_at (timestamp)

### Post
- id
- user_id (FK → User)
- content_type (photo | video | text)
- media_url (string, nullable — for photo/video)
- text_content (text, nullable — for text posts)
- caption (text, nullable)
- created_at
- is_active (boolean)

### PostInteraction
- id
- post_id (FK → Post)
- user_id (FK → User)
- interaction_type (like | comment)
- comment_text (text, nullable)
- created_at

---

## Canlı (Live)

### LiveSession
- id
- user1_id (FK → User)
- user2_id (FK → User)
- started_at (timestamp)
- ended_at (timestamp, nullable)
- duration_seconds (integer)
- jeton_spent_user1 (integer)
- jeton_spent_user2 (integer)
- result_user1 (follow | like | skip | null)
- result_user2 (follow | like | skip | null)

---

## Monetization

### Subscription
- id
- user_id (FK → User)
- package_type (premium | supreme)
- started_at (timestamp)
- expires_at (timestamp)
- is_active (boolean)
- payment_provider (app_store | google_play)
- transaction_id (string)

### JetonTransaction
- id
- user_id (FK → User)
- amount (integer — positive for purchase/earn, negative for spend)
- transaction_type (purchase | mission_reward | ad_reward | subscription_bonus | selam | super_like | boost | canli | voice_call | video_call | geri_alma)
- reference_id (string, nullable — order ID, mission ID, etc.)
- created_at

### Boost
- id
- user_id (FK → User)
- activated_at (timestamp)
- expires_at (timestamp — activated_at + 24 hours)
- jeton_spent (integer)
- is_active (boolean)

---

## Gamification

### KasifMission
- id
- user_id (FK → User)
- mission_type (string — "5_profil_kesfet", "3_mesaj_gonder", etc.)
- target_count (integer)
- current_count (integer)
- jeton_reward (integer)
- is_completed (boolean)
- completed_at (timestamp, nullable)
- next_available_at (timestamp)
- date (date — daily reset)

### WeeklyStar
- id
- user_id (FK → User)
- week_start (date — Monday)
- category (most_liked | most_messages | most_compatible)
- score (integer)
- rank (integer)

---

## Notifications

### Notification
- id
- user_id (FK → User)
- type (match | message | like | super_like | follow | friend | story_view | post_interaction | canli_found | mission_complete | daily_match | boost_expired | weekly_report)
- title (string)
- body (string)
- data (JSON — reference IDs, deep links)
- priority (critical | important | low)
- is_read (boolean)
- created_at

### NotificationPreference
- id
- user_id (FK → User)
- notification_type (string)
- push_enabled (boolean)
- in_app_enabled (boolean)

---

## Safety & Moderation

### Report
- id
- reporter_id (FK → User)
- reported_id (FK → User)
- reason (enum: fake_profile | harassment | spam | inappropriate_content | underage | other)
- description (text, nullable)
- status (pending | reviewed | action_taken | dismissed)
- created_at

### Block
- id
- blocker_id (FK → User)
- blocked_id (FK → User)
- created_at

### ProfileView
- id
- viewer_id (FK → User)
- viewed_id (FK → User)
- viewed_at (timestamp)
