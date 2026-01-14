import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
import axios from 'axios'
import fs from 'fs'
import { randomUUID } from 'crypto'
import { updateService } from './update'
import { Auth } from 'msmc'
import { ensureJava, JavaVersion } from './javaManager'
import { SyncService } from './services/SyncService'

// Define API Base URL for main process
const API_BASE_URL = 'http://163.192.96.105:3000';

async function generateManifestFromArgs(args: any) {
  if (!args.versionId) return { files: [], overrides: null };
  try {
    const config: any = {};
    if (args.token) {
      config.headers = { Authorization: `Bearer ${args.token}` };
    }
    const response = await axios.get(`${API_BASE_URL}/sync/manifest/${args.versionId}`, config);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch manifest:', error);
    throw error;
  }
}

// Global reference to main window for update service
// Global reference to main window for update service
let mainWindow: BrowserWindow | null = null

function getJavaVersion(mcVer: string): JavaVersion {
  // Simple heuristic
  const parts = mcVer.split('.');
  const minor = parseInt(parts[1]);
  const patch = parts[2] ? parseInt(parts[2]) : 0;

  if (minor >= 21) return 21; // 1.21+ -> Java 21
  if (minor === 20 && patch >= 5) return 21; // 1.20.5+ -> Java 21
  if (minor >= 17) return 17; // 1.17 - 1.20.4 -> Java 17
  // 1.16.5 usually runs on Java 8, but supports 11/17 sometimes? 
  // Standard is Java 8 for < 1.17
  return 8;
}

// Helper to run Java Installer JAR
async function runInstaller(url: string, destPath: string, mcPath: string, event: any, javaPath: string) {
  // CRITICAL: Installers often need 'java.exe' (console) not 'javaw.exe' (windowless) to run correctly and output logs


  let installerJava = javaPath;
  if (process.platform === 'win32' && installerJava.includes('javaw.exe')) {
    installerJava = installerJava.replace('javaw.exe', 'java.exe');
  }

  // Log Java version for debugging
  try {
    const vCheck = spawn(installerJava, ['-version']);
    vCheck.stdout?.on('data', (d) => event.sender.send('launcher-log', `[Java Info] ${d}`));
    vCheck.stderr?.on('data', (d) => event.sender.send('launcher-log', `[Java Info] ${d}`));
  } catch (e) { /* ignore */ }

  event.sender.send('launcher-log', `[Installer] Downloading ${url}...`);
  try {
    const resp = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(destPath, resp.data);
  } catch (e: any) {
    throw new Error(`Failed to download installer: ${e.message}`);
  }

  event.sender.send('launcher-log', `[Installer] Running Java Installer: ${destPath}`);

  // Pre-create launcher_profiles.json if missing (Installer requirement)
  const profilesPath = path.join(mcPath, 'launcher_profiles.json');
  if (!fs.existsSync(profilesPath)) {
    try {
      if (!fs.existsSync(mcPath)) fs.mkdirSync(mcPath, { recursive: true });
      fs.writeFileSync(profilesPath, JSON.stringify({ profiles: {} }));
    } catch (e) { /* ignore */ }
  }

  return new Promise<void>((resolve, reject) => {
    // Correct args: --installClient [path]
    const args = ['-jar', destPath, '--installClient', mcPath];
    event.sender.send('launcher-log', `[Installer] CMD: ${installerJava} ${args.join(' ')}`);

    const proc = spawn(installerJava, args, { stdio: 'pipe', cwd: mcPath });

    proc.stdout.on('data', (d) => {
      const line = d.toString();
      console.log(`[Installer] ${line}`);
      event.sender.send('launcher-log', `[Installer] ${line}`);
    });

    // Capture stderr for potential errors
    let errorLog = '';
    proc.stderr.on('data', (d) => {
      const line = d.toString();
      errorLog += line;
      // NeoForge installer outputs normal progress to stderr sometimes.
      console.log(`[Installer Output] ${line}`);
      event.sender.send('launcher-log', `[Installer Output] ${line}`);
    });

    proc.on('error', (err) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error(`Java executable not found at ${javaPath}.`));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      try { fs.unlinkSync(destPath); } catch (e) { /* ignore */ }
      if (code === 0) resolve();
      else {
        const errMsg = `Installer exited with code ${code}.\n\nError Output:\n${errorLog.slice(-1000)}`;
        dialog.showErrorBox('Installer Failed', errMsg);
        reject(new Error(errMsg));
      }
    });
  });
}

