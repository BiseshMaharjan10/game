-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_playerId_scenarioId_key" ON "NewsArticle"("playerId", "scenarioId");

-- CreateIndex
CREATE INDEX "NewsArticle_roomId_idx" ON "NewsArticle"("roomId");

-- CreateIndex
CREATE INDEX "NewsArticle_playerId_idx" ON "NewsArticle"("playerId");
