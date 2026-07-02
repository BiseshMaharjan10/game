-- Create PlayerCharacter table (playerId-based ownership)
CREATE TABLE "PlayerCharacter" (
  "id" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerCharacter_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on (playerId, characterId)
CREATE UNIQUE INDEX "PlayerCharacter_playerId_characterId_key" ON "PlayerCharacter"("playerId", "characterId");

-- Index for player lookups
CREATE INDEX "PlayerCharacter_playerId_idx" ON "PlayerCharacter"("playerId");

-- Foreign key to Player
ALTER TABLE "PlayerCharacter" ADD CONSTRAINT "PlayerCharacter_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE;

-- Migrate existing journalist data into character ownership
INSERT INTO "PlayerCharacter" ("id", "playerId", "characterId", "quantity", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  c."ownerId",
  LOWER(j."name"),
  COUNT(*)::int,
  MIN(j."createdAt"),
  NOW()
FROM "Journalist" j
INNER JOIN "Company" c ON c."id" = j."companyId"
GROUP BY c."ownerId", LOWER(j."name");

-- Drop old Journalist table
DROP TABLE "Journalist";