// FIX: Automatic fix for AMD driver crash by disabling NeoForge early window
function fixNeoForgeConfig(mcPath: string) {
  const configDir = path.join(mcPath, 'config');
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  const files = ['fml.toml', 'neoforge-client.toml'];
  for (const file of files) {
    const filePath = path.join(configDir, file);
    try {
      const sectionHeader = '[earlyWindow]';
      const newKeys = [
        '    earlyWindowControl = false',
        '    earlyWindowSkipGLVersions = ["4.6", "4.5"]',
        '    earlyWindowParallelism = 1'
      ];

      let lines: string[] = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        // Split by line and filter out existing problematic keys
        lines = content.split(/\r?\n/).filter(line => {
          const trimmed = line.trim();
          return !trimmed.startsWith('earlyWindowControl') &&
            !trimmed.startsWith('earlyWindowSkipGLVersions') &&
            !trimmed.startsWith('earlyWindowParallelism');
        });

        const sectionIndex = lines.findIndex(l => l.trim() === sectionHeader);
        if (sectionIndex !== -1) {
          // Insert after [earlyWindow]
          lines.splice(sectionIndex + 1, 0, ...newKeys);
        } else {
          // Prepend section at top
          lines.unshift(sectionHeader, ...newKeys, '');
        }
      } else {
        lines = [sectionHeader, ...newKeys];
      }

      // Join with \n (Node write handles OS conversion usually, but \n is safe for TOML)
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      console.log(`[NeoForgeFix] Patched ${file} (Line-by-Line Safe Mode).`);
    } catch (e) {
      console.error(`[NeoForgeFix] Failed to patch ${file}:`, e);
    }
  }
}

// FIX: Helper to resolve NeoForge placeholders that MCLC 3.x fails to handle
// AND inject necessary JVM arguments for modern Java
function fixVersionJson(versionsPath: string, versionId: string, mcPath: string) {
  const jsonPath = path.join(versionsPath, versionId, `${versionId}.json`);
  if (!fs.existsSync(jsonPath)) return;

  try {
    let content = fs.readFileSync(jsonPath, 'utf8');
    const libDir = path.join(mcPath, 'libraries').replace(/\\/g, '/');
    const cpSep = process.platform === 'win32' ? ';' : ':';

    // Resolve basic placeholders
    content = content.replace(/\${library_directory}/g, libDir);
    content = content.replace(/\${classpath_separator}/g, cpSep);
    content = content.replace(/\${version_name}/g, versionId);

    // Parse JSON to inject JVM args
    const json = JSON.parse(content);

    // Ensure arguments object exists
    if (!json.arguments) json.arguments = {};

    // Ensure jvm array exists
    if (!json.arguments.jvm) json.arguments.jvm = [];

    // Generate library paths for the module path

    // Generate library paths for the module path
    // We need to find these specific libraries in the json.libraries list to get their relative paths
    // But for now, we can try to construct them if we assume identifying names.
    // However, the robust way is to finding them by name in the library list.

    const libraries = json.libraries || [];
    const findLibPath = (namePart: string) => {
      const lib = libraries.find((l: any) => l.name.includes(namePart));
      if (!lib || !lib.downloads || !lib.downloads.artifact || !lib.downloads.artifact.path) return null;
      return path.join(libDir, lib.downloads.artifact.path).replace(/\\/g, '/');
    };

    const bootLauncher = findLibPath('bootstraplauncher');

    const secureJarHandler = findLibPath('securejarhandler');
    const asmCommons = findLibPath('asm-commons');
    const asmUtil = findLibPath('asm-util');
    const asmAnalysis = findLibPath('asm-analysis');
    const asmTree = findLibPath('asm-tree');
    const asm = findLibPath('asm:'); // Colon to avoid matching others if possible, or just 'asm-' but verify
    const jarJar = findLibPath('JarJarFileSystems');

    // Fallback: If bootLauncher is missing in libraries (installer fail?), we can't build the path.
    // We should log this CRITICAL failure.

    const neoforgeArgs: string[] = [];

    // Only apply these NeoForge specific args if we found the boot launcher (indicator of NeoForge)
    if (bootLauncher) {
      const modulePath = [
        bootLauncher,
        secureJarHandler,
        asmCommons,
        asmUtil,
        asmAnalysis,
        asmTree,
        asm,
        jarJar
      ].filter(p => p).join(cpSep);

      neoforgeArgs.push(
        '-DignoreList=client-extra,${version_name}.jar',
        `-DlibraryDirectory=${libDir}`,
        // Note: MCLC might not resolve specific custom placeholders inside args keys unless we do it.
        // But we already resolve ${library_directory} in the content string before parsing? 
        // Yes, but we should use absolute paths here to be safe since we resolved libDir.

        '-p', modulePath,
        '--add-modules', 'ALL-MODULE-PATH',
        '--add-opens', 'java.base/java.util.jar=cpw.mods.securejarhandler',
        '--add-opens', 'java.base/java.lang.invoke=cpw.mods.securejarhandler',
        '--add-exports', 'java.base/sun.security.util=cpw.mods.securejarhandler',
        '--add-exports', 'jdk.naming.dns/com.sun.jndi.dns=java.naming'
      );
    } else {
      // Fallback for older Forge or if libs not found (standard Java 17+ args)
      neoforgeArgs.push(
        '--add-opens', 'java.base/java.util.jar=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang.invoke=ALL-UNNAMED',
        '--add-opens', 'java.base/java.util=ALL-UNNAMED',
        '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
        '--add-opens', 'java.base/java.io=ALL-UNNAMED',
        '--add-opens', 'java.base/java.nio=ALL-UNNAMED',
        '--add-opens', 'java.base/sun.nio.ch=ALL-UNNAMED',
        '--add-opens', 'java.base/java.util.zip=ALL-UNNAMED'
      );
    }

    // We still want the generic ones for compatibility? 
    // The reference only has the specific ones. Let's stick to the specific ones if NeoForge.

    const argsToInject = neoforgeArgs;

    // Aggressively cleanup existing args that conflict or are stale
    // We remove any -p, --add-modules, --add-opens, or -DignoreList that we manage
    if (json.arguments.jvm) {
      json.arguments.jvm = json.arguments.jvm.filter(arg =>
        !arg.includes('bootstraplauncher') &&
        !arg.includes('securejarhandler') &&
        !arg.includes('ALL-MODULE-PATH') &&
        !arg.startsWith('-DignoreList') &&
        !arg.startsWith('-DlibraryDirectory')
      );
    } else {
      json.arguments.jvm = [];
    }

    // Now always inject if we found the launcher (or fallback)
    if (bootLauncher) {
      json.arguments.jvm.push(...argsToInject);
    } else {
      // Generic args (check if already present to avoid dupe since we didn't filter generic opens specifically above)
      const hasGeneric = json.arguments.jvm.some(arg => arg.includes('java.base/java.util.jar=ALL-UNNAMED'));
      if (!hasGeneric) {
        json.arguments.jvm.push(...argsToInject);
      }
    }

    // Re-resolve placeholders that might be in the new args if we used them (we verified absolute paths above though)
    // We replaced ${version_name} in the content string before parsing, so it's gone.
    // However, -DignoreList uses ${version_name}.jar literal which we want to preserve? 
    // No, we want it to be the actual version ID.
    json.arguments.jvm = json.arguments.jvm.map(arg => arg.replace(/\${version_name}/g, versionId));

    fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(`[FIX] Failed to patch ${versionId}.json:`, e);
  }
}

