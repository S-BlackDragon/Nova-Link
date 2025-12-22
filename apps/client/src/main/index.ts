import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import axios from 'axios'
import { updateService } from './update'
import { Auth } from 'msmc'
// Define API Base URL for main process
const API_BASE_URL = 'http://163.192.96.105:3000';

// Global reference to main window for update service
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const runningInstances = new Map<string, any>();

// Global sync function to be used by both launch and standalone sync IPC
async function syncModpackFiles(_event: any, options: any) {
  const fs = require('fs');
  const path = require('path');

  const modpackName = options.modpackName || 'default';
  const safeName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
  const rootBase = options.rootPath || 'C:\\Minecraft';
  const mcPath = path.join(rootBase, 'instances', safeName);
  const modsPath = path.join(mcPath, 'mods');
  const versionsPath = path.join(mcPath, 'versions');
  const resourcepacksPath = path.join(mcPath, 'resourcepacks');
  const shaderpacksPath = path.join(mcPath, 'shaderpacks');
  const datapacksPath = path.join(mcPath, 'datapacks');

  const sendStatus = (status: string, progress?: number) => {
    _event.sender.send('launch-status', { status, progress });
  };

  try {
    // Create necessary directories
    [mcPath, modsPath, versionsPath, resourcepacksPath, shaderpacksPath, datapacksPath].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // 1. Clear old files to avoid conflicts
    [modsPath, resourcepacksPath, shaderpacksPath, datapacksPath].forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.jar') || file.endsWith('.zip')) fs.unlinkSync(path.join(dir, file));
        }
      }
    });

    if (options.versionId) {
      sendStatus('Fetching manifest...', 10);
      const response = await axios.get(`${API_BASE_URL}/modpacks/versions/${options.versionId}/manifest`);
      const manifest = response.data;
      const downloadedMods = new Set<string>();

      const downloadMod = async (modId: string, modName: string) => {
        if (downloadedMods.has(modId)) return;
        downloadedMods.add(modId); // Mark as downloaded immediately to prevent recursion

        try {
          console.log(`[SYNC] Syncing ${modName} (${modId})`);
          const modrinthResponse = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`, {
            params: {
              loaders: JSON.stringify(options.loaderType === 'quilt' ? ['quilt', 'fabric'] : [options.loaderType.toLowerCase()]),
              game_versions: JSON.stringify([options.gameVersion])
            },
            headers: { 'User-Agent': 'NovaLink/1.0.0' },
            timeout: 10000
          });

          if (!modrinthResponse.data || modrinthResponse.data.length === 0) {
            console.warn(`[SYNC] Warning: No version found for mod ${modName} (${modId}) with loader ${options.loaderType} and game version ${options.gameVersion}`);
            return;
          }

          const latestVersion = modrinthResponse.data[0];
          if (latestVersion && latestVersion.files?.[0]) {
            if (latestVersion.dependencies) {
              for (const dep of latestVersion.dependencies) {
                if (dep.dependency_type === 'required' && dep.project_id) {
                  try {
                    const dInfo = await axios.get(`https://api.modrinth.com/v2/project/${dep.project_id}`, {
                      headers: { 'User-Agent': 'NovaLink/1.0.0' },
                      timeout: 10000
                    });
                    await downloadMod(dep.project_id, dInfo.data?.title || dep.project_id);
                  } catch (e) {
                    await downloadMod(dep.project_id, dep.project_id);
                  }
                }
              }
            }

            const file = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];
            const fileName = file.filename || `${modName.replace(/[^a-zA-Z0-9]/g, '-')}.jar`;

            // Determine destination folder based on project type
            let destPath = modsPath;
            if (manifest.mods.find(m => m.modrinthId === modId)?.projectType === 'resourcepack') destPath = resourcepacksPath;
            else if (manifest.mods.find(m => m.modrinthId === modId)?.projectType === 'shader') destPath = shaderpacksPath;
            else if (manifest.mods.find(m => m.modrinthId === modId)?.projectType === 'datapack') destPath = datapacksPath;

            const modFilePath = path.join(destPath, fileName);

            console.log(`[SYNC] Downloading ${fileName} to ${destPath}...`);
            const fResp = await axios.get(file.url, {
              responseType: 'arraybuffer',
              headers: { 'User-Agent': 'NovaLink/1.0.0' },
              timeout: 30000 // Added 30s timeout
            });

            const isMrpack = fileName.toLowerCase().endsWith('.mrpack') || file.url.toLowerCase().endsWith('.mrpack');

            if (isMrpack) {
              console.log(`[SYNC] Detected .mrpack file: ${fileName}. Processing extraction...`);
              // Ensure we use the correct path for adm-zip and other ops
              const AdmZip = require('adm-zip');
              const os = require('os');

              // Save the .mrpack to a temp file
              const tempZipPath = path.join(os.tmpdir(), `novalink-${Date.now()}.mrpack`);
              fs.writeFileSync(tempZipPath, Buffer.from(fResp.data));
              console.log(`[SYNC] Saved temp mrpack to: ${tempZipPath}`);

              try {
                const zip = new AdmZip(tempZipPath);
                const zipEntries = zip.getEntries();
                console.log(`[SYNC] Mrpack contains ${zipEntries.length} entries.`);

                // 1. Process modrinth.index.json
                const indexEntry = zip.getEntry('modrinth.index.json');
                if (indexEntry) {
                  const indexData = JSON.parse(indexEntry.getData().toString('utf8'));

                  console.log(`[SYNC] Found modrinth.index.json. Processing ${indexData.files.length} dependencies...`);

                  for (const mFile of indexData.files) {
                    if (mFile.env?.client === 'unsupported') continue;

                    const fileUrl = mFile.downloads[0];
                    const relPath = mFile.path; // e.g. "mods/fabric-api.jar"
                    // Fix: Ensure we join paths correctly (windows/linux safe)
                    const targetPath = path.join(mcPath, relPath);
                    const targetDir = path.dirname(targetPath);

                    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                    if (!fs.existsSync(targetPath)) {
                      console.log(`[SYNC] Downloading dependency: ${relPath} to ${targetPath}`);
                      try {
                        const depResp = await axios.get(fileUrl, {
                          responseType: 'arraybuffer',
                          headers: { 'User-Agent': 'NovaLink/1.0.4' },
                          timeout: 30000 // Added timeout
                        });
                        fs.writeFileSync(targetPath, Buffer.from(depResp.data));
                      } catch (e: any) {
                        console.error(`[SYNC] Failed to download dependency ${relPath}:`, e.message);
                      }
                    } else {
                      // console.log(`[SYNC] Dependency already exists: ${relPath}`);
                    }
                  }
                } else {
                  console.warn('[SYNC] Warning: modrinth.index.json not found in mrpack.');
                }

                // 2. Extract Overrides and Client-Overrides
                // Standard mrpack has "overrides" folder, some also have "client-overrides" for client-only files
                console.log('[SYNC] Extracting overrides and client-overrides...');
                let overridesCount = 0;
                const overrideFolders = ['overrides/', 'client-overrides/'];

                for (let i = 0; i < zipEntries.length; i++) {
                  const entry = zipEntries[i];
                  const entryName = entry.entryName;

                  // Yield to event loop every 10 items to keep UI responsive
                  if (i % 10 === 0) await new Promise(resolve => setImmediate(resolve));

                  for (const overridePrefix of overrideFolders) {
                    if (entryName.startsWith(overridePrefix) && !entry.isDirectory) {
                      const relPath = entryName.replace(new RegExp(`^${overridePrefix.replace('/', '\\/')}`), '');
                      if (relPath) {
                        const targetPath = path.join(mcPath, relPath);
                        const targetDir = path.dirname(targetPath);

                        try {
                          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
                          // Use async write to prevent main thread blocking
                          await fs.promises.writeFile(targetPath, entry.getData());
                          overridesCount++;
                          console.log(`[SYNC] Extracted override: ${relPath}`);
                        } catch (extractErr: any) {
                          console.error(`[SYNC] Failed to extract ${relPath}:`, extractErr.message);
                        }
                      }
                      break; // Don't process same entry twice
                    }
                  }
                }
                console.log(`[SYNC] Extracted ${overridesCount} override files.`);

              } catch (err: any) {
                console.error('[SYNC] Failed to extract mrpack:', err);
              } finally {
                try {
                  if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
                } catch (cleanupErr) { console.error('Failed to cleanup temp mrpack', cleanupErr); }
              }

            } else {
              // Not an mrpack, treat as a regular mod jar
              await fs.promises.writeFile(modFilePath, Buffer.from(fResp.data));
            }
          }
        } catch (err: any) {
          console.error(`[SYNC] Failed ${modName}:`, err.message);
        }
      };

      // Explicitly check for Fabric OR Quilt loader type to install Fabric API
      if (options.loaderType && (options.loaderType.toLowerCase() === 'fabric' || options.loaderType.toLowerCase() === 'quilt')) {
        console.log(`[SYNC] Detected ${options.loaderType} loader, checking for Fabric API...`);
        await downloadMod('P7dR8mSH', 'Fabric API');
      }

      const mods = manifest.mods || [];
      for (let i = 0; i < mods.length; i++) {
        const baseProgress = 15;
        const maxProgress = 85; // Reserve 85-100 for post-download operations
        const currentProgress = baseProgress + Math.round(((i + 1) / mods.length) * (maxProgress - baseProgress));
        sendStatus(`Downloading mod: ${mods[i].name} (${i + 1}/${mods.length})`, currentProgress);
        await downloadMod(mods[i].modrinthId, mods[i].name);

        // Yield to event loop to keep UI responsive
        if (i % 5 === 0) await new Promise(resolve => setImmediate(resolve));
      }
      sendStatus('Finalizing...', 90);
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to ensure all files are written
      sendStatus('Sync complete!', 100);

      // Send completion signal after brief delay
      setTimeout(() => {
        _event.sender.send('sync-complete');
      }, 100);

      return { success: true, manifest, downloadedMods };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[SYNC] Error:', err);
    return { success: false, error: err.message };
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.novalink.launcher')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('sync-modpack', async (_event, options: any) => {
    return await syncModpackFiles(_event, options);
  });

  ipcMain.handle('launch-minecraft', async (_event, options: any) => {
    const { Client } = require('minecraft-launcher-core');
    const launcher = new Client();
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');

    const modpackName = options.modpackName || 'default';
    const safeName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
    const rootBase = options.rootPath || 'C:\\Minecraft';
    const mcPath = path.join(rootBase, 'instances', safeName);
    const versionsPath = path.join(mcPath, 'versions');

    const sendStatus = (status: string, progress?: number) => {
      _event.sender.send('launch-status', { status, progress });
    };

    const sendError = (error: string) => {
      _event.sender.send('launch-close', 1);
      return { success: false, error };
    };

    try {
      sendStatus('Syncing mods...', 5);
      const syncResult = await syncModpackFiles(_event, options);
      if (!syncResult.success) return sendError(syncResult.error);

      if (options.loaderType === 'fabric') {
        sendStatus('Installing Fabric...', 60);
        const fMeta = await axios.get('https://meta.fabricmc.net/v2/versions/loader', { timeout: 10000 });
        let lVer = options.loaderVersion;
        if (!lVer || lVer === 'latest') lVer = fMeta.data[0]?.version;
        if (!lVer) return sendError('Fabric loader not found');

        const vId = `fabric-loader-${lVer}-${options.gameVersion}`;
        const vDir = path.join(versionsPath, vId);
        if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

        const pResp = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${options.gameVersion}/${lVer}/profile/json`, { timeout: 10000 });
        fs.writeFileSync(path.join(vDir, `${vId}.json`), JSON.stringify(pResp.data, null, 2));
        options.fabricVersionId = vId;
      } else if (options.loaderType === 'quilt') {
        sendStatus('Installing Quilt...', 60);
        const qMeta = await axios.get('https://meta.quiltmc.org/v3/versions/loader', { timeout: 10000 });
        let lVer = options.loaderVersion;
        if (!lVer || lVer === 'latest') lVer = qMeta.data[0]?.version;
        if (!lVer) return sendError('Quilt loader not found');

        const vId = `quilt-loader-${lVer}-${options.gameVersion}`;
        const vDir = path.join(versionsPath, vId);
        if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

        const pResp = await axios.get(`https://meta.quiltmc.org/v3/versions/loader/${options.gameVersion}/${lVer}/profile/json`, { timeout: 10000 });
        fs.writeFileSync(path.join(vDir, `${vId}.json`), JSON.stringify(pResp.data, null, 2));
        options.quiltVersionId = vId;

      } else if (options.loaderType === 'neoforge') {
        sendStatus('Installing NeoForge...', 60);
        try {
          // NeoForge versions usually look like "21.1.65" (for 1.21.1) or "1.20.1-47.1.104" (for older).
          // We'll standardly look for the latest version compatible with the game version from Maven Metadata
          const metadataUrl = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml';
          const metaResp = await axios.get(metadataUrl, { timeout: 10000 });
          const xml = metaResp.data;

          // Simple regex to find versions starting with gameVersion
          // For simplicity in this regex, we find all <version>...</version> tags
          const versionMatches: string[] = Array.from(xml.matchAll(/<version>(.*?)<\/version>/g)).map((m: any) => m[1]);

          let validVersions: string[] = [];
          const gParts = options.gameVersion.split('.');
          const major = gParts[1]; // 20, 21
          const minor = gParts[2] || '0';

          validVersions = versionMatches.filter(v =>
            v.startsWith(options.gameVersion + '-') ||
            (parseInt(major) >= 20 && v.startsWith(`${major}.${minor}.`))
          );

          const latestNeo = validVersions.pop(); // Last one is usually latest in maven-metadata

          if (!latestNeo) throw new Error('Could not find compatible NeoForge version');

          const vId = `neoforge-${latestNeo}`;
          const vDir = path.join(versionsPath, vId);
          if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

          // Fallback: Try downloading the main version json.
          const jsonUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${latestNeo}/neoforge-${latestNeo}.json`;
          console.log(`[NEOFORGE] Fetching JSON: ${jsonUrl}`);

          try {
            const jResp = await axios.get(jsonUrl, { timeout: 10000 });
            const neoJson = jResp.data;
            neoJson.id = vId;
            fs.writeFileSync(path.join(vDir, `${vId}.json`), JSON.stringify(neoJson, null, 2));
            options.neoForgeVersionId = vId;
          } catch (e) {
            console.warn('[NEOFORGE] Failed to get main json, trying distinct client json?');
            throw e;
          }

        } catch (err: any) {
          console.error('[NEOFORGE] Setup failed:', err);
          return sendError('Failed to setup NeoForge: ' + err.message);
        }
      } else if (options.loaderType === 'forge') {
        sendStatus('Installing Forge...', 60);
        try {
          const pResp = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 10000 });
          const latest = pResp.data.promos[`${options.gameVersion}-latest`];
          if (!latest) {
            console.warn('[FORGE] No latest version found, trying to infer...');
          }
          let fVer = null;
          if (latest) {
            fVer = latest.startsWith(options.gameVersion) ? latest : `${options.gameVersion}-${latest}`;
          }

          if (fVer) {
            const vId = `${options.gameVersion}-forge-${latest}`;
            const vDir = path.join(versionsPath, vId);
            if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

            const jsonUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fVer}/forge-${fVer}.json`;
            console.log(`[FORGE] Downloading JSON from ${jsonUrl}`);
            _event.sender.send('launcher-log', `[DEBUG] Forge URL: ${jsonUrl}`);

            let forgeJson: any = null;
            try {
              const jResp = await axios.get(jsonUrl, { timeout: 15000 });
              forgeJson = jResp.data;
            } catch (err) {
              console.warn('[FORGE] JSON download failed, trying Installer JAR fallback...');
              // Fallback: Download Installer JAR and extract version.json
              const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fVer}/forge-${fVer}-installer.jar`;
              const AdmZip = require('adm-zip');
              const os = require('os');
              const tempInstallerPath = path.join(os.tmpdir(), `forge-${fVer}-installer.jar`);

              const iResp = await axios.get(installerUrl, { responseType: 'arraybuffer', timeout: 30000 });
              fs.writeFileSync(tempInstallerPath, Buffer.from(iResp.data));

              const zip = new AdmZip(tempInstallerPath);
              let jsonEntry = zip.getEntry('version.json');
              if (!jsonEntry) jsonEntry = zip.getEntry(`forge-${fVer}.json`); // sometimes it's named differently

              if (jsonEntry) {
                forgeJson = JSON.parse(jsonEntry.getData().toString('utf8'));
              } else {
                throw new Error('Could not find version.json in Forge Installer');
              }

              // Cleanup
              if (fs.existsSync(tempInstallerPath)) fs.unlinkSync(tempInstallerPath);
            }

            if (forgeJson) {
              forgeJson.id = vId;
              fs.writeFileSync(path.join(vDir, `${vId}.json`), JSON.stringify(forgeJson, null, 2));
              options.forgeVersionId = vId;
            } else {
              throw new Error('Failed to obtain Forge Version JSON');
            }
          }
        } catch (err: any) {
          console.error('[FORGE] Setup failed:', err);
          return sendError('Failed to setup Forge: ' + err.message);
        }
      }

      sendStatus('Launching...', 80);
      let auth = options.auth;

      // If no valid auth provided, create offline session
      if (!auth || !auth.access_token || auth.access_token === '0') {
        auth = {
          access_token: '0',
          client_token: crypto.randomUUID(),
          uuid: crypto.randomUUID().replace(/-/g, ''),
          name: options.auth?.name || 'Player',
          user_properties: '{}'
        };
      }

      const opts: any = {
        authorization: auth,
        root: mcPath,
        version: { number: options.gameVersion, type: 'release' },
        memory: { max: options.memory || '4G', min: '2G' },
        overrides: {
          // CRITICAL: Explicit stdio configuration to ensure we capture output
          detached: false,
          windowsHide: true,
          shell: false
        },
        window: {
          width: 1280,
          height: 720
        }
      };

      // Platform-specific adjustments for Windows
      if (process.platform === 'win32') {
        // Force javaw.exe (windowless) instead of java.exe
        // This prevents CMD window while still allowing log capture through pipes
        const javaPath = opts.javaPath || process.env.JAVA_HOME;
        if (javaPath && javaPath.includes('java.exe')) {
          opts.javaPath = javaPath.replace('java.exe', 'javaw.exe');
          _event.sender.send('launcher-log', `[INFO] Using javaw.exe for windowless execution`);
        }

        // Ensure proper spawn options for Windows
        opts.overrides = {
          ...opts.overrides,
          windowsHide: true,
          windowsVerbatimArguments: false,
          detached: false,
          shell: false
        };
      }

      if (options.loaderType === 'fabric' && options.fabricVersionId) opts.version.custom = options.fabricVersionId;
      if (options.loaderType === 'quilt' && options.quiltVersionId) opts.version.custom = options.quiltVersionId;
      if (options.loaderType === 'neoforge' && options.neoForgeVersionId) opts.version.custom = options.neoForgeVersionId;
      if (options.loaderType === 'forge' && options.forgeVersionId) opts.version.custom = options.forgeVersionId;

      launcher.on('debug', (e: any) => _event.sender.send('launcher-log', `[DEBUG] ${e}`));
      launcher.on('data', (e: any) => _event.sender.send('launcher-log', `[DATA] ${e}`));
      launcher.on('progress', (e: any) => {
        const p = 80 + Math.round((e.task / e.total) * 15);
        sendStatus(`Downloading: ${e.type}`, p);
      });
      launcher.on('close', (code: any) => {
        _event.sender.send('launcher-log', `[INFO] Minecraft closed with code: ${code}`);
        _event.sender.send('launch-close', code);
        runningInstances.delete(safeName);
      });
      launcher.on('arguments', () => {
        sendStatus('Running!', 100);
        _event.sender.send('launch-running', { modpackName: options.modpackName });
      });

      _event.sender.send('launcher-log', '[INFO] Launching Minecraft...');
      const child = await launcher.launch(opts);

      // Diagnostic: Log child process info
      _event.sender.send('launcher-log', `[INFO] Java process spawned - PID: ${child.pid}`);
      _event.sender.send('launcher-log', `[INFO] stdout available: ${!!child.stdout}`);
      _event.sender.send('launcher-log', `[INFO] stderr available: ${!!child.stderr}`);

      // CRITICAL: Explicitly capture stdout/stderr for Java logs
      // This is the main way we get Minecraft's runtime logs
      if (child.stdout) {
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (data: any) => {
          const output = data.toString();
          const logLines = output.split('\n').filter((line: string) => line.trim());
          logLines.forEach((line: string) => {
            _event.sender.send('launcher-log', `[JAVA] ${line}`);
          });
        });
        child.stdout.on('error', (err) => {
          _event.sender.send('launcher-log', `[ERROR] stdout error: ${err.message}`);
        });
        _event.sender.send('launcher-log', '[INFO] stdout stream listeners attached');
      } else {
        _event.sender.send('launcher-log', '[WARN] stdout not available for Java process');
      }

      if (child.stderr) {
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (data: any) => {
          const output = data.toString();
          const logLines = output.split('\n').filter((line: string) => line.trim());
          logLines.forEach((line: string) => {
            _event.sender.send('launcher-log', `[JAVA-ERR] ${line}`);
          });
        });
        child.stderr.on('error', (err) => {
          _event.sender.send('launcher-log', `[ERROR] stderr error: ${err.message}`);
        });
        _event.sender.send('launcher-log', '[INFO] stderr stream listeners attached');
      } else {
        _event.sender.send('launcher-log', '[WARN] stderr not available for Java process');
      }

      // Additional logging for process events
      child.on('error', (err) => {
        _event.sender.send('launcher-log', `[ERROR] Child process error: ${err.message}`);
      });

      child.on('exit', (code, signal) => {
        _event.sender.send('launcher-log', `[INFO] Process exited - code: ${code}, signal: ${signal}`);
      });

      runningInstances.set(safeName, child);
      return { success: true };
    } catch (err: any) {
      return sendError(err.message);
    }
  });

  ipcMain.handle('is-instance-running', async (_event, name) => {
    return runningInstances.has(name.replace(/[^a-zA-Z0-9-]/g, '_'));
  });

  ipcMain.handle('stop-instance', async (_event, name) => {
    const sName = name.replace(/[^a-zA-Z0-9-]/g, '_');
    const child = runningInstances.get(sName);
    if (child) {
      const killer = require('tree-kill');
      return new Promise((resolve) => {
        killer(child.pid, 'SIGKILL', (err) => {
          if (err) {
            console.error('[STOP] Failed to kill process tree:', err);
            child.kill('SIGKILL');
          }
          runningInstances.delete(sName);
          resolve({ success: !err });
        });
      });
    }
    return { success: false };
  });

  ipcMain.handle('create-instance', async (_event, { rootPath, modpackName }) => {
    const fs = require('fs');
    const path = require('path');
    const sName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
    const iDir = path.join(rootPath || 'C:\\Minecraft', 'instances', sName);
    ['mods', 'versions', 'libraries', 'config'].forEach(d => {
      const p = path.join(iDir, d);
      if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });
    return { success: true, path: iDir };
  });

  ipcMain.handle('delete-instance', async (_event, { rootPath, modpackName }) => {
    const fs = require('fs');
    const path = require('path');
    const iDir = path.join(rootPath || 'C:\\Minecraft', 'instances', modpackName.replace(/[^a-zA-Z0-9-]/g, '_'));
    if (fs.existsSync(iDir)) fs.rmSync(iDir, { recursive: true, force: true });
    return { success: true };
  });

  ipcMain.handle('get-mc-versions', async () => {
    const r = await axios.get('https://launchermeta.mojang.com/mc/game/version_manifest.json');
    return r.data.versions.filter(v => v.type === 'release').slice(0, 20);
  });

  ipcMain.handle('select-directory', async () => {
    const { dialog } = require('electron');
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });

  ipcMain.handle('open-folder', async (_event, p) => {
    const fs = require('fs');
    if (fs.existsSync(p)) {
      await shell.openPath(p);
      return { success: true };
    }
    return { success: false };
  });

  ipcMain.handle('list-mods', async (_event, { rootPath, modpackName, type = 'mod' }) => {
    const fs = require('fs');
    const path = require('path');
    const sName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');

    let folderName = 'mods';
    if (type === 'resourcepack') folderName = 'resourcepacks';
    else if (type === 'shader') folderName = 'shaderpacks';
    else if (type === 'datapack') folderName = 'datapacks';

    const mDir = path.join(rootPath || 'C:\\Minecraft', 'instances', sName, folderName);

    if (fs.existsSync(mDir)) {
      const files = fs.readdirSync(mDir);
      return files.filter(f => f.endsWith('.jar') || f.endsWith('.zip'));
    }
    return [];
  });

  // IPC Handlers for Updates
  ipcMain.handle('check-for-updates', async () => {
    await updateService.checkForUpdates()
  })

  ipcMain.handle('install-update-now', async () => {
    await updateService.installUpdateNow()
  })

  // Microsoft Authentication Handler
  ipcMain.handle('microsoft-login', async () => {
    try {
      const authManager = new Auth('select_account');

      // Launch Microsoft login window
      const xboxManager = await authManager.launch('electron');

      // Get Minecraft token from Xbox
      const token = await xboxManager.getMinecraft();

      if (!token || !token.mclc) {
        return { success: false, error: 'Failed to get Minecraft token' };
      }

      // Return the auth object compatible with minecraft-launcher-core
      return {
        success: true,
        auth: token.mclc(),
        profile: {
          name: token.profile?.name || 'Player',
          uuid: token.profile?.id
        }
      };
    } catch (err: any) {
      console.error('Microsoft login failed:', err);
      return { success: false, error: err.message || 'Microsoft login failed' };
    }
  });

  ipcMain.handle('quit-app', async () => {
    app.quit()
  })

  createWindow()

  // Initialize update service after window is created
  if (mainWindow) {
    updateService.initialize(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      if (mainWindow) {
        updateService.initialize(mainWindow)
      }
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Cleanup before quit (important for updates)
app.on('before-quit', async (event) => {
  // Stop all running Minecraft instances to prevent file locks
  const killer = require('tree-kill')

  for (const [_, child] of runningInstances) {
    try {
      event.preventDefault() // Prevent quit until cleanup is done
      await new Promise<void>((resolve) => {
        killer(child.pid, 'SIGKILL', () => {
          resolve()
        })
      })
    } catch (err) {
      console.error('Error stopping instance:', err)
    }
  }

  runningInstances.clear()
  updateService.cleanup()
})
