-- LUMA V1 Schema Sync Migration
-- Brings the database in line with the current Prisma schema
-- Fixes missing enums, tables, columns, indexes, and column type mismatches
-- that were not included in the initial 20260222141839_init migration.

-- ============================================================
-- 1. ADD MISSING ENUM VALUES
-- ============================================================

-- SwipeAction: add SUPER_LIKE
ALTER TYPE "SwipeAction" ADD VALUE IF NOT EXISTS 'SUPER_LIKE';

-- NotificationType: add 4 missing values
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPER_LIKE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'MATCH_REMOVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RELATIONSHIP_REQUEST';

-- RelationshipStatus: add ENDING
ALTER TYPE "RelationshipStatus" ADD VALUE IF NOT EXISTS 'ENDING';

-- ============================================================
-- 2. CREATE MISSING ENUM TYPES
-- ============================================================

-- ChatMessageType enum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'SYSTEM');

-- ChatMessageStatus enum
CREATE TYPE "ChatMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- ============================================================
-- 3. ALTER COLUMN TYPE MISMATCHES
-- ============================================================

-- user_verifications.otp_code: VARCHAR(6) -> VARCHAR(72) for bcrypt hash storage
ALTER TABLE "user_verifications" ALTER COLUMN "otp_code" TYPE VARCHAR(72);

-- ============================================================
-- 4. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- user_profiles: location_updated_at, current_mood, mood_set_at, voice_intro_url, voice_intro_duration
ALTER TABLE "user_profiles" ADD COLUMN "location_updated_at" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN "current_mood" VARCHAR(20);
ALTER TABLE "user_profiles" ADD COLUMN "mood_set_at" TIMESTAMP(3);
ALTER TABLE "user_profiles" ADD COLUMN "voice_intro_url" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "voice_intro_duration" DOUBLE PRECISION;

-- matches: updated_at (required by @updatedAt, NOT NULL)
ALTER TABLE "matches" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- harmony_messages: read_at
ALTER TABLE "harmony_messages" ADD COLUMN "read_at" TIMESTAMP(3);

-- relationships: 48-hour exit confirmation fields
ALTER TABLE "relationships" ADD COLUMN "deactivation_initiated_at" TIMESTAMP(3);
ALTER TABLE "relationships" ADD COLUMN "deactivation_initiated_by" UUID;
ALTER TABLE "relationships" ADD COLUMN "deactivation_deadline" TIMESTAMP(3);

-- ============================================================
-- 5. CREATE MISSING TABLES
-- ============================================================

-- ChatMessage table
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'SENT',
    "media_url" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- MessageReaction table
CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- NotificationPreference table
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_matches" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "harmony_invites" BOOLEAN NOT NULL DEFAULT true,
    "badges" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "all_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- DailyQuestionAnswer table
CREATE TABLE "daily_question_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID,
    "day_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_question_answers_pkey" PRIMARY KEY ("id")
);

-- IcebreakerSession table
CREATE TABLE "icebreaker_sessions" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "game_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icebreaker_sessions_pkey" PRIMARY KEY ("id")
);

-- IcebreakerAnswer table
CREATE TABLE "icebreaker_answers" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icebreaker_answers_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 6. CREATE INDEXES FOR NEW TABLES
-- ============================================================

-- chat_messages indexes
CREATE INDEX "chat_messages_match_id_created_at_idx" ON "chat_messages"("match_id", "created_at");
CREATE INDEX "chat_messages_match_id_sender_id_status_idx" ON "chat_messages"("match_id", "sender_id", "status");
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- message_reactions indexes
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_key" ON "message_reactions"("message_id", "user_id");
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- notification_preferences indexes
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- daily_question_answers indexes
CREATE UNIQUE INDEX "daily_question_answers_user_id_day_number_key" ON "daily_question_answers"("user_id", "day_number");
CREATE INDEX "daily_question_answers_question_id_idx" ON "daily_question_answers"("question_id");
CREATE INDEX "daily_question_answers_user_id_created_at_idx" ON "daily_question_answers"("user_id", "created_at");

