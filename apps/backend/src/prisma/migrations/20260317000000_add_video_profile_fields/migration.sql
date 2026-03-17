-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "video_url" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "video_key" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "video_thumbnail_url" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "video_duration" INTEGER DEFAULT 0;
