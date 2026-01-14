-- CreateEnum
CREATE TYPE "TicketTier" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ticketTier" "TicketTier" NOT NULL DEFAULT 'FREE';
