-- AlterTable ModpackVersion
ALTER TABLE "ModpackVersion" ADD COLUMN IF NOT EXISTS "manifestJson" JSONB;
ALTER TABLE "ModpackVersion" ADD COLUMN IF NOT EXISTS "gameVersion" TEXT;
ALTER TABLE "ModpackVersion" ADD COLUMN IF NOT EXISTS "loaderType" TEXT;
ALTER TABLE "ModpackVersion" ADD COLUMN IF NOT EXISTS "loaderVersion" TEXT;
ALTER TABLE "ModpackVersion" ADD COLUMN IF NOT EXISTS "overridesKey" TEXT;

-- AlterTable Mod
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "filename" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "sha1" TEXT;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "size" INTEGER;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "side" TEXT NOT NULL DEFAULT 'both';
-- projectType might already be there from 20251221195702_add_project_type but good to be safe/consistent if re-running
ALTER TABLE "Mod" ADD COLUMN IF NOT EXISTS "projectType" TEXT NOT NULL DEFAULT 'mod';
