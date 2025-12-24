"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModpacksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const modrinth_service_1 = require("../modrinth/modrinth.service");
let ModpacksService = class ModpacksService {
    prisma;
    modrinthService;
    constructor(prisma, modrinthService) {
        this.prisma = prisma;
        this.modrinthService = modrinthService;
    }
    create(createModpackDto) {
        return this.prisma.modpack.create({
            data: {
                name: createModpackDto.name,
                description: createModpackDto.description,
                authorId: createModpackDto.authorId,
            },
        });
    }
    async publishVersion(id, publishVersionDto) {
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
    findByUser(userId) {
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
    async findSharedByUser(userId) {
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
            .filter((mp) => mp !== null && mp.authorId !== userId);
        const modpackMap = new Map();
        targetedByGroups.forEach(mp => modpackMap.set(mp.id, mp));
        return Array.from(modpackMap.values());
    }
    findOne(id) {
        return this.prisma.modpack.findUnique({
            where: { id },
            include: {
                versions: {
                    include: { mods: true }
                }
            },
        });
    }
    update(id, updateModpackDto) {
        return this.prisma.modpack.update({
            where: { id },
            data: updateModpackDto,
        });
    }
    async addMod(versionId, modData) {
        const version = await this.prisma.modpackVersion.findUnique({
            where: { id: versionId }
        });
        if (!version)
            throw new Error('Version not found');
        const existingMods = await this.prisma.mod.findMany({
            where: { modpackVersionId: versionId }
        });
        const installedModIds = new Set(existingMods.map(m => m.modrinthId));
        const initialProject = await this.modrinthService.getProject(modData.modrinthId);
        if (!initialProject)
            throw new Error(`Could not find mod ${modData.modrinthId}`);
        const canonicalId = initialProject.id;
        console.log(`[AddMod] Initial mod: ${modData.modrinthId} resolved to canonical: ${canonicalId}`);
        const queue = [canonicalId];
        const modsToAdd = new Map();
        modsToAdd.set(canonicalId, {
            modrinthId: canonicalId,
            name: initialProject.title,
            iconUrl: initialProject.icon_url,
            versionId: modData.versionId,
            projectType: initialProject.project_type
        });
        const processed = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId)
                continue;
            console.log(`[AddMod] Processing mod ${currentId}`);
            if (installedModIds.has(currentId) || processed.has(currentId)) {
                console.log(`[AddMod] Skipping ${currentId} - already present (current matches canonical project ID)`);
                continue;
            }
            processed.add(currentId);
            try {
                console.log(`[AddMod] Fetching versions for canonical ${currentId} (game: ${version.gameVersion}, loader: ${version.loaderType})`);
                const projectVersions = await this.modrinthService.getProjectVersions(currentId, version.gameVersion || undefined, version.loaderType || undefined);
                let targetVersion = null;
                const queuedData = modsToAdd.get(currentId);
                if (queuedData?.versionId) {
                    targetVersion = projectVersions.find((v) => v.id === queuedData.versionId);
                }
                if (!targetVersion && projectVersions.length > 0) {
                    targetVersion = projectVersions[0];
                }
                if (!targetVersion) {
                    console.warn(`[AddMod] No compatible version found for mod ${currentId}`);
                    continue;
                }
                console.log(`[AddMod] Selected version ${targetVersion.id} for ${currentId}, deps: ${targetVersion.dependencies?.length || 0}`);
                const primaryFile = targetVersion.files.find((f) => f.primary) || targetVersion.files[0];
                const fileMetadata = primaryFile ? {
                    url: primaryFile.url,
                    filename: primaryFile.filename,
                    sha1: primaryFile.hashes?.sha1,
                    size: primaryFile.size
                } : {};
                if (!queuedData) {
                    const project = await this.modrinthService.getProject(currentId);
                    modsToAdd.set(currentId, {
                        modrinthId: currentId,
                        name: project.title,
                        iconUrl: project.icon_url,
                        versionId: targetVersion.id,
                        projectType: project.project_type,
                        ...fileMetadata
                    });
                }
                else {
                    queuedData.versionId = targetVersion.id;
                    Object.assign(queuedData, fileMetadata);
                    modsToAdd.set(currentId, queuedData);
                }
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
            }
            catch (err) {
                console.error(`[AddMod] Failed to resolve dependency ${currentId}:`, err);
            }
        }
        const createdMods = [];
        for (const mod of modsToAdd.values()) {
            if (installedModIds.has(mod.modrinthId))
                continue;
            const created = await this.prisma.mod.create({
                data: {
                    modpackVersionId: versionId,
                    modrinthId: mod.modrinthId,
                    name: mod.name,
                    versionId: mod.versionId,
                    iconUrl: mod.iconUrl,
                    projectType: mod.projectType,
                    filename: mod.filename,
                    url: mod.url,
                    sha1: mod.sha1,
                    size: mod.size,
                },
            });
            createdMods.push(created);
            installedModIds.add(mod.modrinthId);
        }
        return createdMods;
    }
    async removeMod(modId) {
        return this.prisma.mod.delete({
            where: { id: modId },
        });
    }
    async toggleMod(modId, enabled) {
        return this.prisma.mod.update({
            where: { id: modId },
            data: { enabled }
        });
    }
    async remove(id) {
        await this.prisma.modpackVersion.deleteMany({ where: { modpackId: id } });
        return this.prisma.modpack.delete({ where: { id } });
    }
};
exports.ModpacksService = ModpacksService;
exports.ModpacksService = ModpacksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        modrinth_service_1.ModrinthService])
], ModpacksService);
//# sourceMappingURL=modpacks.service.js.map