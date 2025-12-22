import axios from 'axios';
import path from 'path';

export interface ModInfo {
    id: number;
    fileId: number;
    fileName: string;
    downloadUrl: string;
}

export interface Manifest {
    modpackName: string;
    versionNumber: string;
    gameVersion: string;
    loaderType: string;
    loaderVersion: string;
    mods: ModInfo[];
}

export class SyncManager {
    private static readonly API_BASE = 'http://127.0.0.1:3000';

    static async getManifest(versionId: string): Promise<Manifest> {
        const response = await axios.get(`${this.API_BASE}/modpacks/versions/${versionId}/manifest`);
        return response.data;
    }

    static async syncModpack(manifest: Manifest, rootPath: string, onProgress: (msg: string) => void) {
        const fs = await import('fs-extra');
        const modsDir = path.join(rootPath, 'mods');

        await fs.ensureDir(modsDir);
        onProgress('Checking mods...');

        for (const mod of manifest.mods) {
            const modPath = path.join(modsDir, mod.fileName);

            if (await fs.pathExists(modPath)) {
                onProgress(`Skipping ${mod.fileName} (already exists)`);
                continue;
            }

            onProgress(`Downloading ${mod.fileName}...`);
            const response = await axios.get(mod.downloadUrl, { responseType: 'arraybuffer' });
            await fs.writeFile(modPath, Buffer.from(response.data));
        }

        onProgress('Sync complete!');
    }
}
