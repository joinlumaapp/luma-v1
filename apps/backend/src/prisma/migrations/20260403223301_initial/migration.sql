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
CREATE TYPE "SwipeAction" AS ENUM ('LIKE', 'PASS', 'SUPER_LIKE');

-- CreateEnum
CREATE TYPE "MatchAnimationType" AS ENUM ('NORMAL', 'SUPER_COMPATIBILITY');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PROPOSED', 'ACTIVE', 'HIDDEN', 'ENDING', 'ENDED');

-- CreateEnum
CREATE TYPE "PackageTier" AS ENUM ('FREE', 'GOLD', 'PRO', 'RESERVED');

-- CreateEnum
CREATE TYPE "PaymentPlatform" AS ENUM ('APPLE', 'GOOGLE');

-- CreateEnum
CREATE TYPE "GoldTransactionType" AS ENUM ('PURCHASE', 'SUBSCRIPTION_ALLOCATION', 'REFERRAL_BONUS', 'BADGE_REWARD', 'PROFILE_BOOST', 'SUPER_LIKE', 'STREAK_REWARD', 'DAILY_LOGIN', 'READ_RECEIPTS', 'UNDO_PASS', 'SPOTLIGHT', 'TRAVEL_MODE', 'PRIORITY_MESSAGE', 'VOICE_CALL', 'VIDEO_CALL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MATCH', 'NEW_MESSAGE', 'SUPER_LIKE', 'MATCH_REMOVED', 'BADGE_EARNED', 'SUBSCRIPTION_EXPIRING', 'RELATIONSHIP_REQUEST', 'SYSTEM', 'POST_LIKE', 'STORY_LIKE', 'NEW_FOLLOWER');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'INAPPROPRIATE_PHOTO', 'SPAM', 'UNDERAGE', 'SCAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'GIF', 'VOICE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'DELETED');

