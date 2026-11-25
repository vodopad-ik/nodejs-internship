-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification"."NotificationType" ADD VALUE 'FOLLOW_REQUEST';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'GROUP_CHAT_CREATED';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'NEW_POST';
ALTER TYPE "notification"."NotificationType" ADD VALUE 'MENTION';

-- DropForeignKey
ALTER TABLE "main"."messages" DROP CONSTRAINT "messages_reply_to_message_id_fkey";

-- AlterTable
ALTER TABLE "main"."chats" ADD COLUMN     "description" TEXT,
ADD COLUMN     "direct_key" TEXT;

-- AlterTable
ALTER TABLE "main"."message_assets" ADD COLUMN     "order_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "main"."messages" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_edited" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "main"."profile_configurations" ADD COLUMN     "is_disabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "chat_participants_chat_id_idx" ON "main"."chat_participants"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "chats_direct_key_key" ON "main"."chats"("direct_key");

-- CreateIndex
CREATE INDEX "chats_updated_at_idx" ON "main"."chats"("updated_at" DESC);

-- AddForeignKey
ALTER TABLE "main"."messages" ADD CONSTRAINT "messages_reply_to_message_id_fkey" FOREIGN KEY ("reply_to_message_id") REFERENCES "main"."messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

