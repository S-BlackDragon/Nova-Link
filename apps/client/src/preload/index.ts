import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

console.log('Preload script loading...');

// Custom APIs for renderer
const api = {
  launchMinecraft: (options: any) => electronAPI.ipcRenderer.invoke('launch-minecraft', options),
  selectDirectory: () => electronAPI.ipcRenderer.invoke('select-directory'),
  getMcVersions: () => electronAPI.ipcRenderer.invoke('get-mc-versions'),
  onLaunchStatus: (callback: any) => electronAPI.ipcRenderer.on('launch-status', callback),
  onLaunchClose: (callback: any) => electronAPI.ipcRenderer.on('launch-close', callback),
  onLaunchRunning: (callback: any) => electronAPI.ipcRenderer.on('launch-running', callback),
  deleteInstance: (options: any) => electronAPI.ipcRenderer.invoke('delete-instance', options),
  createInstance: (options: any) => electronAPI.ipcRenderer.invoke('create-instance', options),
  syncModpack: (options: any) => electronAPI.ipcRenderer.invoke('sync:modpack', options),
  stopInstance: (modpackName: string) => electronAPI.ipcRenderer.invoke('stop-instance', modpackName),
  isInstanceRunning: (modpackName: string) => electronAPI.ipcRenderer.invoke('is-instance-running', modpackName),
  openFolder: (path: string) => electronAPI.ipcRenderer.invoke('open-folder', path),
  listMods: (options: { rootPath: string, modpackName: string, type?: string }) => electronAPI.ipcRenderer.invoke('list-mods', options),
  toggleModFile: (options: { rootPath: string, modpackName: string, filename: string, enabled: boolean }) => electronAPI.ipcRenderer.invoke('toggle-mod-file', options),

  // Sync API
  sync: {
    start: (instanceId: string, manifest: any, token?: string, rootPath?: string) => electronAPI.ipcRenderer.invoke('sync:start', instanceId, manifest, token, rootPath),
    onProgress: (callback: (progress: any) => void) => {
      const handler = (_event: any, progress: any) => callback(progress);
      electronAPI.ipcRenderer.on('sync:progress', handler);
      return () => electronAPI.ipcRenderer.removeListener('sync:progress', handler);
    }
  },

  // Microsoft Authentication
  microsoftLogin: () => electronAPI.ipcRenderer.invoke('microsoft-login'),

  onLaunchLog: (callback: any) => {
    const subscription = (_event: any, message: any) => callback(_event, message);
    electronAPI.ipcRenderer.on('launcher-log', subscription);
    return () => electronAPI.ipcRenderer.removeListener('launcher-log', subscription);
  },

  onSyncComplete: (callback: any) => {
    const subscription = () => callback();
    electronAPI.ipcRenderer.on('sync-complete', subscription);
    return () => electronAPI.ipcRenderer.removeListener('sync-complete', subscription);
  },

  // Update API
  updater: {
    checkForUpdates: () => electronAPI.ipcRenderer.invoke('check-for-updates'),
    installNow: () => electronAPI.ipcRenderer.invoke('install-update-now'),
    quitApp: () => electronAPI.ipcRenderer.invoke('quit-app'),

    onUpdateChecking: (callback: () => void) => {
      electronAPI.ipcRenderer.on('update-checking', callback);
      return () => electronAPI.ipcRenderer.removeListener('update-checking', callback);
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      const sub = (_: any, info: any) => callback(info);
      electronAPI.ipcRenderer.on('update-available', sub);
      return () => electronAPI.ipcRenderer.removeListener('update-available', sub);
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      const sub = (_: any, info: any) => callback(info);
      electronAPI.ipcRenderer.on('update-not-available', sub);
      return () => electronAPI.ipcRenderer.removeListener('update-not-available', sub);
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      const sub = (_: any, progress: any) => callback(progress);
      electronAPI.ipcRenderer.on('update-download-progress', sub);
      return () => electronAPI.ipcRenderer.removeListener('update-download-progress', sub);
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      const sub = (_: any, info: any) => callback(info);
      electronAPI.ipcRenderer.on('update-downloaded', sub);
      return () => electronAPI.ipcRenderer.removeListener('update-downloaded', sub);
    },
    onUpdateError: (callback: (error: any) => void) => {
      const sub = (_: any, error: any) => callback(error);
      electronAPI.ipcRenderer.on('update-error', sub);
      return () => electronAPI.ipcRenderer.removeListener('update-error', sub);
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
