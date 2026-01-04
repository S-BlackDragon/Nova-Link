-- AlterTable Mod (Supplementary Fix)
-- These are in a new file because the previous migration was applied before these lines were added.
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "iconUrl" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "author" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "modrinthId" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "curseforgeId" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "versionId" TEXT;
