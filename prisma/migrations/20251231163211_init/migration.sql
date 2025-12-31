/*
  Warnings:

  - A unique constraint covering the columns `[checkInCode]` on the table `RSVP` will be added. If there are existing duplicate values, this will fail.
  - The required column `checkInSecret` was added to the `Event` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `checkInCode` was added to the `RSVP` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "AttendanceState" AS ENUM ('CONFIRMED', 'WAITLISTED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "checkInSecret" TEXT NOT NULL,
ADD COLUMN     "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "RSVP" ADD COLUMN     "attendanceState" "AttendanceState" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "checkInCode" TEXT NOT NULL,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "reminder1hSentAt" TIMESTAMP(3),
ADD COLUMN     "reminder24hSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "RSVP_checkInCode_key" ON "RSVP"("checkInCode");

-- CreateIndex
CREATE INDEX "RSVP_eventId_status_attendanceState_createdAt_idx" ON "RSVP"("eventId", "status", "attendanceState", "createdAt");
