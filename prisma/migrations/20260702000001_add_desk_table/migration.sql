-- Create Desk table for persistent desk assignments
CREATE TABLE "Desk" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "deskIndex" INTEGER NOT NULL,
  "assignedCharacterId" TEXT,
  "unlocked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Desk_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on (playerId, deskIndex)
CREATE UNIQUE INDEX "Desk_playerId_deskIndex_key" ON "Desk"("playerId", "deskIndex");

-- Index for player lookups
CREATE INDEX "Desk_playerId_idx" ON "Desk"("playerId");

-- Foreign key to Player
ALTER TABLE "Desk" ADD CONSTRAINT "Desk_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE;
