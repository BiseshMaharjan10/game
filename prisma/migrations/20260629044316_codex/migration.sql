/*
  Warnings:

  - Added the required column `choices` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conditions` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "deskAssignments" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "unlockedCharacters" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "choices" JSONB NOT NULL,
ADD COLUMN     "conditions" JSONB NOT NULL,
ADD COLUMN     "repeatable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiredTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "passwordHash" TEXT,
ALTER COLUMN "firebaseUid" DROP NOT NULL;

-- CreateTable
CREATE TABLE "StoryTemplate" (
    "id" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "descriptionTemplate" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variables" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "generatedTitle" TEXT NOT NULL,
    "generatedDescription" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variables" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerState" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "money" INTEGER NOT NULL DEFAULT 1000,
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "evidence" INTEGER NOT NULL DEFAULT 0,
    "investigationProgress" INTEGER NOT NULL DEFAULT 0,
    "journalists" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryState" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'global',
    "economy" INTEGER NOT NULL DEFAULT 50,
    "corruption" INTEGER NOT NULL DEFAULT 50,
    "stability" INTEGER NOT NULL DEFAULT 50,
    "publicTrust" INTEGER NOT NULL DEFAULT 50,
    "currentEvents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHistory" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "storyInstanceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "selectedChoice" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryInstance_templateId_idx" ON "StoryInstance"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerState_playerId_key" ON "PlayerState"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryState_key_key" ON "CountryState"("key");

-- CreateIndex
CREATE INDEX "EventHistory_playerId_idx" ON "EventHistory"("playerId");

-- CreateIndex
CREATE INDEX "EventHistory_storyInstanceId_idx" ON "EventHistory"("storyInstanceId");

-- CreateIndex
CREATE INDEX "EventHistory_eventId_idx" ON "EventHistory"("eventId");

-- AddForeignKey
ALTER TABLE "StoryInstance" ADD CONSTRAINT "StoryInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "StoryTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerState" ADD CONSTRAINT "PlayerState_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHistory" ADD CONSTRAINT "EventHistory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHistory" ADD CONSTRAINT "EventHistory_storyInstanceId_fkey" FOREIGN KEY ("storyInstanceId") REFERENCES "StoryInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHistory" ADD CONSTRAINT "EventHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