-- CreateEnum
CREATE TYPE "DatePlanStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'ANSWERED', 'REJECTED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VOICE', 'VIDEO');

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
    "display_id" VARCHAR(20) NOT NULL,

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
    "otp_code" VARCHAR(72),
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
    "last_name" VARCHAR(50),
    "birth_date" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "bio" VARCHAR(500),
    "intention_tag" "IntentionTag" NOT NULL,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location_updated_at" TIMESTAMP(3),
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_mood" VARCHAR(20),
    "mood_set_at" TIMESTAMP(3),
    "interest_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voice_intro_url" TEXT,
    "voice_intro_duration" DOUBLE PRECISION,
    "height" INTEGER,
    "education" VARCHAR(50),
    "smoking" VARCHAR(20),
    "drinking" VARCHAR(20),
    "exercise" VARCHAR(20),
    "zodiac_sign" VARCHAR(20),
    "religion" VARCHAR(50),
    "is_incognito" BOOLEAN NOT NULL DEFAULT false,
    "mbti_type" VARCHAR(4),
    "enneagram_type" VARCHAR(2),
    "video_url" TEXT,
    "video_key" TEXT,
    "video_thumbnail_url" TEXT,
    "video_duration" INTEGER DEFAULT 0,
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
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
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
    "comment" VARCHAR(200),
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
    "updated_at" TIMESTAMP(3) NOT NULL,
    "unmatched_at" TIMESTAMP(3),

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
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
    "deactivation_initiated_at" TIMESTAMP(3),
    "deactivation_initiated_by" UUID,
    "deactivation_deadline" TIMESTAMP(3),

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
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_end_date" TIMESTAMP(3),
    "grace_period_end" TIMESTAMP(3),
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

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" "ChatMessageType" NOT NULL DEFAULT 'TEXT',
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'SENT',
    "media_url" TEXT,
    "media_duration" DOUBLE PRECISION,
    "metadata" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_reactions" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "emoji" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "new_matches" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "badges" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "all_disabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_hours_start" VARCHAR(5) DEFAULT '23:00',
    "quiet_hours_end" VARCHAR(5) DEFAULT '08:00',
    "timezone" VARCHAR(50) DEFAULT 'Europe/Istanbul',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_question_answers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID,
    "day_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_question_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icebreaker_sessions" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "game_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "icebreaker_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icebreaker_answers" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "icebreaker_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_prompts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question" VARCHAR(200) NOT NULL,
    "answer" VARCHAR(300) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_favorite_spots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_boosts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "gold_spent" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profile_boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_streaks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 1,
    "longest_streak" INTEGER NOT NULL DEFAULT 1,
    "last_login_date" DATE NOT NULL,
    "total_gold_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_streaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_picks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "picked_user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "is_liked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_views" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewed_user_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_plans" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "proposed_by_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "suggested_date" TIMESTAMP(3),
    "suggested_place" VARCHAR(200),
    "note" VARCHAR(300),
    "status" "DatePlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "date_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "total_swipes" INTEGER NOT NULL DEFAULT 0,
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "total_matches" INTEGER NOT NULL DEFAULT 0,
    "avg_compatibility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top_category" VARCHAR(50),
    "messages_exchanged" INTEGER NOT NULL DEFAULT 0,
    "most_active_day" VARCHAR(10),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "session_id" VARCHAR(50) NOT NULL,
    "platform" VARCHAR(20) NOT NULL,
    "app_version" VARCHAR(20) NOT NULL,
    "client_timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "media_url" TEXT NOT NULL,
    "media_type" VARCHAR(10) NOT NULL,
    "overlays" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_views" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_likes" (
    "id" UUID NOT NULL,
    "story_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" UUID NOT NULL,
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "post_type" VARCHAR(10) NOT NULL,
    "content" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "video_url" TEXT,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_history" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "caller_id" UUID NOT NULL,
    "receiver_id" UUID NOT NULL,
    "call_type" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "gold_cost" INTEGER NOT NULL,
    "ended_by" UUID,
    "gold_transaction_id" UUID,
    "deleted_by_caller" BOOLEAN NOT NULL DEFAULT false,
    "deleted_by_receiver" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_display_id_key" ON "users"("display_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_package_tier_idx" ON "users"("package_tier");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_is_revoked_idx" ON "user_sessions"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "user_verifications_user_id_type_status_idx" ON "user_verifications"("user_id", "type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_intention_tag_idx" ON "user_profiles"("intention_tag");

-- CreateIndex
CREATE INDEX "user_profiles_city_country_idx" ON "user_profiles"("city", "country");

-- CreateIndex
CREATE INDEX "user_profiles_last_active_at_idx" ON "user_profiles"("last_active_at");

-- CreateIndex
CREATE INDEX "user_profiles_gender_is_complete_idx" ON "user_profiles"("gender", "is_complete");

-- CreateIndex
CREATE INDEX "user_profiles_is_complete_last_active_at_idx" ON "user_profiles"("is_complete", "last_active_at");

-- CreateIndex
CREATE INDEX "user_profiles_latitude_longitude_idx" ON "user_profiles"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "user_photos_user_id_is_approved_order_idx" ON "user_photos"("user_id", "is_approved", "order");

-- CreateIndex
CREATE INDEX "user_photos_user_id_is_primary_idx" ON "user_photos"("user_id", "is_primary");

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
CREATE INDEX "compatibility_scores_level_final_score_idx" ON "compatibility_scores"("level", "final_score");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_scores_user_a_id_user_b_id_key" ON "compatibility_scores"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "swipes_swiper_id_created_at_idx" ON "swipes"("swiper_id", "created_at");

-- CreateIndex
CREATE INDEX "swipes_swiper_id_action_created_at_idx" ON "swipes"("swiper_id", "action", "created_at");

-- CreateIndex
CREATE INDEX "swipes_target_id_idx" ON "swipes"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "swipes_swiper_id_target_id_key" ON "swipes"("swiper_id", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_swipe_counts_user_id_date_key" ON "daily_swipe_counts"("user_id", "date");

-- CreateIndex
CREATE INDEX "matches_user_a_id_is_active_created_at_idx" ON "matches"("user_a_id", "is_active", "created_at");

-- CreateIndex
CREATE INDEX "matches_user_b_id_is_active_created_at_idx" ON "matches"("user_b_id", "is_active", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "matches_user_a_id_user_b_id_key" ON "matches"("user_a_id", "user_b_id");

-- CreateIndex
CREATE INDEX "relationships_user_a_id_status_idx" ON "relationships"("user_a_id", "status");

-- CreateIndex
CREATE INDEX "relationships_user_b_id_status_idx" ON "relationships"("user_b_id", "status");

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
CREATE INDEX "subscriptions_user_id_package_tier_is_active_idx" ON "subscriptions"("user_id", "package_tier", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "iap_receipts_transaction_id_key" ON "iap_receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "iap_receipts_transaction_id_idx" ON "iap_receipts"("transaction_id");

-- CreateIndex
CREATE INDEX "gold_transactions_user_id_created_at_idx" ON "gold_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "gold_transactions_user_id_type_created_at_idx" ON "gold_transactions"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_is_active_idx" ON "device_tokens"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "blocks_blocker_id_idx" ON "blocks"("blocker_id");

-- CreateIndex
CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_id_blocked_id_key" ON "blocks"("blocker_id", "blocked_id");

-- CreateIndex
CREATE INDEX "reports_reported_id_status_idx" ON "reports"("reported_id", "status");

-- CreateIndex
CREATE INDEX "reports_reporter_id_idx" ON "reports"("reporter_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_match_id_created_at_idx" ON "chat_messages"("match_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_match_id_sender_id_status_idx" ON "chat_messages"("match_id", "sender_id", "status");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_reactions_message_id_user_id_key" ON "message_reactions"("message_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_key" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE INDEX "daily_question_answers_question_id_idx" ON "daily_question_answers"("question_id");

-- CreateIndex
CREATE INDEX "daily_question_answers_user_id_created_at_idx" ON "daily_question_answers"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_question_answers_user_id_day_number_key" ON "daily_question_answers"("user_id", "day_number");

-- CreateIndex
CREATE INDEX "icebreaker_sessions_match_id_idx" ON "icebreaker_sessions"("match_id");

-- CreateIndex
CREATE INDEX "icebreaker_answers_session_id_idx" ON "icebreaker_answers"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "icebreaker_answers_session_id_user_id_question_id_key" ON "icebreaker_answers"("session_id", "user_id", "question_id");

-- CreateIndex
CREATE INDEX "profile_prompts_user_id_idx" ON "profile_prompts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_prompts_user_id_order_key" ON "profile_prompts"("user_id", "order");

-- CreateIndex
CREATE INDEX "user_favorite_spots_user_id_idx" ON "user_favorite_spots"("user_id");

-- CreateIndex
CREATE INDEX "profile_boosts_user_id_is_active_idx" ON "profile_boosts"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "profile_boosts_ends_at_idx" ON "profile_boosts"("ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "login_streaks_user_id_key" ON "login_streaks"("user_id");

-- CreateIndex
CREATE INDEX "daily_picks_user_id_date_idx" ON "daily_picks"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_picks_user_id_picked_user_id_date_key" ON "daily_picks"("user_id", "picked_user_id", "date");

-- CreateIndex
CREATE INDEX "feed_views_user_id_viewed_at_idx" ON "feed_views"("user_id", "viewed_at");

-- CreateIndex
CREATE INDEX "feed_views_user_id_viewed_user_id_idx" ON "feed_views"("user_id", "viewed_user_id");

-- CreateIndex
CREATE INDEX "date_plans_match_id_status_idx" ON "date_plans"("match_id", "status");

-- CreateIndex
CREATE INDEX "date_plans_proposed_by_id_idx" ON "date_plans"("proposed_by_id");

-- CreateIndex
CREATE INDEX "weekly_reports_user_id_idx" ON "weekly_reports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_user_id_week_start_key" ON "weekly_reports"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_idx" ON "analytics_events"("event");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_event_idx" ON "analytics_events"("user_id", "event");

-- CreateIndex
CREATE INDEX "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");

-- CreateIndex
CREATE INDEX "stories_user_id_created_at_idx" ON "stories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "stories_expires_at_idx" ON "stories"("expires_at");

-- CreateIndex
CREATE INDEX "story_views_story_id_idx" ON "story_views"("story_id");

-- CreateIndex
CREATE INDEX "story_views_viewer_id_idx" ON "story_views"("viewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_views_story_id_viewer_id_key" ON "story_views"("story_id", "viewer_id");

-- CreateIndex
CREATE INDEX "story_likes_story_id_idx" ON "story_likes"("story_id");

-- CreateIndex
CREATE INDEX "story_likes_user_id_idx" ON "story_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "story_likes_story_id_user_id_key" ON "story_likes"("story_id", "user_id");

-- CreateIndex
CREATE INDEX "user_follows_follower_id_idx" ON "user_follows"("follower_id");

-- CreateIndex
CREATE INDEX "user_follows_following_id_idx" ON "user_follows"("following_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");

-- CreateIndex
CREATE INDEX "posts_user_id_created_at_idx" ON "posts"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "post_likes_post_id_idx" ON "post_likes"("post_id");

-- CreateIndex
CREATE INDEX "post_likes_user_id_idx" ON "post_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_post_id_user_id_key" ON "post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "call_history_caller_id_created_at_idx" ON "call_history"("caller_id", "created_at");

-- CreateIndex
CREATE INDEX "call_history_receiver_id_created_at_idx" ON "call_history"("receiver_id", "created_at");

-- CreateIndex
CREATE INDEX "call_history_match_id_created_at_idx" ON "call_history"("match_id", "created_at");

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
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_a_id_fkey" FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_user_b_id_fkey" FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couple_badges" ADD CONSTRAINT "couple_badges_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples_club_participants" ADD CONSTRAINT "couples_club_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "couples_club_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "couples_club_participants" ADD CONSTRAINT "couples_club_participants_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_check_ins" ADD CONSTRAINT "place_check_ins_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "discovered_places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_check_ins" ADD CONSTRAINT "place_check_ins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "compatibility_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_question_answers" ADD CONSTRAINT "daily_question_answers_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icebreaker_sessions" ADD CONSTRAINT "icebreaker_sessions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icebreaker_answers" ADD CONSTRAINT "icebreaker_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "icebreaker_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "icebreaker_answers" ADD CONSTRAINT "icebreaker_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_prompts" ADD CONSTRAINT "profile_prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_favorite_spots" ADD CONSTRAINT "user_favorite_spots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_boosts" ADD CONSTRAINT "profile_boosts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_streaks" ADD CONSTRAINT "login_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_plans" ADD CONSTRAINT "date_plans_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_plans" ADD CONSTRAINT "date_plans_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_fkey" FOREIGN KEY ("story_id") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_history" ADD CONSTRAINT "call_history_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_history" ADD CONSTRAINT "call_history_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_history" ADD CONSTRAINT "call_history_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

