-- Replace username with companyName, drop unique constraint
ALTER TABLE "Player" RENAME COLUMN "username" TO "companyName";
DROP INDEX IF EXISTS "Player_username_key";
ALTER TABLE "Player" DROP CONSTRAINT IF EXISTS "Player_username_key";
