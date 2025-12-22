import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      launchMinecraft: (options: any) => Promise<any>
      selectDirectory: () => Promise<string | null>
      getMcVersions: () => Promise<any[]>
      onLaunchStatus: (callback: any) => void
      onLaunchClose: (callback: any) => void
      onLaunchRunning: (callback: any) => void
      deleteInstance: (options: any) => Promise<any>
      createInstance: (options: any) => Promise<any>
      syncModpack: (options: any) => Promise<any>
      stopInstance: (modpackName: string) => Promise<any>
      isInstanceRunning: (modpackName: string) => Promise<boolean>
      openFolder: (path: string) => Promise<any>
      listMods: (options: { rootPath: string; modpackName: string; type?: string }) => Promise<string[]>
      onLaunchLog: (callback: any) => () => void

      // Update API
      updater: {
        checkForUpdates: () => Promise<void>
        installNow: () => Promise<void>
        quitApp: () => Promise<void>
        onUpdateChecking: (callback: () => void) => () => void
        onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
        onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => () => void
        onDownloadProgress: (callback: (progress: ProgressInfo) => void) => () => void
        onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
        onUpdateError: (callback: (error: { message: string }) => void) => () => void
      }
    }
  }
}

export interface UpdateInfo {
  version: string
  releaseDate?: string
  releaseName?: string
}

export interface ProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}
