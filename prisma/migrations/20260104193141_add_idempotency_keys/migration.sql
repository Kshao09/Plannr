-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'PENDING',
    "statusCode" INTEGER,
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyKey_userId_idx" ON "IdempotencyKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_route_key_key" ON "IdempotencyKey"("route", "key");
