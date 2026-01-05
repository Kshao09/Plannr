-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "city" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurrence" "RecurrenceFrequency",
ADD COLUMN     "state" TEXT;

-- CreateIndex
CREATE INDEX "Event_organizerId_startAt_idx" ON "Event"("organizerId", "startAt");

-- CreateIndex
CREATE INDEX "Event_city_state_idx" ON "Event"("city", "state");
