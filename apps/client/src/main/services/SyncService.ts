import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { EventEmitter } from 'events';

export class SyncService extends EventEmitter {
    private instancesPath: string;
    private abortControllers: Map<string, AbortController> = new Map();

    constructor(userDataPath: string) {
        super();
        this.instancesPath = path.join(userDataPath, 'instances');
        fs.ensureDirSync(this.instancesPath);
    }

    cancelSync(instanceId: string) {
        if (this.abortControllers.has(instanceId)) {
            this.abortControllers.get(instanceId)?.abort();
            this.abortControllers.delete(instanceId);
        }
    }

    async calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(filePath)) return resolve('');

            const hash = crypto.createHash('sha1');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', (err) => reject(err));
        });
    }

    async getLocalState(instanceId: string, rootPath?: string): Promise<any> {
        const baseDir = rootPath ? path.join(rootPath, 'instances') : this.instancesPath;
        const statePath = path.join(baseDir, instanceId, 'novalink-state.json');
        if (fs.existsSync(statePath)) {
            return fs.readJson(statePath);
        }
        return { files: {} };
    }

    async saveLocalState(instanceId: string, state: any, rootPath?: string) {
        const baseDir = rootPath ? path.join(rootPath, 'instances') : this.instancesPath;
        const statePath = path.join(baseDir, instanceId, 'novalink-state.json');
        await fs.writeJson(statePath, state, { spaces: 2 });
    }

    async startSync(instanceId: string, manifest: any, onProgress: (progress: any) => void, token?: string, rootPath?: string) {
        // Setup cancellation
        this.cancelSync(instanceId);
        const controller = new AbortController();
        this.abortControllers.set(instanceId, controller);
        const signal = controller.signal;

        try {
            // Use provided rootPath or default to this.instancesPath
            const baseDir = rootPath ? path.join(rootPath, 'instances') : this.instancesPath;
            const instanceDir = path.join(baseDir, instanceId);
            await fs.ensureDir(instanceDir);

            console.log(`[SyncService] Starting sync for ${instanceId} in ${instanceDir}`);

            if (signal.aborted) throw new Error('Cancelled');

            const localState = await this.getLocalState(instanceId, rootPath);
            const stagingDir = path.join(instanceDir, '.staging');
            await fs.emptyDir(stagingDir);

            onProgress({ status: 'scanning', percent: 0 });

            // 1. Calculate diff
            const manifestFiles = new Map<string, any>();
            for (const f of manifest.files) {
                manifestFiles.set(path.normalize(f.path), f);
            }

            if (signal.aborted) throw new Error('Cancelled');

            const filesToDownload: any[] = [];
            const filesToDelete: string[] = [];

            // Check manifest against local
            for (const [relPath, file] of manifestFiles) {
                if (signal.aborted) throw new Error('Cancelled');
                const localFile = path.join(instanceDir, relPath);
                // Optimization: Trust local state unless force? For now, re-hash if missing or mismatch
                const currentHash = localState.files[relPath] || (fs.existsSync(localFile) ? await this.calculateFileHash(localFile) : '');

                if (currentHash !== file.sha1) {
                    filesToDownload.push(file);
                }
            }

            // Check local against manifest
            for (const trackedPath of Object.keys(localState.files)) {
                if (!manifestFiles.has(path.normalize(trackedPath))) {
                    filesToDelete.push(trackedPath);
                }
            }

            // 2. Download to Staging
            const stagingFilesDir = path.join(stagingDir, 'files');
            await fs.ensureDir(stagingFilesDir);

            let completed = 0;
            const total = filesToDownload.length;

            for (const file of filesToDownload) {
                if (signal.aborted) throw new Error('Cancelled');
                onProgress({ status: 'downloading', percent: total > 0 ? (completed / total) * 100 : 0, file: file.path });

                if (!file.url) {
                    console.warn(`[SyncService] Skipping file with no URL: ${file.path}`);
                    completed++;
                    continue;
                }

                const stagingPath = path.join(stagingFilesDir, file.path);
                await fs.ensureDir(path.dirname(stagingPath));

                // Download with cancellation
                const writer = fs.createWriteStream(stagingPath);
                const response = await axios({
                    url: file.url,
                    method: 'GET',
                    responseType: 'stream',
                    signal,
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });

                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve(true));
                    writer.on('error', reject);
                    signal.addEventListener('abort', () => {
                        writer.destroy();
                        reject(new Error('Cancelled'));
                    });
                });

                if (signal.aborted) throw new Error('Cancelled');

                const downloadedHash = await this.calculateFileHash(stagingPath);
                if (downloadedHash !== file.sha1 && file.sha1 !== '0000000000000000000000000000000000000000') {
                    throw new Error(`Hash mismatch for ${file.path}`);
                }

                completed++;
            }

            // 3. Handle Overrides
            let overrideStagingPath = '';
            if (manifest.overrides && manifest.overrides.url) {
                if (signal.aborted) throw new Error('Cancelled');
                onProgress({ status: 'overrides', percent: 90 });
                const zipPath = path.join(stagingDir, 'overrides.zip');
                overrideStagingPath = path.join(stagingDir, 'overrides_extracted');
                await fs.ensureDir(overrideStagingPath);

                const writer = fs.createWriteStream(zipPath);
                const response = await axios({
                    url: manifest.overrides.url,
                    method: 'GET',
                    responseType: 'stream',
                    signal,
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                response.data.pipe(writer);

                await new Promise((resolve, reject) => {
                    writer.on('finish', () => resolve(true));
                    writer.on('error', reject);
                    signal.addEventListener('abort', () => {
                        writer.destroy();
                        reject(new Error('Cancelled'));
                    });
                });

                if (signal.aborted) throw new Error('Cancelled');
                const zip = new AdmZip(zipPath);
                zip.extractAllTo(overrideStagingPath, true);
            }

            // 4. Finalize
            if (signal.aborted) throw new Error('Cancelled');

            // Move files
            for (const file of filesToDownload) {
                const src = path.join(stagingFilesDir, file.path);
                const dest = path.join(instanceDir, file.path);
                await fs.ensureDir(path.dirname(dest));
                await fs.move(src, dest, { overwrite: true });
                localState.files[file.path] = file.sha1;
            }

            // Delete files
            for (const delPath of filesToDelete) {
                const fullPath = path.join(instanceDir, delPath);
                if (fs.existsSync(fullPath)) await fs.unlink(fullPath);
                delete localState.files[delPath];
            }

            // Copy overrides
            if (overrideStagingPath && fs.existsSync(overrideStagingPath)) {
                try {
                    await fs.copy(overrideStagingPath, instanceDir, { overwrite: true });
                } catch (e) {
                    console.error("Failed to copy overrides", e);
                }
            }

            // Save state
            localState.targetVersionId = manifest.versionId;
            localState.lastSyncedAt = new Date().toISOString();
            await this.saveLocalState(instanceId, localState, rootPath);

            onProgress({ status: 'completed', percent: 100 });
        } catch (error: any) {
            if (error.message === 'Cancelled' || axios.isCancel(error)) {
                console.log(`Sync cancelled for ${instanceId}`);
                onProgress({ status: 'error', error: 'Cancelled by user' });
            } else {
                console.error(`Sync failed for ${instanceId}:`, error);
                onProgress({ status: 'error', error: error.message });
            }
            throw error;
        } finally {
            // Cleanup staging if it exists
            const baseDir = rootPath ? path.join(rootPath, 'instances') : this.instancesPath;
            const instanceDir = path.join(baseDir, instanceId);
            const stagingDir = path.join(instanceDir, '.staging');
            await fs.remove(stagingDir);

            this.abortControllers.delete(instanceId);
        }
    }
}