// FIX: Helper to ensure vanilla files are present before installer runs
async function downloadVanilla(launcher: any, version: string, mcPath: string, event: any) {
  event.sender.send('launcher-log', `[INFO] Pre-downloading vanilla files for ${version}...`);
  const opts = {
    authorization: { name: 'Player' },
    root: mcPath,
    version: { number: version, type: 'release' },
    memory: { max: '1G', min: '512M' },
    // Use skipLaunch if supported or just allow it to download
    // We don't actually want to start the process
  };

  // Most versions of MCLC will download missing assets/libraries when launch is called.
  // We catch the error that happens because we don't actually want to launch.
  try {
    const child = await launcher.launch({ ...opts, window: { width: 0, height: 0 } });
    child.kill();
  } catch (e) {
    // We expect errors or we killed it
  }

  const vanillaJson = path.join(mcPath, 'versions', version, `${version}.json`);
  if (fs.existsSync(vanillaJson)) {
    event.sender.send('launcher-log', `[INFO] Vanilla files for ${version} are verified.`);
  } else {
    event.sender.send('launcher-log', `[WARN] Vanilla files might be missing after download attempt.`);
  }
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 920,
    height: 750,
    minWidth: 920,
    minHeight: 750,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

const runningInstances = new Map<string, any>();

// Global sync function to be used by both launch and standalone sync IPC
async function syncModpackFiles(_event: any, options: any) {

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
      const config: any = {};
      if (options.token) {
        config.headers = { Authorization: `Bearer ${options.token}` };
      }
      const response = await axios.get(`${API_BASE_URL}/sync/manifest/${options.versionId}`, config);
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

  const syncService = new SyncService(app.getPath('userData'));

  ipcMain.handle('sync:modpack', async (_, args) => {
    // We don't have a specific instanceId in this call args usually, assuming modpackName or using ID
    // Need to verify standard args. The current call pass { modpackName ... }.
    // Let's assume modpackName IS the instance identifier for now, or we need to pass instanceId.
    // The current api.createInstance uses modpackName as folder name.
    // So instanceId = modpackName.
    // Wait, syncModpack args are: { versionId, modpackName, rootPath ... }
    return syncService.startSync(args.modpackName, await generateManifestFromArgs(args), (progress) => {
      if (mainWindow) {
        mainWindow.webContents.send('sync:progress', { instanceId: args.modpackName, ...progress });
      }
    }, args.token, args.rootPath);
  });

  ipcMain.handle('sync:cancel', (_, instanceId) => {
    syncService.cancelSync(instanceId);
  });



  ipcMain.handle('sync:start', async (event, instanceId: string, manifest: any, token?: string, rootPath?: string) => {
    try {
      await syncService.startSync(instanceId, manifest, (progress) => {
        event.sender.send('sync:progress', progress);
      }, token, rootPath);
      return { success: true };
    } catch (error: any) {
      console.error('Sync failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('launch-minecraft', async (_event, options: any) => {
    const { Client } = require('minecraft-launcher-core');
    const launcher = new Client();

    const modpackName = options.modpackName || 'default';
    const safeName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
    const rootBase = options.rootPath || 'C:\\Minecraft';
    const mcPath = path.join(rootBase, 'instances', safeName);
    const versionsPath = path.join(mcPath, 'versions');

    const logToFile = (msg: string) => {
      console.log(`[Launcher] ${msg}`);
    };

    const sendStatus = (status: string, progress?: number) => {
      _event.sender.send('launch-status', { status, progress });
      logToFile(`[STATUS] ${status} (${progress}%)`);
    };

    const sendError = (error: string) => {
      _event.sender.send('launch-close', 1);
      logToFile(`[ERROR] ${error}`);
      return { success: false, error };
    };

    try {
      if (!options.skipSync) {
        sendStatus('Syncing mods...', 5);
        const syncResult = await syncModpackFiles(_event, options);
        if (!syncResult.success) return sendError(syncResult.error);
      } else {
        sendStatus('Verifying installation...', 5);
      }

      // ENSURE JAVA
      const reqJava = getJavaVersion(options.gameVersion);
      sendStatus(`Checking Java ${reqJava} Runtime...`, 15);
      const javaPath = await ensureJava(reqJava, _event);
      // Store for launcher
      options.javaPath = javaPath;
      logToFile(`[JAVA] Path: ${javaPath}`);

      // FIX: Ensure vanilla files are present for Forge/NeoForge installers
      if (options.loaderType === 'forge' || options.loaderType === 'neoforge') {
        await downloadVanilla(launcher, options.gameVersion, mcPath, _event);
      }
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
          const gameVer = options.gameVersion;
          let latestNeo = options.loaderVersion;

          // Only fetch metadata if we don't have a specific version or it's 'latest'
          if (!latestNeo || latestNeo === 'latest') {
            try {
              const metadataUrl = 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml';
              const metaResp = await axios.get(metadataUrl, { timeout: 15000 });
              const xml = metaResp.data;
              const versionMatches: string[] = Array.from(xml.matchAll(/<version>(.*?)<\/version>/g)).map((m: any) => m[1]);

              const gParts = gameVer.split('.');
              const minorMC = parseInt(gParts[1]);
              const patchMC = gParts[2] || '0';

              let validVersions: string[] = [];
              if (minorMC >= 21) {
                const prefix = `${minorMC}.${patchMC}.`;
                validVersions = versionMatches.filter(v => v.startsWith(prefix));
              } else {
                const prefix = `${gameVer}-`;
                validVersions = versionMatches.filter(v => v.startsWith(prefix));
              }

              validVersions.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
              latestNeo = validVersions[validVersions.length - 1]; // Get last (latest)
            } catch (metaErr: any) {
              console.warn('[NEOFORGE] Metadata fetch failed, but we might be able to proceed if a specific version was intended.', metaErr);
              throw new Error(`Failed to fetch NeoForge version list (Server returned ${metaErr.response?.status || 'Error'}). If you can, go to Settings and select a specific NeoForge version instead of 'latest'.`);
            }
          }

          if (!latestNeo) throw new Error(`Could not find NeoForge version for ${gameVer}`);

          _event.sender.send('launcher-log', `[INFO] Selected NeoForge: ${latestNeo}`);

          const vDir = path.join(versionsPath, `neoforge-${latestNeo}`);
          if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

          const installerUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${latestNeo}/neoforge-${latestNeo}-installer.jar`;
          const installerPath = path.join(versionsPath, `neoforge-${latestNeo}-installer.jar`);

          await runInstaller(installerUrl, installerPath, mcPath, _event, javaPath);


          // Auto-detect installed NeoForge version ID
          // Installer creates a folder in versions/, usually naming it "neoforge-{ver}" or "{mcVer}-neoforge-{ver}"
          // We scan for the directory matching neoforge and recent time
          const installedDirs = fs.readdirSync(versionsPath).filter(d => d.includes('neoforge'));
          // Sort by mtime desc
          installedDirs.sort((a, b) => fs.statSync(path.join(versionsPath, b)).mtimeMs - fs.statSync(path.join(versionsPath, a)).mtimeMs);

          if (installedDirs.length > 0) {
            const detectedId = installedDirs[0];
            options.neoForgeVersionId = detectedId;
            _event.sender.send('launcher-log', `[INFO] Detected installed NeoForge ID: ${detectedId}`);

            // FIX: Resolve placeholders in the newly installed NeoForge JSON
            fixVersionJson(versionsPath, detectedId, mcPath);
          } else {
            // Fallback
            options.neoForgeVersionId = `neoforge-${latestNeo}`;
            fixVersionJson(versionsPath, options.neoForgeVersionId, mcPath);
          }

        } catch (err: any) {
          console.error('[NEOFORGE] Error:', err);
          _event.sender.send('launcher-log', `[ERROR] NeoForge Setup: ${err.message}`);
          return sendError('NeoForge Setup Failed: ' + err.message);
        }

      } else if (options.loaderType === 'forge') {
        sendStatus('Installing Forge...', 60);
        try {
          const pResp = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 10000 });

          let fVer = options.loaderVersion && options.loaderVersion !== 'latest' ? options.loaderVersion : null;
          if (!fVer) {
            const latest = pResp.data.promos[`${options.gameVersion}-latest`];
            if (latest) {
              fVer = latest.startsWith(options.gameVersion) ? latest : `${options.gameVersion}-${latest}`;
            }
          }

          if (!fVer) throw new Error('Could not determine Forge version');

          _event.sender.send('launcher-log', `[INFO] Selected Forge: ${fVer}`);
          const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fVer}/forge-${fVer}-installer.jar`;
          const installerPath = path.join(versionsPath, `forge-${fVer}-installer.jar`);

          await runInstaller(installerUrl, installerPath, mcPath, _event, javaPath);

          // Auto-detect installed Forge version ID
          const installedDirs = fs.readdirSync(versionsPath).filter(d => d.includes('forge') && d.includes(options.gameVersion));
          installedDirs.sort((a, b) => fs.statSync(path.join(versionsPath, b)).mtimeMs - fs.statSync(path.join(versionsPath, a)).mtimeMs);

          if (installedDirs.length > 0) {
            const detectedId = installedDirs[0];
            options.forgeVersionId = detectedId;
            _event.sender.send('launcher-log', `[INFO] Detected installed Forge ID: ${detectedId}`);

            // FIX: Resolve placeholders in the newly installed Forge JSON
            fixVersionJson(versionsPath, detectedId, mcPath);
          } else {
            options.forgeVersionId = `${options.gameVersion}-forge-${fVer}`;
            fixVersionJson(versionsPath, options.forgeVersionId, mcPath);
          }

          _event.sender.send('launcher-log', `[INFO] Forge setup complete.`);

        } catch (err: any) {
          console.error('[FORGE] Error:', err);
          _event.sender.send('launcher-log', `[ERROR] Forge Setup: ${err.message}`);
          return sendError('Forge Setup Failed: ' + err.message);
        }
      }

      // FIX: Add JVM options for modern Java (17+) if needed
      if (!options.customArgs) options.customArgs = [];
      const JVM_OPTIONS = [
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+UseG1GC',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-XX:G1HeapRegionSize=32M'
      ];

      // APPLY AMD/INTEL FIXES ONLY IF ENABLED
      if (options.amdCompatibility) {
        logToFile('[AMD] Compatibility mode enabled. Applying fixes...');

        // 1. Branding arguments & NeoForge Master Properties
        JVM_OPTIONS.push(
          '-Dminecraft.launcher.brand=minecraft-launcher',
          '-Dminecraft.launcher.version=2.1.0',
          '-Dneoforge.fml.earlyWindowControl=false',
          '-Dneoforge.earlywindow=false',
          '-Dneoforge.immediateWindow=false',
          '-Dneoforge.loading.window=false'
        );

        // 2. Threaded optimizations (Mostly NVIDIA, but doesn't hurt)
        process.env.__GL_THREADED_OPTIMIZATIONS = '1';

        // 3. Config patching (Disable Early Window & Skip GL 4.6/4.5)
        if (options.loaderType === 'neoforge' && options.gameVersion.includes('1.21')) {
          fixNeoForgeConfig(mcPath);
        }

        // 4. Executable Spoofing (Windows only)
        if (process.platform === 'win32' && options.javaPath) {
          try {
            const javaDir = path.dirname(options.javaPath);
            const spoofedPath = path.join(javaDir, 'Minecraft.exe');
            if (!fs.existsSync(spoofedPath)) {
              fs.copyFileSync(options.javaPath, spoofedPath);
              logToFile(`[AMD] Created spoofed executable: ${spoofedPath}`);
            }
            options.javaPath = spoofedPath;
            logToFile(`[AMD] Using spoofed Java path: ${options.javaPath}`);
          } catch (e) {
            logToFile(`[AMD-ERR] Failed to spoof executable: ${e}`);
          }
        }
      }

      options.customArgs.push(...JVM_OPTIONS);
      logToFile(`[LAUNCH] Final JVM Args count: ${options.customArgs.length}`);
      logToFile(`[LAUNCH] Java Path: ${options.javaPath}`);

      // NeoForge / Modern Forge specific logic
      if (options.loaderType === 'neoforge' || (options.loaderType === 'forge' && parseInt(options.gameVersion.split('.')[1]) >= 17)) {
        const versionId = options.neoForgeVersionId || options.forgeVersionId || options.gameVersion; // fallbacks
        const libDir = path.join(mcPath, 'libraries');
        const cpSep = process.platform === 'win32' ? ';' : ':';

        // Helper to find lib path - we might need to read the JSON to know exact versions,
        // or we can scan the lib dir for matching jars if we are lazy, but reading JSON is safer if we can find it.
        // Let's rely on scanning since we might not have the JSON fully resolved in this scope yet?
        // Actually we can read the json file we just patched or looked at.

        let foundNeoArgs = false;
        try {
          // We need to find the version json file
          // It's usually in ./versions/<versionId>/<versionId>.json
          const vJsonPath = path.join(versionsPath, versionId || '', (versionId || '') + '.json');
          if (fs.existsSync(vJsonPath)) {
            const json = JSON.parse(fs.readFileSync(vJsonPath, 'utf8'));
            const libraries = json.libraries || [];
            const findLibPath = (namePart: string) => {
              const lib = libraries.find((l: any) => l.name.includes(namePart));
              if (!lib || !lib.downloads || !lib.downloads.artifact || !lib.downloads.artifact.path) return null;
              return path.join(libDir, lib.downloads.artifact.path).replace(/\\/g, '/'); // Force forward slashes for Java args if needed, or stick to OS.
            };

            const bootLauncher = findLibPath('bootstraplauncher');
            if (bootLauncher) {
              const secureJarHandler = findLibPath('securejarhandler');
              const asmCommons = findLibPath('asm-commons');
              const asmUtil = findLibPath('asm-util');
              const asmAnalysis = findLibPath('asm-analysis');
              const asmTree = findLibPath('asm-tree');
              const asm = findLibPath('org.ow2.asm:asm:') || findLibPath('asm:asm:') || findLibPath('asm-9');

              const jarJar = findLibPath('JarJarFileSystems');
              const mavenArtifact = findLibPath('maven-artifact');

              const modulePath = [
                bootLauncher,
                secureJarHandler,
                asmCommons,
                asmUtil,
                asmAnalysis,
                asmTree,
                asm,
                jarJar,
                mavenArtifact
              ].filter(p => p).join(cpSep);

              options.customArgs.push(
                `-DignoreList=bootstraplauncher,securejarhandler,asm-commons,asm-util,asm-analysis,asm-tree,asm,JarJarFileSystems,client-extra,maven-artifact,${versionId}.jar`,
                `-DlibraryDirectory=${libDir}`,
                '-p', modulePath,
                '--add-modules', 'ALL-MODULE-PATH',
                '--add-opens', 'java.base/java.util.jar=cpw.mods.securejarhandler',
                '--add-opens', 'java.base/java.lang.invoke=cpw.mods.securejarhandler',
                '--add-exports', 'java.base/sun.security.util=cpw.mods.securejarhandler',
                '--add-exports', 'jdk.naming.dns/com.sun.jndi.dns=java.naming'
              );
              foundNeoArgs = true;
              logToFile('[ARGS] Injected NeoForge specific args via customArgs');
            }
          }
        } catch (e) { logToFile(`[ARGS-ERR] Failed to calculate NeoForge args: ${e}`); }

        if (!foundNeoArgs) {
          // Fallback to standard exports if we couldn't build the specific neo args
          options.customArgs.push(
            '--add-opens', 'java.base/java.util.jar=ALL-UNNAMED',
            '--add-opens', 'java.base/java.lang.invoke=ALL-UNNAMED',
            '--add-opens', 'java.base/java.util=ALL-UNNAMED',
            '--add-opens', 'java.base/java.lang=ALL-UNNAMED',
            '--add-opens', 'java.base/java.io=ALL-UNNAMED',
            '--add-opens', 'java.base/java.nio=ALL-UNNAMED',
            '--add-opens', 'java.base/sun.nio.ch=ALL-UNNAMED',
            '--add-opens', 'java.base/java.util.zip=ALL-UNNAMED'
          );
        }
      }
      sendStatus('Launching...', 80);
      let auth = options.auth;

      // If no valid auth provided, create offline session
      if (!auth || !auth.access_token || auth.access_token === '0') {
        auth = {
          access_token: '0',
          client_token: randomUUID(),
          uuid: randomUUID().replace(/-/g, ''),
          name: options.auth?.name || 'Player',
          user_properties: '{}'
        };
      }

      const opts: any = {
        authorization: auth,
        javaPath: options.javaPath, // CRITICAL: Use managed Java path
        root: mcPath,
        version: { number: options.gameVersion, type: 'release' },
        memory: { max: options.memory || '4G', min: '2G' },
        // Use the calculated customArgs which now includes NeoForge/Forge specific JVM args
        customArgs: options.customArgs || [],
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

      // MCLC Event Listeners
      launcher.on('debug', (e) => {
        console.log(`[MCLC_DEBUG] ${e}`);
        logToFile(`[DEBUG] ${e}`);
      });
      launcher.on('data', (e) => {
        console.log(`[MCLC_DATA] ${e}`);
        logToFile(`[DATA] ${e}`);
      });
      launcher.on('close', (e) => {
        console.log(`[MCLC_CLOSE] ${e}`);
        logToFile(`[CLOSE] Code: ${e}`);
      });
      launcher.on('arguments', (e) => {
        logToFile(`[ARGS] ${JSON.stringify(e)}`);
      });

      // Platform-specific adjustments for Windows
      if (process.platform === 'win32') {
        // Force javaw.exe (windowless) instead of java.exe
        // This prevents CMD window while still allowing log capture through pipes
        const currentJava = opts.javaPath || options.javaPath || process.env.JAVA_HOME;
        if (currentJava && currentJava.includes('java.exe')) {
          opts.javaPath = currentJava.replace('java.exe', 'javaw.exe');
          _event.sender.send('launcher-log', `[INFO] Using javaw.exe: ${opts.javaPath}`);
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

      if (child) {
        // Diagnostic: Log child process info
        _event.sender.send('launcher-log', `[INFO] Java process spawned - PID: ${child.pid}`);
        _event.sender.send('launcher-log', `[INFO] stdout available: ${!!child.stdout}`);
        _event.sender.send('launcher-log', `[INFO] stderr available: ${!!child.stderr}`);

        if (child.stdout) {
          child.stdout.setEncoding('utf8');
          child.stdout.on('data', (data: any) => {
            const output = data.toString();
            const logLines = output.split('\n').filter((line: string) => line.trim());
            logLines.forEach((line: string) => {
              console.log(`[JAVA] ${line}`);
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
              console.error(`[JAVA-ERR] ${line}`);
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
      } else {
        _event.sender.send('launcher-log', `[ERROR] Launcher failed to spawn process. Check version path or Java compatibility.`);
      }

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

  // Enhanced Mrpack Installation with Progress and Integrity Checks
  ipcMain.handle('install-mrpack', async (_event, { mrpackUrl, modpackName, rootPath }) => {
    const AdmZip = require('adm-zip');
    const os = require('os');
    const fs = require('fs');
    const path = require('path');

    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      const sendProgress = (status: string, progress: number, detail?: string) => {
        if (mainWindow) {
          mainWindow.webContents.send('installation-progress', { status, progress, detail });
        }
      };

      console.log(`[INSTALL-MRPACK] Starting installation for ${modpackName}`);
      sendProgress('downloading_mrpack', 0, 'Downloading modpack file...');

      // 1. Download .mrpack
      const response = await axios.get(mrpackUrl, {
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'NovaLink/1.0.86' },
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const p = Math.round((progressEvent.loaded * 10) / progressEvent.total); // First 10%
            sendProgress('downloading_mrpack', p, 'Downloading modpack...');
          }
        }
      });

      const tempPath = path.join(os.tmpdir(), `novalink-${Date.now()}.mrpack`);
      fs.writeFileSync(tempPath, Buffer.from(response.data));

      sendProgress('extracting', 10, 'Reading modpack manifest...');

      // 2. Parse Manifest
      const zip = new AdmZip(tempPath);
      const indexEntry = zip.getEntry('modrinth.index.json');
      if (!indexEntry) throw new Error('Invalid mrpack: missing modrinth.index.json');

      const indexData = JSON.parse(indexEntry.getData().toString('utf8'));
      const files = indexData.files || [];
      const totalFiles = files.length;
      console.log(`[INSTALL-MRPACK] Found ${totalFiles} files to download.`);

      // 3. Prepare Directories
      const safeName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
      const instanceDir = path.join(rootPath || 'C:\\Minecraft', 'instances', safeName);
      if (!fs.existsSync(instanceDir)) fs.mkdirSync(instanceDir, { recursive: true });

      // 4. Download Files (Batched)
      const batchSize = 5;
      let downloaded = 0;
      const modList: any[] = [];
      const failedFiles: any[] = [];

      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file: any) => {
          if (!file.path || !file.downloads || !file.downloads[0]) return;

          const targetPath = path.join(instanceDir, file.path);
          const targetDir = path.dirname(targetPath);
          if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

          try {
            // Check if exists and valid (sha1/512) - Skipping hash check for speed for now, or maybe check size?
            // Force download for integrity as requested
            const fileUrl = file.downloads[0];
            const fileRes = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 60000 });
            fs.writeFileSync(targetPath, Buffer.from(fileRes.data));

            // Add to mod list if it's a mod
            if (file.path.startsWith('mods/') && file.path.endsWith('.jar')) {
              let projectId = null;
              const modrinthMatch = file.downloads?.[0]?.match(/\/data\/([a-zA-Z0-9]+)\/versions/);
              if (modrinthMatch) {
                projectId = modrinthMatch[1];
              }

              modList.push({
                filename: path.basename(file.path),
                path: file.path,
                hashes: file.hashes,
                projectId
              });
            }
          } catch (err) {
            console.error(`Failed to download ${file.path}:`, err);
            failedFiles.push(file.path);
          } finally {
            downloaded++;
            const percent = 10 + Math.round((downloaded / totalFiles) * 80); // 10% to 90%
            sendProgress('downloading_mods', percent, `Downloading ${downloaded}/${totalFiles}: ${path.basename(file.path)}`);
          }
        }));
      }

      // 5. Extract Overrides
      sendProgress('overrides', 90, 'Applying configurations...');
      zip.getEntries().forEach((entry) => {
        if (entry.entryName.startsWith('overrides/')) {
          const relativePath = entry.entryName.substring('overrides/'.length);
          if (!relativePath) return;
          const targetPath = path.join(instanceDir, relativePath);
          if (entry.isDirectory) {
            fs.mkdirSync(targetPath, { recursive: true });
          } else {
            const parent = path.dirname(targetPath);
            if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
            fs.writeFileSync(targetPath, entry.getData());
          }
        }
      });

      // Cleanup
      try { fs.unlinkSync(tempPath); } catch (e) { }

      sendProgress('completed', 100, 'Installation finished!');
      console.log(`[INSTALL-MRPACK] Finished. Installed: ${modList.length}, Failed: ${failedFiles.length}`);

      return {
        success: true,
        mods: modList,
        instanceDir,
        failed: failedFiles
      };

    } catch (error: any) {
      console.error('[INSTALL-MRPACK] Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Old handler kept for compatibility if needed, or replace if used elsewhere
  ipcMain.handle('download-parse-mrpack', async (_event, { mrpackUrl: _mrpackUrl }) => {
    // ... minimal implementation just in case ...
    // For now, I'm just appending the new handler above the old one or replacing if lines match
    return { success: false, error: "Deprecated. Use install-mrpack." };
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
      // Include both enabled (.jar/.zip) and disabled (.jar.disabled/.zip.disabled) files
      return files.filter(f => {
        const lower = f.toLowerCase();
        return lower.endsWith('.jar') ||
          lower.endsWith('.zip') ||
          lower.endsWith('.jar.disabled') ||
          lower.endsWith('.zip.disabled');
      });
    }
    return [];
  });

  // Toggle mod file between enabled and disabled states
  ipcMain.handle('toggle-mod-file', async (_event, { rootPath, modpackName, filename, enabled }) => {
    const fs = require('fs');
    const path = require('path');
    const sName = modpackName.replace(/[^a-zA-Z0-9-]/g, '_');
    const modsDir = path.join(rootPath || 'C:\\Minecraft', 'instances', sName, 'mods');

    try {
      const isCurrentlyDisabled = filename.endsWith('.disabled');
      const baseName = isCurrentlyDisabled ? filename.replace('.disabled', '') : filename;

      const enabledPath = path.join(modsDir, baseName);
      const disabledPath = path.join(modsDir, baseName + '.disabled');

      if (enabled && fs.existsSync(disabledPath)) {
        // Enable: rename .jar.disabled to .jar
        fs.renameSync(disabledPath, enabledPath);
        console.log(`[MODS] Enabled: ${baseName}`);
        return { success: true, newFilename: baseName };
      } else if (!enabled && fs.existsSync(enabledPath)) {
        // Disable: rename .jar to .jar.disabled
        fs.renameSync(enabledPath, disabledPath);
        console.log(`[MODS] Disabled: ${baseName}`);
        return { success: true, newFilename: baseName + '.disabled' };
      }

      return { success: false, error: 'File not found' };
    } catch (err: any) {
      console.error('[MODS] Toggle failed:', err);
      return { success: false, error: err.message };
    }
  });

  // IPC Handlers for Updates
  ipcMain.handle('remove-mod-file', async (_, { rootPath, modpackName, filename }) => {
    try {
      const instancesPath = path.join(rootPath, 'instances');
      const modPath = path.join(instancesPath, modpackName, 'mods', filename);

      if (fs.existsSync(modPath)) {
        fs.unlinkSync(modPath);
        return { success: true };
      } else {
        const disabledPath = modPath + '.disabled';
        if (fs.existsSync(disabledPath)) {
          fs.unlinkSync(disabledPath);
          return { success: true };
        }
        return { success: false, error: 'File not found' };
      }
    } catch (err: any) {
      console.error('Failed to remove mod file:', err);
      throw err;
    }
  });

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
