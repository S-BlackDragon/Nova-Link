import { Injectable } from '@nestjs/common';
import { CreateModpackDto } from './dto/create-modpack.dto';
import { UpdateModpackDto } from './dto/update-modpack.dto';
import { PublishVersionDto } from './dto/publish-version.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ModrinthService } from '../modrinth/modrinth.service';

@Injectable()
export class ModpacksService {
  constructor(
    private prisma: PrismaService,
    private modrinthService: ModrinthService
  ) { }

  create(createModpackDto: CreateModpackDto) {
    return this.prisma.modpack.create({
      data: {
        name: createModpackDto.name,
        description: createModpackDto.description,
        authorId: createModpackDto.authorId,
      },
    });
  }

  async publishVersion(id: string, publishVersionDto: PublishVersionDto) {
    return this.prisma.modpackVersion.create({
      data: {
        modpackId: id,
        versionNumber: publishVersionDto.versionNumber,
        gameVersion: publishVersionDto.gameVersion,
        loaderType: publishVersionDto.loaderType,
        loaderVersion: publishVersionDto.loaderVersion,
        isPublished: true,
      },
    });
  }

  findAll() {
    return this.prisma.modpack.findMany({
      include: {
        author: true,
        versions: {
          orderBy: { createdAt: 'desc' }
        }
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.modpack.findMany({
      where: { authorId: userId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { mods: true }
        }
      },
    });
  }

  async findSharedByUser(userId: string) {
    const groupMemberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            targetModpack: {
              include: {
                versions: {
                  orderBy: { createdAt: 'desc' },
                  include: { mods: true }
                }
              }
            }
          }
        }
      }
    });

    const targetedByGroups = groupMemberships
      .map(m => m.group.targetModpack)
      .filter((mp): mp is any => mp !== null && mp.authorId !== userId);

    // Dedup by ID
    const modpackMap = new Map();
    targetedByGroups.forEach(mp => modpackMap.set(mp.id, mp));

    return Array.from(modpackMap.values());
  }

  findOne(id: string) {
    return this.prisma.modpack.findUnique({
      where: { id },
      include: {
        versions: {
          include: { mods: true }
        }
      },
    });
  }

  update(id: string, updateModpackDto: UpdateModpackDto) {
    return this.prisma.modpack.update({
      where: { id },
      data: updateModpackDto,
    });
  }


  async addMod(versionId: string, modData: any) {
    // 1. Get version details to determine compatibility
    const version = await this.prisma.modpackVersion.findUnique({
      where: { id: versionId }
    });
    if (!version) throw new Error('Version not found');

    // 2. Get currently installed mods to avoid duplicates
    const existingMods = await this.prisma.mod.findMany({
      where: { modpackVersionId: versionId }
    });
    const installedModIds = new Set(existingMods.map(m => m.modrinthId));

    // 3. Resolve the initial mod to its canonical ID
    const initialProject = await this.modrinthService.getProject(modData.modrinthId);
    if (!initialProject) throw new Error(`Could not find mod ${modData.modrinthId}`);
    const canonicalId = initialProject.id;
    console.log(`[AddMod] Initial mod: ${modData.modrinthId} resolved to canonical: ${canonicalId}`);

    // 4. Queue for dependency resolution
    const queue = [canonicalId];
    const modsToAdd = new Map<string, any>();

    // Init with the requested mod (now with canonical ID)
    modsToAdd.set(canonicalId, {
      modrinthId: canonicalId,
      name: initialProject.title,
      iconUrl: initialProject.icon_url,
      versionId: modData.versionId,
      projectType: initialProject.project_type
    });

    const processed = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;

      console.log(`[AddMod] Processing mod ${currentId}`);

      // Skip if already installed or processed in this batch
      if (installedModIds.has(currentId) || processed.has(currentId)) {
        console.log(`[AddMod] Skipping ${currentId} - already present (current matches canonical project ID)`);
        continue;
      }
      processed.add(currentId);

      try {
        // Fetch valid versions for this mod
        console.log(`[AddMod] Fetching versions for canonical ${currentId} (game: ${version.gameVersion}, loader: ${version.loaderType})`);
        const projectVersions = await this.modrinthService.getProjectVersions(
          currentId,
          version.gameVersion || undefined,
          version.loaderType || undefined
        );

        // Find the best version
        let targetVersion = null;
        const queuedData = modsToAdd.get(currentId);

        // If specific version requested (for the main mod), try to find it
        if (queuedData?.versionId) {
          targetVersion = projectVersions.find((v: any) => v.id === queuedData.versionId);
        }

        // Fallback to latest
        if (!targetVersion && projectVersions.length > 0) {
          targetVersion = projectVersions[0];
        }

        if (!targetVersion) {
          console.warn(`[AddMod] No compatible version found for mod ${currentId}`);
          continue;
        }

        console.log(`[AddMod] Selected version ${targetVersion.id} for ${currentId}, deps: ${targetVersion.dependencies?.length || 0}`);

        // Extract file metadata from targetVersion
        const primaryFile = targetVersion.files.find((f: any) => f.primary) || targetVersion.files[0];
        const fileMetadata = primaryFile ? {
          url: primaryFile.url,
          filename: primaryFile.filename,
          sha1: primaryFile.hashes?.sha1,
          size: primaryFile.size
        } : {};

        // Update the mod data with the correct version ID and metadata
        if (!queuedData) {
          // Need to fetch metadata if it's a dependency we discovered
          const project = await this.modrinthService.getProject(currentId);
          modsToAdd.set(currentId, {
            modrinthId: currentId,
            name: project.title,
            iconUrl: project.icon_url,
            versionId: targetVersion.id,
            projectType: project.project_type,
            ...fileMetadata
          });
        } else {
          // Ensure versionId is set correctly on the object
          queuedData.versionId = targetVersion.id;
          Object.assign(queuedData, fileMetadata); // Merge file metadata
          modsToAdd.set(currentId, queuedData);
        }

        // Check for dependencies
        if (targetVersion.dependencies) {
          for (const dep of targetVersion.dependencies) {
            if (dep.dependency_type === 'required' && dep.project_id) {
              console.log(`[AddMod] Found required dependency: ${dep.project_id}`);
              if (!installedModIds.has(dep.project_id) && !processed.has(dep.project_id)) {
                queue.push(dep.project_id);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[AddMod] Failed to resolve dependency ${currentId}:`, err);
        // Continue best effort
      }
    }

    // 4. Batch create all resolved mods
    const createdMods = [];
    for (const mod of modsToAdd.values()) {
      if (installedModIds.has(mod.modrinthId)) continue;

      const created = await this.prisma.mod.create({
        data: {
          modpackVersionId: versionId,
          modrinthId: mod.modrinthId,
          name: mod.name,
          versionId: mod.versionId,
          iconUrl: mod.iconUrl,
          projectType: mod.projectType,
          filename: mod.filename,
          // ...
          url: mod.url,
          sha1: mod.sha1,
          size: mod.size,
        } as any,
      });
      createdMods.push(created);
      installedModIds.add(mod.modrinthId); // Prevent partial duplicates if loop re-runs
    }

    return createdMods;
  }

  async removeMod(modId: string) {
    return this.prisma.mod.delete({
      where: { id: modId },
    });
  }

  async toggleMod(modId: string, enabled: boolean) {
    return this.prisma.mod.update({
      where: { id: modId },
      data: { enabled }
    });
  }

  async remove(id: string) {
    // Delete all versions first
    await this.prisma.modpackVersion.deleteMany({ where: { modpackId: id } });
    // Delete the modpack
    return this.prisma.modpack.delete({ where: { id } });
  }
}
