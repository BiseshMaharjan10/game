/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the `AuthSession` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[firebaseUid]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firebaseUid` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuthSession" DROP CONSTRAINT "AuthSession_playerId_fkey";

-- AlterTable
ALTER TABLE "Player" DROP COLUMN "passwordHash",
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "firebaseUid" TEXT NOT NULL,
ADD COLUMN     "profilePicture" TEXT,
ALTER COLUMN "username" DROP NOT NULL;

-- DropTable
DROP TABLE "AuthSession";

-- CreateIndex
CREATE UNIQUE INDEX "Player_firebaseUid_key" ON "Player"("firebaseUid");
