-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
