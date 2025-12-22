import { useState, useEffect } from 'react'

export type UpdateStatus =
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'downloaded'
    | 'not-available'
    | 'error'

export interface UpdateProgress {
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
}

export interface UpdateInfo {
    version: string
    releaseDate?: string
    releaseName?: string
}

export interface UpdateState {
    status: UpdateStatus
    version: string | null
    progress: UpdateProgress | null
    error: string | null
}

export function useUpdater() {
    const [state, setState] = useState<UpdateState>({
        status: 'idle',
        version: null,
        progress: null,
        error: null
    })

    useEffect(() => {
        if (!window.api?.updater) {
            console.warn('Updater API not available')
            return
        }

        // Setup event listeners
        const cleanupFunctions: (() => void)[] = []

        // Checking for update
        const unsub1 = window.api.updater.onUpdateChecking(() => {
            setState(prev => ({
                ...prev,
                status: 'checking',
                error: null
            }))
        })
        if (unsub1) cleanupFunctions.push(unsub1)

        // Update available
        const unsub2 = window.api.updater.onUpdateAvailable((info: UpdateInfo) => {
            setState(prev => ({
                ...prev,
                status: 'available',
                version: info.version
            }))
            // Status will automatically change to 'downloading' when progress starts
        })
        if (unsub2) cleanupFunctions.push(unsub2)

        // Update not available
        const unsub3 = window.api.updater.onUpdateNotAvailable(() => {
            setState(prev => ({
                ...prev,
                status: 'not-available'
            }))
            // Reset to idle after a brief moment
            setTimeout(() => {
                setState(prev => prev.status === 'not-available' ? { ...prev, status: 'idle' } : prev)
            }, 3000)
        })
        if (unsub3) cleanupFunctions.push(unsub3)

        // Download progress
        const unsub4 = window.api.updater.onDownloadProgress((progress: UpdateProgress) => {
            setState(prev => ({
                ...prev,
                status: 'downloading',
                progress
            }))
        })
        if (unsub4) cleanupFunctions.push(unsub4)

        // Update downloaded
        const unsub5 = window.api.updater.onUpdateDownloaded((info: UpdateInfo) => {
            setState(prev => ({
                ...prev,
                status: 'downloaded',
                version: info.version,
                progress: prev.progress ? { ...prev.progress, percent: 100 } : null
            }))
        })
        if (unsub5) cleanupFunctions.push(unsub5)

        // Update error
        const unsub6 = window.api.updater.onUpdateError((error: { message: string }) => {
            setState(prev => ({
                ...prev,
                status: 'error',
                error: error.message
            }))
            // Reset to idle after showing error
            setTimeout(() => {
                setState(prev => prev.status === 'error' ? { ...prev, status: 'idle', error: null } : prev)
            }, 5000)
        })
        if (unsub6) cleanupFunctions.push(unsub6)

        // Cleanup on unmount
        return () => {
            cleanupFunctions.forEach(cleanup => cleanup())
        }
    }, [])

    const checkForUpdates = async () => {
        if (!window.api?.updater) return
        try {
            await window.api.updater.checkForUpdates()
        } catch (error) {
            console.error('Failed to check for updates:', error)
        }
    }

    const installNow = async () => {
        if (!window.api?.updater) return
        try {
            await window.api.updater.installNow()
        } catch (error) {
            console.error('Failed to install update:', error)
        }
    }

    return {
        ...state,
        checkForUpdates,
        installNow
    }
}
