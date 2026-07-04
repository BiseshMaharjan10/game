-- DropForeignKey
ALTER TABLE "Desk" DROP CONSTRAINT "Desk_playerId_fkey";

-- DropForeignKey
ALTER TABLE "PlayerCharacter" DROP CONSTRAINT "PlayerCharacter_playerId_fkey";

-- AlterTable
ALTER TABLE "Desk" ADD COLUMN     "cost" INTEGER NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "trustScore" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "CharacterTemplate" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "skill" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "influence" INTEGER NOT NULL DEFAULT 0,
    "timeliness" INTEGER NOT NULL DEFAULT 0,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'junior',
    "recruitCoins" INTEGER NOT NULL DEFAULT 0,
    "recruitGems" INTEGER NOT NULL DEFAULT 0,
    "recurringCost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationSnapshot" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "headline" TEXT NOT NULL DEFAULT '',
    "anonymousTip" TEXT NOT NULL DEFAULT '',
    "backgroundNews" JSONB NOT NULL DEFAULT '[]',
    "discoveredEvidence" JSONB NOT NULL DEFAULT '[]',
    "witnessStatements" JSONB NOT NULL DEFAULT '[]',
    "generatedArticleBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestigationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judgement" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "geminiAnalysis" JSONB NOT NULL DEFAULT '{}',
    "backendScore" INTEGER NOT NULL DEFAULT 0,
    "finalVerdict" TEXT NOT NULL DEFAULT '',
    "judgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Judgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationSnapshot_articleId_key" ON "InvestigationSnapshot"("articleId");

-- CreateIndex
CREATE INDEX "InvestigationSnapshot_playerId_idx" ON "InvestigationSnapshot"("playerId");

-- CreateIndex
CREATE INDEX "InvestigationSnapshot_scenarioId_idx" ON "InvestigationSnapshot"("scenarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Judgement_articleId_key" ON "Judgement"("articleId");

-- CreateIndex
CREATE INDEX "Judgement_playerId_idx" ON "Judgement"("playerId");

-- CreateIndex
CREATE INDEX "Judgement_scenarioId_idx" ON "Judgement"("scenarioId");

-- CreateIndex
CREATE INDEX "Judgement_roomId_idx" ON "Judgement"("roomId");

-- AddForeignKey
ALTER TABLE "Desk" ADD CONSTRAINT "Desk_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCharacter" ADD CONSTRAINT "PlayerCharacter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
