import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

/**
 * UpdateService - Manages application auto-updates using electron-updater
 * 
 * Features:
 * - Automatic update checks on app startup (packaged builds only)
 * - Background download with progress tracking
 * - User choice: Install now or later
 * - Graceful shutdown of Minecraft instances before update
 */
export class UpdateService {
    private mainWindow: BrowserWindow | null = null
    private updateCheckTimer: NodeJS.Timeout | null = null
    private isCheckingForUpdates = false

    constructor() {
        // Configure electron-updater logging
        autoUpdater.logger = log
        log.transports.file.level = 'info'

        // Auto-download updates when available
        autoUpdater.autoDownload = true

        // Auto-install on app quit (when user clicks "Later")
        autoUpdater.autoInstallOnAppQuit = true

        // Setup event handlers
        this.setupEventHandlers()
    }

    /**
     * Initialize the update service
     * Only runs in packaged builds (not in development)
     */
    public initialize(window: BrowserWindow): void {
        this.mainWindow = window

        // Skip updates in development mode
        if (!app.isPackaged) {
            log.info('Updates disabled in development mode')
            return
        }

        log.info('UpdateService initialized')

        // Check for updates after a short delay (don't block app startup)
        this.updateCheckTimer = setTimeout(() => {
            this.checkForUpdates()
        }, 3000)
    }

    /**
     * Manually trigger update check
     * Can be called from UI "Check for Updates" button
     */
    public async checkForUpdates(): Promise<void> {
        if (!app.isPackaged) {
            log.info('Update check skipped: development mode')
            return
        }

        if (this.isCheckingForUpdates) {
            log.info('Update check already in progress')
            return
        }

        try {
            this.isCheckingForUpdates = true
            log.info('Checking for updates...')
            await autoUpdater.checkForUpdates()
        } catch (error: any) {
            log.error('Error checking for updates:', error)
            this.sendToRenderer('update-error', {
                message: error?.message || 'Failed to check for updates'
            })
        } finally {
            this.isCheckingForUpdates = false
        }
    }

    /**
     * Install update immediately and restart app
     */
    public async installUpdateNow(): Promise<void> {
        log.info('Installing update now...')

        // Stop all Minecraft instances before quitting
        await this.stopAllMinecraftInstances()

        // Quit and install update
        try {
            autoUpdater.quitAndInstall(true, true)
        } catch (error: any) {
            log.error('Error installing update:', error)
            this.sendToRenderer('update-error', {
                message: 'Failed to install update. Please try again.'
            })
        }
    }

    /**
     * Stop all running Minecraft instances
     * Called before quitting for update installation
     */
    private async stopAllMinecraftInstances(): Promise<void> {
        log.info('Stopping all Minecraft instances before update...')

        try {
            // Import runningInstances from main process
            // This would need to be passed or accessed via a shared module
            // For now, we'll emit an event for the main process to handle
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('stop-all-minecraft-instances')
            }

            // Give a brief moment for cleanup
            await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error: any) {
            log.error('Error stopping Minecraft instances:', error)
            // Continue with update anyway
        }
    }

    /**
     * Setup electron-updater event handlers
     */
    private setupEventHandlers(): void {
        // Clear default listeners to avoid native dialogs
        autoUpdater.removeAllListeners()

        // When starting to check for updates
        autoUpdater.on('checking-for-update', () => {
            log.info('Event: checking-for-update')
            this.sendToRenderer('update-checking')
        })

        // When an update is available
        autoUpdater.on('update-available', (info) => {
            log.info('Event: update-available', info.version)
            this.sendToRenderer('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseName: info.releaseName
            })
        })

        // When no update is available
        autoUpdater.on('update-not-available', (info) => {
            log.info('Event: update-not-available', info.version)
            this.sendToRenderer('update-not-available', {
                version: info.version
            })
        })

        // Download progress
        autoUpdater.on('download-progress', (progress) => {
            log.info('Download progress:', progress.percent.toFixed(2) + '%')
            this.sendToRenderer('update-download-progress', {
                percent: progress.percent,
                bytesPerSecond: progress.bytesPerSecond,
                transferred: progress.transferred,
                total: progress.total
            })
        })

        // When update is downloaded and ready to install
        autoUpdater.on('update-downloaded', (info) => {
            log.info('Event: update-downloaded', info.version)
            this.sendToRenderer('update-downloaded', {
                version: info.version
            })

            // Show dialog asking user to install now or later
            this.showUpdateReadyDialog(info.version)
        })

        // Error during update process
        autoUpdater.on('error', (error) => {
            log.error('Event: update-error', error)
            this.sendToRenderer('update-error', {
                message: error?.message || 'Unknown update error'
            })
        })
    }

    /**
     * Show dialog when update is ready
     * Offers "Install Now" or "Later" options
     */
    /**
     * Show dialog when update is ready
     * Offers "Install Now" or "Later" options
     */
    private showUpdateReadyDialog(version: string): void {
        // Native dialog removed in favor of in-app UI (UpdateModal)
        // The 'update-downloaded' event sent above triggers the UI modal.
        log.info(`Update v${version} ready for install (waiting for user action via UI)`)
    }

    /**
     * Send update event to renderer process
     */
    private sendToRenderer(channel: string, data?: any): void {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data)
        }
    }

    /**
     * Cleanup on app quit
     */
    public cleanup(): void {
        if (this.updateCheckTimer) {
            clearTimeout(this.updateCheckTimer)
            this.updateCheckTimer = null
        }
    }
}

// Singleton instance
export const updateService = new UpdateService()