-- icebreaker_sessions indexes
CREATE INDEX "icebreaker_sessions_match_id_idx" ON "icebreaker_sessions"("match_id");

-- icebreaker_answers indexes
CREATE UNIQUE INDEX "icebreaker_answers_session_id_user_id_question_id_key" ON "icebreaker_answers"("session_id", "user_id", "question_id");
CREATE INDEX "icebreaker_answers_session_id_idx" ON "icebreaker_answers"("session_id");

-- ============================================================
-- 7. ADD MISSING INDEXES ON EXISTING TABLES
-- ============================================================

-- user_sessions: missing expiresAt index
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- user_sessions: init had single-column user_id index, schema wants composite (user_id, is_revoked)
DROP INDEX IF EXISTS "user_sessions_user_id_idx";
CREATE INDEX "user_sessions_user_id_is_revoked_idx" ON "user_sessions"("user_id", "is_revoked");

-- user_verifications: init had (user_id, type), schema wants (user_id, type, status)
DROP INDEX IF EXISTS "user_verifications_user_id_type_idx";
CREATE INDEX "user_verifications_user_id_type_status_idx" ON "user_verifications"("user_id", "type", "status");

-- user_photos: init had single-column user_id, schema wants composite indexes
DROP INDEX IF EXISTS "user_photos_user_id_idx";
CREATE INDEX "user_photos_user_id_is_approved_order_idx" ON "user_photos"("user_id", "is_approved", "order");
CREATE INDEX "user_photos_user_id_is_primary_idx" ON "user_photos"("user_id", "is_primary");

-- user_profiles: missing composite indexes
CREATE INDEX "user_profiles_gender_is_complete_idx" ON "user_profiles"("gender", "is_complete");
CREATE INDEX "user_profiles_is_complete_last_active_at_idx" ON "user_profiles"("is_complete", "last_active_at");

-- swipes: missing composite index for super_like daily count
CREATE INDEX "swipes_swiper_id_action_created_at_idx" ON "swipes"("swiper_id", "action", "created_at");

-- matches: init had (user_a_id, is_active) without created_at, schema wants (user_a_id, is_active, created_at)
DROP INDEX IF EXISTS "matches_user_a_id_is_active_idx";
CREATE INDEX "matches_user_a_id_is_active_created_at_idx" ON "matches"("user_a_id", "is_active", "created_at");
DROP INDEX IF EXISTS "matches_user_b_id_is_active_idx";
CREATE INDEX "matches_user_b_id_is_active_created_at_idx" ON "matches"("user_b_id", "is_active", "created_at");

-- harmony_messages: missing sender_id index
CREATE INDEX "harmony_messages_sender_id_idx" ON "harmony_messages"("sender_id");

-- relationships: missing status indexes
CREATE INDEX "relationships_user_a_id_status_idx" ON "relationships"("user_a_id", "status");
CREATE INDEX "relationships_user_b_id_status_idx" ON "relationships"("user_b_id", "status");

-- reports: missing reporter_id index and status+created_at composite
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- device_tokens: init had single user_id, schema wants (user_id, is_active)
DROP INDEX IF EXISTS "device_tokens_user_id_idx";
CREATE INDEX "device_tokens_user_id_is_active_idx" ON "device_tokens"("user_id", "is_active");

-- ============================================================
-- 8. ADD FOREIGN KEYS FOR NEW TABLES
-- ============================================================

-- chat_messages foreign keys
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- message_reactions foreign keys
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- notification_preferences foreign keys
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- daily_question_answers foreign keys
ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "compatibility_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- icebreaker_sessions foreign keys
ALTER TABLE "icebreaker_sessions" ADD CONSTRAINT "icebreaker_sessions_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- icebreaker_answers foreign keys
ALTER TABLE "icebreaker_answers" ADD CONSTRAINT "icebreaker_answers_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "icebreaker_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "icebreaker_answers" ADD CONSTRAINT "icebreaker_answers_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- couples_club_participants: missing FK to relationships (was in init but not present)
ALTER TABLE "couples_club_participants" ADD CONSTRAINT "couples_club_participants_relationship_id_fkey"
    FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
