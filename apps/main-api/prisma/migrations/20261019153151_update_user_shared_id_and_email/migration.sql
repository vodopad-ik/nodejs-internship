/*
  Warnings:

  - You are about to drop the column `created_by` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `accounts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "auth"."accounts" DROP CONSTRAINT "accounts_user_id_fkey";

-- AlterTable
ALTER TABLE "auth"."users" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "email" TEXT NOT NULL;

-- DropTable
DROP TABLE "auth"."accounts";

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth"."users"("email");
