import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
    constructor(private prisma: PrismaService) { }

    async getManifest(versionId: string) {
        const version = await this.prisma.modpackVersion.findUnique({
            where: { id: versionId },
            include: {
                modpack: true,
                mods: {
                    where: { enabled: true }
                }
            }
        }) as any;

        if (!version) {
            throw new NotFoundException('Version not found');
        }

        // Generate authoritative manifest
        const manifest = {
            versionId: version.id,
            modpackId: version.modpackId,
            modpackName: version.modpack.name,
            versionString: version.versionNumber,
            mcVersion: version.gameVersion,
            loader: version.loaderType,
            loaderVersion: version.loaderVersion,
            overrides: version.overridesKey ? {
                // In a real scenario, this would be a presigned URL or a direct link to the content endpoint
                url: `${process.env.API_BASE_URL || 'http://163.192.96.105:3000'}/sync/overrides/${version.id}`,
            } : null,
            files: version.mods.map((mod: any) => ({
                path: `mods/${mod.filename || `${mod.name}.jar`}`,
                sha1: mod.sha1 || '0000000000000000000000000000000000000000', // Dummy hash if missing
                size: mod.size || 0,
                kind: 'mod',
                projectID: mod.modrinthId,
                versionID: mod.versionId,
                url: mod.url,
            })),
            mods: version.mods, // Required for legacy launch logic
            // If manifestJson exists (pre-calculated snapshot), use that instead as it's static and faster
            ...((version.manifestJson as any) || {})
        };

        return manifest;
    }

    async getOverridesStream(versionId: string) {
        const filePath = await this.getOverridesPath(versionId);
        if (!filePath || !require('fs').existsSync(filePath)) {
            throw new NotFoundException('Overrides not found');
        }
        const { createReadStream } = require('fs');
        const { StreamableFile } = require('@nestjs/common');
        const file = createReadStream(filePath);
        return new StreamableFile(file);
    }

    async getOverridesPath(versionId: string): Promise<string | null> {
        // Simple local storage strategy
        const path = require('path');
        const uploadsDir = path.resolve(process.cwd(), 'uploads', 'overrides');
        return path.join(uploadsDir, `${versionId}.zip`);
    }
    async saveOverrides(versionId: string, file: any) {
        const filePath = await this.getOverridesPath(versionId);
        if (!filePath) throw new Error('Could not determine overrides path');

        const path = require('path');
        const fs = require('fs');
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, file.buffer);

        // Update version to indicate overrides exist
        await this.prisma.modpackVersion.update({
            where: { id: versionId },
            data: { overridesKey: 'local' }
        });

        return { success: true };
    }
}
