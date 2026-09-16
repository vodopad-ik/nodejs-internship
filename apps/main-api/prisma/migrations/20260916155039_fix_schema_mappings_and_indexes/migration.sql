/*
  Warnings:

  - You are about to drop the column `isAdressed` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `chat_participants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `user_id` on the `chat_participants` table. All the data in the column will be lost.
  - You are about to drop the column `isGroup` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `isArchived` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `profileId` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `avatarUrl` on the `profiles` table. All the data in the column will be lost.
  - Added the required column `profile_id` to the `chat_participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "main"."chat_participants" DROP CONSTRAINT "chat_participants_user_id_fkey";

-- DropForeignKey
ALTER TABLE "main"."posts" DROP CONSTRAINT "posts_profileId_fkey";

-- AlterTable
ALTER TABLE "auth"."accounts" ADD COLUMN     "provider_id" TEXT;

-- AlterTable
ALTER TABLE "main"."audit_logs" DROP COLUMN "isAdressed",
ADD COLUMN     "is_adressed" TEXT;

-- AlterTable
ALTER TABLE "main"."chat_participants" DROP CONSTRAINT "chat_participants_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "profile_id" TEXT NOT NULL,
ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("profile_id", "chat_id");

-- AlterTable
ALTER TABLE "main"."chats" DROP COLUMN "isGroup",
ADD COLUMN     "is_group" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "main"."posts" DROP COLUMN "isArchived",
DROP COLUMN "profileId",
ADD COLUMN     "is_archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "main"."profiles" DROP COLUMN "avatarUrl",
ADD COLUMN     "avatar_url" TEXT;

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "main"."comments"("post_id");

-- CreateIndex
CREATE INDEX "comments_profile_id_idx" ON "main"."comments"("profile_id");

-- CreateIndex
CREATE INDEX "comments_parent_comment_id_idx" ON "main"."comments"("parent_comment_id");

-- CreateIndex
CREATE INDEX "messages_chat_id_created_at_idx" ON "main"."messages"("chat_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_profile_id_created_at_idx" ON "main"."posts"("profile_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "main"."posts" ADD CONSTRAINT "posts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main"."chat_participants" ADD CONSTRAINT "chat_participants_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "main"."profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
