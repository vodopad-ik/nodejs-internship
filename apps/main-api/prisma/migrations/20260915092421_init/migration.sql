-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "main";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateEnum
CREATE TYPE "auth"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "auth"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

-- CreateEnum
CREATE TYPE "main"."ChatParticipantRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "notification"."NotificationType" AS ENUM ('SYSTEM', 'POST_LIKE', 'COMMENT_LIKE', 'NEW_COMMENT', 'NEW_FOLLOWER', 'CHAT_MESSAGE', 'CUSTOM');

-- CreateTable
CREATE TABLE "auth"."users" (
    "id" TEXT NOT NULL,
    "role" "auth"."Role" NOT NULL DEFAULT 'USER',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "provider" "auth"."AuthProvider" NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "birthday" DATE,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."posts" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "parent_comment_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."assets" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."chats" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."messages" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "reply_to_message_id" TEXT,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."post_assets" (
    "post_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_assets_pkey" PRIMARY KEY ("post_id","asset_id")
);

-- CreateTable
CREATE TABLE "main"."profile_follows" (
    "profile_id" TEXT NOT NULL,
    "follower_id" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_follows_pkey" PRIMARY KEY ("profile_id","follower_id")
);

-- CreateTable
CREATE TABLE "main"."chat_participants" (
    "user_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "role" "main"."ChatParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("user_id","chat_id")
);

-- CreateTable
CREATE TABLE "main"."message_assets" (
    "message_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,

    CONSTRAINT "message_assets_pkey" PRIMARY KEY ("message_id","asset_id")
);

-- CreateTable
CREATE TABLE "main"."post_likes" (
    "post_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("post_id","profile_id")
);

-- CreateTable
CREATE TABLE "main"."comment_likes" (
    "comment_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("comment_id","profile_id")
);

-- CreateTable
CREATE TABLE "main"."profile_configurations" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "profile_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main"."profile_to_profile_configurations" (
    "profile_id" TEXT NOT NULL,
    "configuration_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "profile_to_profile_configurations_pkey" PRIMARY KEY ("profile_id","configuration_id")
);

-- CreateTable
CREATE TABLE "main"."audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "payload" JSONB,
    "isAdressed" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."notifications" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "type" "notification"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "auth"."accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_user_id_provider_key" ON "auth"."accounts"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_provider_key" ON "auth"."accounts"("email", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "main"."profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "main"."profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "profile_configurations_key_key" ON "main"."profile_configurations"("key");

-- CreateIndex
CREATE INDEX "notifications_profile_id_is_read_idx" ON "notification"."notifications"("profile_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_profile_id_created_at_idx" ON "notification"."notifications"("profile_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "auth"."accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."posts" ADD CONSTRAINT "posts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "main"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."comments" ADD CONSTRAINT "comments_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."comments" ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "main"."comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."messages" ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "main"."chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."messages" ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "main"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."post_assets" ADD CONSTRAINT "post_assets_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "main"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."post_assets" ADD CONSTRAINT "post_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "main"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."profile_follows" ADD CONSTRAINT "profile_follows_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."profile_follows" ADD CONSTRAINT "profile_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."chat_participants" ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "main"."chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."chat_participants" ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."message_assets" ADD CONSTRAINT "message_assets_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "main"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."message_assets" ADD CONSTRAINT "message_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "main"."assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."post_likes" ADD CONSTRAINT "post_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."post_likes" ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "main"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."comment_likes" ADD CONSTRAINT "comment_likes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "main"."comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."comment_likes" ADD CONSTRAINT "comment_likes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."profile_to_profile_configurations" ADD CONSTRAINT "profile_to_profile_configurations_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."profile_to_profile_configurations" ADD CONSTRAINT "profile_to_profile_configurations_configuration_id_fkey" FOREIGN KEY ("configuration_id") REFERENCES "main"."profile_configurations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification"."notifications" ADD CONSTRAINT "notifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
