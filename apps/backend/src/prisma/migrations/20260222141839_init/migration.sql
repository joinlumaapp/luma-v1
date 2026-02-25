-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('SMS', 'SELFIE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IntentionTag" AS ENUM ('SERIOUS_RELATIONSHIP', 'EXPLORING', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('COMMUNICATION', 'LIFE_GOALS', 'VALUES', 'LIFESTYLE', 'EMOTIONAL_INTELLIGENCE', 'RELATIONSHIP_EXPECTATIONS', 'SOCIAL_COMPATIBILITY', 'ATTACHMENT_STYLE', 'LOVE_LANGUAGE', 'CONFLICT_STYLE', 'FUTURE_VISION', 'INTELLECTUAL', 'INTIMACY', 'GROWTH_MINDSET', 'CORE_FEARS');

-- CreateEnum
CREATE TYPE "CompatibilityLevel" AS ENUM ('NORMAL', 'SUPER');

-- CreateEnum
CREATE TYPE "SwipeAction" AS ENUM ('LIKE', 'PASS');

-- CreateEnum
CREATE TYPE "MatchAnimationType" AS ENUM ('NORMAL', 'SUPER_COMPATIBILITY');

-- CreateEnum
CREATE TYPE "HarmonySessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXTENDED', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HarmonyMessageType" AS ENUM ('TEXT', 'QUESTION_CARD', 'GAME_CARD', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QuestionCardCategory" AS ENUM ('ICEBREAKER', 'DEEP_CONNECTION', 'FUN_PLAYFUL');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'HIDDEN', 'ENDED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('FREE', 'GOLD', 'PRO', 'RESERVED');

-- CreateEnum
CREATE TYPE "PaymentPlatform" AS ENUM ('APPLE', 'GOOGLE');

-- CreateEnum
CREATE TYPE "GoldTransactionType" AS ENUM ('PURCHASE', 'SUBSCRIPTION_ALLOCATION', 'REFERRAL_BONUS', 'BADGE_REWARD', 'HARMONY_EXTENSION', 'PROFILE_BOOST', 'SUPER_LIKE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MATCH', 'HARMONY_INVITE', 'HARMONY_REMINDER', 'BADGE_EARNED', 'SUBSCRIPTION_EXPIRING', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_PHOTO', 'SPAM', 'UNDERAGE', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "phoneCountryCode" VARCHAR(5) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_sms_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_selfie_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_fully_verified" BOOLEAN NOT NULL DEFAULT false,
    "package_tier" "PackageTier" NOT NULL DEFAULT 'FREE',
    "gold_balance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "device_id" VARCHAR(255),
    "device_type" VARCHAR(20),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "otp_code" VARCHAR(6),
    "otp_expires_at" TIMESTAMP(3),
    "otp_attempts" INTEGER NOT NULL DEFAULT 0,
    "selfie_url" TEXT,
    "liveness_score" DOUBLE PRECISION,
    "face_match_score" DOUBLE PRECISION,
    "rejection_reason" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(50) NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "bio" VARCHAR(500),
    "intention_tag" "IntentionTag" NOT NULL,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_photos" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "moderation_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_questions" (
    "id" UUID NOT NULL,
    "question_number" INTEGER NOT NULL,
    "category" "QuestionCategory" NOT NULL,
    "text_en" TEXT NOT NULL,
    "text_tr" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compatibility_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_tr" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_scores" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "base_score" DOUBLE PRECISION NOT NULL,
    "deep_score" DOUBLE PRECISION,
    "final_score" DOUBLE PRECISION NOT NULL,
    "level" "CompatibilityLevel" NOT NULL DEFAULT 'NORMAL',
    "dimension_scores" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compatibility_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swipes" (
    "id" UUID NOT NULL,
    "swiper_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "action" "SwipeAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_swipe_counts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_swipe_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "compatibility_score" DOUBLE PRECISION NOT NULL,
    "compatibility_level" "CompatibilityLevel" NOT NULL,
    "animation_type" "MatchAnimationType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unmatched_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_sessions" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "status" "HarmonySessionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "actual_ended_at" TIMESTAMP(3),
    "total_extension_minutes" INTEGER NOT NULL DEFAULT 0,
    "has_voice_chat" BOOLEAN NOT NULL DEFAULT false,
    "has_video_chat" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" "HarmonyMessageType" NOT NULL DEFAULT 'TEXT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_question_cards" (
    "id" UUID NOT NULL,
    "category" "QuestionCardCategory" NOT NULL,
    "text_en" TEXT NOT NULL,
    "text_tr" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "harmony_question_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_game_cards" (
    "id" UUID NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_tr" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_tr" TEXT NOT NULL,
    "game_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "harmony_game_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_used_cards" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "question_card_id" UUID,
    "game_card_id" UUID,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_used_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harmony_extensions" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "gold_spent" INTEGER NOT NULL,
    "minutes_added" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "harmony_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" UUID NOT NULL,
    "user_a_id" UUID NOT NULL,
    "user_b_id" UUID NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PROPOSED',
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couple_badges" (
    "id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "badge_type" VARCHAR(50) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couple_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples_club_events" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "title_tr" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "description_tr" TEXT NOT NULL,
    "event_date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "max_couples" INTEGER NOT NULL,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couples_club_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "couples_club_participants" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "rsvp_status" VARCHAR(20) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "couples_club_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovered_places" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "category" VARCHAR(50),
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovered_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_check_ins" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "relationship_id" UUID,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_memories" (
    "id" UUID NOT NULL,
    "place_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "note" VARCHAR(500),
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badge_definitions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_tr" VARCHAR(100) NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_tr" TEXT NOT NULL,
    "icon_url" TEXT,
    "criteria" JSONB NOT NULL,
    "gold_reward" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badge_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_tier" "PackageTier" NOT NULL,
    "platform" "PaymentPlatform" NOT NULL,
    "product_id" VARCHAR(100) NOT NULL,
    "purchase_token" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "iap_receipts" (
    "id" UUID NOT NULL,
    "subscription_id" UUID,
    "platform" "PaymentPlatform" NOT NULL,
    "receipt_data" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "product_id" VARCHAR(100) NOT NULL,
    "is_valid" BOOLEAN NOT NULL,
    "validation_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "iap_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gold_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "GoldTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gold_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" UUID NOT NULL,
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "reported_id" UUID NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_verifications_user_id_type_idx" ON "user_verifications"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_intention_tag_idx" ON "user_profiles"("intention_tag");

-- CreateIndex
CREATE INDEX "user_profiles_city_country_idx" ON "user_profiles"("city", "country");

-- CreateIndex
CREATE INDEX "user_profiles_last_active_at_idx" ON "user_profiles"("last_active_at");

-- CreateIndex
CREATE INDEX "user_photos_user_id_idx" ON "user_photos"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_questions_question_number_key" ON "compatibility_questions"("question_number");

-- CreateIndex
CREATE INDEX "compatibility_questions_is_premium_idx" ON "compatibility_questions"("is_premium");

-- CreateIndex
CREATE INDEX "question_options_question_id_idx" ON "question_options"("question_id");

-- CreateIndex
CREATE INDEX "user_answers_user_id_idx" ON "user_answers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_answers_user_id_question_id_key" ON "user_answers"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "compatibility_scores_user_a_id_idx" ON "compatibility_scores"("user_a_id");

-- CreateIndex
CREATE INDEX "compatibility_scores_user_b_id_idx" ON "compatibility_scores"("user_b_id");

-- CreateIndex
CREATE INDEX "compatibility_scores_final_score_idx" ON "compatibility_scores"("final_score");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_scores_user_a_id_user_b_id_key" ON "compatibility_scores"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "swipes_swiper_id_created_at_idx" ON "swipes"("swiper_id", "created_at");

-- CreateIndex
CREATE INDEX "swipes_target_id_idx" ON "swipes"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "swipes_swiper_id_target_id_key" ON "swipes"("swiper_id", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_swipe_counts_user_id_date_key" ON "daily_swipe_counts"("user_id", "date");

-- CreateIndex
CREATE INDEX "matches_user_a_id_is_active_idx" ON "matches"("user_a_id", "is_active");

-- CreateIndex
CREATE INDEX "matches_user_b_id_is_active_idx" ON "matches"("user_b_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_a_id_user_b_id_key" ON "matches"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "harmony_sessions_match_id_idx" ON "harmony_sessions"("match_id");

-- CreateIndex
CREATE INDEX "harmony_sessions_user_a_id_status_idx" ON "harmony_sessions"("user_a_id", "status");

-- CreateIndex
CREATE INDEX "harmony_sessions_user_b_id_status_idx" ON "harmony_sessions"("user_b_id", "status");

-- CreateIndex
CREATE INDEX "harmony_messages_session_id_created_at_idx" ON "harmony_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "harmony_used_cards_session_id_idx" ON "harmony_used_cards"("session_id");

-- CreateIndex
CREATE INDEX "harmony_extensions_session_id_idx" ON "harmony_extensions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "relationships_user_a_id_user_b_id_key" ON "relationships"("user_a_id", "user_b_id");

-- CreateIndex
CREATE UNIQUE INDEX "couple_badges_relationship_id_key" ON "couple_badges"("relationship_id");

-- CreateIndex
CREATE INDEX "couples_club_events_event_date_idx" ON "couples_club_events"("event_date");

-- CreateIndex
CREATE UNIQUE INDEX "couples_club_participants_event_id_relationship_id_key" ON "couples_club_participants"("event_id", "relationship_id");

-- CreateIndex
CREATE INDEX "discovered_places_latitude_longitude_idx" ON "discovered_places"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "place_check_ins_user_id_idx" ON "place_check_ins"("user_id");

-- CreateIndex
CREATE INDEX "place_check_ins_place_id_idx" ON "place_check_ins"("place_id");

-- CreateIndex
CREATE INDEX "place_memories_place_id_idx" ON "place_memories"("place_id");

-- CreateIndex
CREATE UNIQUE INDEX "badge_definitions_key_key" ON "badge_definitions"("key");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_is_active_idx" ON "subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "subscriptions_expiry_date_idx" ON "subscriptions"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "iap_receipts_transaction_id_key" ON "iap_receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "iap_receipts_transaction_id_idx" ON "iap_receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "gold_transactions_user_id_created_at_idx" ON "gold_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "blocks_blocker_id_idx" ON "blocks"("blocker_id");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "reports_reported_id_status_idx" ON "reports"("reported_id", "status");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_verifications" ADD CONSTRAINT "user_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_photos" ADD CONSTRAINT "user_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "compatibility_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "compatibility_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_swiper_id_fkey" FOREIGN KEY ("swiper_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swipes" ADD CONSTRAINT "swipes_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_sessions" ADD CONSTRAINT "harmony_sessions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_sessions" ADD CONSTRAINT "harmony_sessions_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_sessions" ADD CONSTRAINT "harmony_sessions_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_messages" ADD CONSTRAINT "harmony_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "harmony_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_messages" ADD CONSTRAINT "harmony_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_used_cards" ADD CONSTRAINT "harmony_used_cards_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "harmony_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_used_cards" ADD CONSTRAINT "harmony_used_cards_question_card_id_fkey" FOREIGN KEY ("question_card_id") REFERENCES "harmony_question_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_used_cards" ADD CONSTRAINT "harmony_used_cards_game_card_id_fkey" FOREIGN KEY ("game_card_id") REFERENCES "harmony_game_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_extensions" ADD CONSTRAINT "harmony_extensions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "harmony_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harmony_extensions" ADD CONSTRAINT "harmony_extensions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_badges" ADD CONSTRAINT "couple_badges_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples_club_participants" ADD CONSTRAINT "couples_club_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "couples_club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_check_ins" ADD CONSTRAINT "place_check_ins_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "discovered_places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_check_ins" ADD CONSTRAINT "place_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_memories" ADD CONSTRAINT "place_memories_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "discovered_places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_memories" ADD CONSTRAINT "place_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badge_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "iap_receipts" ADD CONSTRAINT "iap_receipts_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gold_transactions" ADD CONSTRAINT "gold_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
