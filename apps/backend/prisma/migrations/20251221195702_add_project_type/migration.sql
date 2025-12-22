-- DropForeignKey
ALTER TABLE "GroupMember" DROP CONSTRAINT "GroupMember_groupId_fkey";

-- DropForeignKey
ALTER TABLE "ModpackVersion" DROP CONSTRAINT "ModpackVersion_modpackId_fkey";

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "modpackVersionId" TEXT NOT NULL,
    "modrinthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "versionId" TEXT,
    "iconUrl" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'mod',
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModpackVersion" ADD CONSTRAINT "ModpackVersion_modpackId_fkey" FOREIGN KEY ("modpackId") REFERENCES "Modpack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_modpackVersionId_fkey" FOREIGN KEY ("modpackVersionId") REFERENCES "ModpackVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
