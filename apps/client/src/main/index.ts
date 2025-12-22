import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import axios from 'axios'
import { updateService } from './update'

// Global reference to main window for update service
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
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
      const response = await axios.get(`http://127.0.0.1:3000/modpacks/versions/${options.versionId}/manifest`);
      const manifest = response.data;
      const downloadedMods = new Set<string>();

      const downloadMod = async (modId: string, modName: string) => {
        if (downloadedMods.has(modId)) return;
        try {
          console.log(`[SYNC] Syncing ${modName} (${modId})`);
          const modrinthResponse = await axios.get(`https://api.modrinth.com/v2/project/${modId}/version`, {
            params: {
              loaders: JSON.stringify([options.loaderType.toLowerCase()]),
              game_versions: JSON.stringify([options.gameVersion])
            },
            headers: { 'User-Agent': 'NovaLink/1.0.0' }
          });

          const latestVersion = modrinthResponse.data[0];
          if (latestVersion && latestVersion.files?.[0]) {
            if (latestVersion.dependencies) {
              for (const dep of latestVersion.dependencies) {
                if (dep.dependency_type === 'required' && dep.project_id) {
                  try {
                    const dInfo = await axios.get(`https://api.modrinth.com/v2/project/${dep.project_id}`, {
                      headers: { 'User-Agent': 'NovaLink/1.0.0' }
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
              headers: { 'User-Agent': 'NovaLink/1.0.0' }
            });
            fs.writeFileSync(modFilePath, Buffer.from(fResp.data));
            downloadedMods.add(modId);
          }
        } catch (err: any) {
          console.error(`[SYNC] Failed ${modName}:`, err.message);
        }
      };

      if (options.loaderType === 'fabric') {
        await downloadMod('P7dR8mSH', 'Fabric API');
      }

      const mods = manifest.mods || [];
      for (let i = 0; i < mods.length; i++) {
        sendStatus(`Downloading mod: ${mods[i].name} (${i + 1}/${mods.length})`, 15 + Math.round((i / mods.length) * 40));
        await downloadMod(mods[i].modrinthId, mods[i].name);
      }
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
        const fMeta = await axios.get('https://meta.fabricmc.net/v2/versions/loader');
        let lVer = options.loaderVersion;
        if (!lVer || lVer === 'latest') lVer = fMeta.data[0]?.version;
        if (!lVer) return sendError('Fabric loader not found');

        const vId = `fabric-loader-${lVer}-${options.gameVersion}`;
        const vDir = path.join(versionsPath, vId);
        if (!fs.existsSync(vDir)) fs.mkdirSync(vDir, { recursive: true });

        const pResp = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${options.gameVersion}/${lVer}/profile/json`);
        fs.writeFileSync(path.join(vDir, `${vId}.json`), JSON.stringify(pResp.data, null, 2));
        options.fabricVersionId = vId;
      }

      sendStatus('Launching...', 80);
      const auth = {
        access_token: '0',
        client_token: crypto.randomUUID(),
        uuid: crypto.randomUUID().replace(/-/g, ''),
        name: options.auth?.name || 'Player',
        user_properties: '{}'
      };

      const opts: any = {
        authorization: auth,
        root: mcPath,
        version: { number: options.gameVersion, type: 'release' },
        memory: { max: options.memory || '4G', min: '2G' },
        window: {
          detached: true // This helps hide the console in some versions of MLC
        }
      };
      if (options.loaderType === 'fabric' && options.fabricVersionId) opts.version.custom = options.fabricVersionId;

      launcher.on('debug', (e: any) => _event.sender.send('launcher-log', `[DEBUG] ${e}`));
      launcher.on('data', (e: any) => _event.sender.send('launcher-log', `[DATA] ${e}`));
      launcher.on('progress', (e: any) => {
        const p = 80 + Math.round((e.task / e.total) * 15);
        sendStatus(`Downloading: ${e.type}`, p);
      });
      launcher.on('close', (code: any) => {
        _event.sender.send('launch-close', code);
        runningInstances.delete(safeName);
      });
      launcher.on('arguments', () => {
        sendStatus('Running!', 100);
        _event.sender.send('launch-running', { modpackName: options.modpackName });
      });

      const child = await launcher.launch(opts);
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
