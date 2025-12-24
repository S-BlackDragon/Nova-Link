import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import AdmZip from 'adm-zip';

export type JavaVersion = 8 | 17 | 21;

const JAVA_URLS: Record<JavaVersion, string> = {
    8: 'https://aka.ms/download-jdk/microsoft-jdk-8u412-windows-x64.zip',
    17: 'https://aka.ms/download-jdk/microsoft-jdk-17.0.11-windows-x64.zip',
    21: 'https://aka.ms/download-jdk/microsoft-jdk-21.0.3-windows-x64.zip'
};

export async function ensureJava(version: JavaVersion, event: any): Promise<string> {
    const runtimesPath = path.join(app.getPath('userData'), 'runtimes');
    const javaInstallDir = path.join(runtimesPath, `java-${version}`);

    // Check if we already have the executable known/cached
    // Since ZIP extraction creates a subfolder, we search for bin/javaw.exe
    if (fs.existsSync(javaInstallDir)) {
        const executable = findJavaExecutable(javaInstallDir);
        if (executable) {
            event.sender.send('launcher-log', `[Java Manager] Using managed Java ${version}: ${executable}`);
            return executable;
        }
    }

    // Download
    if (!fs.existsSync(runtimesPath)) fs.mkdirSync(runtimesPath, { recursive: true });

    const url = JAVA_URLS[version];
    const zipPath = path.join(runtimesPath, `java-${version}.zip`);

    event.sender.send('launcher-log', `[Java Manager] Downloading Java ${version} Runtime... (This may take a minute)`);

    try {
        const writer = fs.createWriteStream(zipPath);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        // Track download progress if possible?
        // response.data.pipe(writer);
        // Implementing simple pipe

        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            let error: any = null;
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) resolve(true);
            });
        });

        event.sender.send('launcher-log', `[Java Manager] Extracting Java ${version}...`);

        // Extract
        const zip = new AdmZip(zipPath);
        // We extract to javaInstallDir (e.g. .../runtimes/java-21/)
        // The zip usually contains a root folder "jdk-21..."
        zip.extractAllTo(javaInstallDir, true);

        // Cleanup zip
        fs.unlinkSync(zipPath);

        const executable = findJavaExecutable(javaInstallDir);
        if (!executable) {
            throw new Error('Downloaded Java but could not find bin/javaw.exe in extracted files.');
        }

        event.sender.send('launcher-log', `[Java Manager] Java ${version} installed successfully.`);
        return executable;

    } catch (err) {
        event.sender.send('launcher-log', `[Java Manager] Failed to install Java ${version}: ${err}`);
        throw err;
    }
}

function findJavaExecutable(dir: string): string | null {
    // Search recursively for bin/javaw.exe
    // Usually it is at root/bin/javaw.exe OR root/jdk-xxx/bin/javaw.exe
    if (!fs.existsSync(dir)) return null;

    const files = fs.readdirSync(dir);

    // Check if current dir has bin/javaw.exe
    const localBin = path.join(dir, 'bin', 'javaw.exe');
    if (fs.existsSync(localBin)) return localBin;

    // Check subdirectories
    for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
            const subBin = path.join(full, 'bin', 'javaw.exe');
            if (fs.existsSync(subBin)) return subBin;

            // Should we go deeper? Usually depth 1 is enough for JDK zips.
        }
    }
    return null;
}
