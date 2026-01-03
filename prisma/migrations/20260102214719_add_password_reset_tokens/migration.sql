/*
  Warnings:

  - You are about to drop the column `usedAt` on the `PasswordResetToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PasswordResetToken" DROP COLUMN "usedAt";
