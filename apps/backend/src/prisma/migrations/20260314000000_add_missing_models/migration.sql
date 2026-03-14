-- LUMA V1 — Add Missing Models Migration
-- Creates 8 missing tables: ProfilePrompt, ProfileBoost, LoginStreak,
-- DailyPick, FeedView, DatePlan, WeeklyReport, AnalyticsEvent
-- Adds missing interestTags column to user_profiles

-- ============================================================
-- 1. ADD MISSING ENUM TYPES
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "DatePlanStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================

-- user_profiles: interestTags (String[] with default empty array)
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "interest_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============================================================
-- 3. CREATE MISSING TABLES
-- ============================================================

-- ProfilePrompt table
CREATE TABLE IF NOT EXISTS "profile_prompts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question" VARCHAR(200) NOT NULL,
    "answer" VARCHAR(300) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_prompts_pkey" PRIMARY KEY ("id")
);

-- ProfileBoost table
CREATE TABLE IF NOT EXISTS "profile_boosts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "gold_spent" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profile_boosts_pkey" PRIMARY KEY ("id")
);

-- LoginStreak table
CREATE TABLE IF NOT EXISTS "login_streaks" (
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

-- DailyPick table
CREATE TABLE IF NOT EXISTS "daily_picks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "picked_user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "is_liked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_picks_pkey" PRIMARY KEY ("id")
);

-- FeedView table
CREATE TABLE IF NOT EXISTS "feed_views" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "viewed_user_id" UUID NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_views_pkey" PRIMARY KEY ("id")
);

-- DatePlan table
CREATE TABLE IF NOT EXISTS "date_plans" (
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

-- WeeklyReport table
CREATE TABLE IF NOT EXISTS "weekly_reports" (
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

-- AnalyticsEvent table
CREATE TABLE IF NOT EXISTS "analytics_events" (
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

-- ============================================================
-- 4. CREATE INDEXES
-- ============================================================

-- profile_prompts indexes
CREATE UNIQUE INDEX IF NOT EXISTS "profile_prompts_user_id_order_key" ON "profile_prompts"("user_id", "order");
CREATE INDEX IF NOT EXISTS "profile_prompts_user_id_idx" ON "profile_prompts"("user_id");

-- profile_boosts indexes
CREATE INDEX IF NOT EXISTS "profile_boosts_user_id_is_active_idx" ON "profile_boosts"("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "profile_boosts_ends_at_idx" ON "profile_boosts"("ends_at");

-- login_streaks indexes
CREATE UNIQUE INDEX IF NOT EXISTS "login_streaks_user_id_key" ON "login_streaks"("user_id");

-- daily_picks indexes
CREATE UNIQUE INDEX IF NOT EXISTS "daily_picks_user_id_picked_user_id_date_key" ON "daily_picks"("user_id", "picked_user_id", "date");
CREATE INDEX IF NOT EXISTS "daily_picks_user_id_date_idx" ON "daily_picks"("user_id", "date");

-- feed_views indexes
CREATE INDEX IF NOT EXISTS "feed_views_user_id_viewed_at_idx" ON "feed_views"("user_id", "viewed_at");
CREATE INDEX IF NOT EXISTS "feed_views_user_id_viewed_user_id_idx" ON "feed_views"("user_id", "viewed_user_id");

-- date_plans indexes
CREATE INDEX IF NOT EXISTS "date_plans_match_id_status_idx" ON "date_plans"("match_id", "status");
CREATE INDEX IF NOT EXISTS "date_plans_proposed_by_id_idx" ON "date_plans"("proposed_by_id");

-- weekly_reports indexes
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_reports_user_id_week_start_key" ON "weekly_reports"("user_id", "week_start");
CREATE INDEX IF NOT EXISTS "weekly_reports_user_id_idx" ON "weekly_reports"("user_id");

-- analytics_events indexes
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events"("user_id");
CREATE INDEX IF NOT EXISTS "analytics_events_event_idx" ON "analytics_events"("event");
CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events"("created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_event_idx" ON "analytics_events"("user_id", "event");
CREATE INDEX IF NOT EXISTS "analytics_events_event_created_at_idx" ON "analytics_events"("event", "created_at");

-- ============================================================
-- 5. ADD FOREIGN KEYS
-- ============================================================

-- profile_prompts foreign keys
ALTER TABLE "profile_prompts" ADD CONSTRAINT "profile_prompts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- profile_boosts foreign keys
ALTER TABLE "profile_boosts" ADD CONSTRAINT "profile_boosts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- login_streaks foreign keys
ALTER TABLE "login_streaks" ADD CONSTRAINT "login_streaks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- date_plans foreign keys
ALTER TABLE "date_plans" ADD CONSTRAINT "date_plans_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "date_plans" ADD CONSTRAINT "date_plans_proposed_by_id_fkey"
    FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- weekly_reports foreign keys
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- analytics_events foreign keys
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
