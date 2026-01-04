-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "error" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_dedupeKey_key" ON "EmailLog"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_kind_idx" ON "EmailLog"("kind");

-- CreateIndex
CREATE INDEX "EmailLog_to_idx" ON "EmailLog"("to");
