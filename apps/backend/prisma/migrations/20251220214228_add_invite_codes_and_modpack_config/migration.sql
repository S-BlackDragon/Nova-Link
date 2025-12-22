/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - The required column `inviteCode` was added to the `Group` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "inviteCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ModpackVersion" ADD COLUMN     "gameVersion" TEXT,
ADD COLUMN     "loaderType" TEXT,
ADD COLUMN     "loaderVersion" TEXT,
ALTER COLUMN "manifestUrl" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");
