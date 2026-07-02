-- Rename money to coins, subscribers to gems on Player table
ALTER TABLE "Player" RENAME COLUMN "money" TO "coins";
ALTER TABLE "Player" RENAME COLUMN "subscribers" TO "gems";
-- Set all existing rows to 20 gems and update the default
UPDATE "Player" SET "gems" = 100;
ALTER TABLE "Player" ALTER COLUMN "gems" SET DEFAULT 100;
