import { useEffect, useState } from 'react'
import { useUpdater } from '../hooks/useUpdater'
import { useToast } from '../contexts/ToastContext'
import { Download, RefreshCw, CheckCircle } from 'lucide-react'

export default function UpdateModal() {
    const { status, version, progress, error, installNow, dismissUpdate } = useUpdater()
    const toast = useToast()
    const [preference, setPreference] = useState<string>('ask')

    // Load preference on mount and when status changes
    useEffect(() => {
        const pref = localStorage.getItem('update_preference') || 'ask'
        setPreference(pref)
    }, [status])

    // Handle errors with toast
    useEffect(() => {
        if (status === 'error' && error) {
            toast.error('Update Error', error)
        }
    }, [status, error, toast])

    // Auto-install logic for 'always' preference
    useEffect(() => {
        if (status === 'downloaded' && preference === 'always') {
            // Auto-install without showing modal
            installNow()
        }
    }, [status, preference, installNow])

    // Don't show modal for:
    // - idle, checking, available, not-available states
    // - error (handled by toast)
    // - if preference is 'manual' (user doesn't want to be prompted)
    // - if preference is 'always' (auto-install handles it)
    if (
        status === 'idle' ||
        status === 'checking' ||
        status === 'available' ||
        status === 'not-available' ||
        status === 'error' ||
        preference === 'manual'
    ) {
        return null
    }

    // For 'always' preference, show a minimal downloading state
    // but don't show the prompt - it will auto-install
    if (preference === 'always' && status === 'downloaded') {
        return null // Auto-install is being handled
    }

    // Downloading state
    if (status === 'downloading') {
        const percent = progress?.percent || 0
        const speed = progress?.bytesPerSecond || 0
        const speedMB = (speed / 1024 / 1024).toFixed(2)
        const transferredMB = ((progress?.transferred || 0) / 1024 / 1024).toFixed(2)
        const totalMB = ((progress?.total || 0) / 1024 / 1024).toFixed(2)

        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.9)] p-10 max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20">
                            <Download className="w-8 h-8 text-white animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Downloading Update</h2>
                        <p className="text-slate-400 font-medium">
                            Version {version || '...'}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-4">
                        <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                            />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400 font-bold">{transferredMB} MB / {totalMB} MB</span>
                            <span className="text-slate-500 font-medium">{speedMB} MB/s</span>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                        {preference === 'always'
                            ? 'The app will restart automatically after download...'
                            : 'Please wait while the update downloads...'}
                    </p>
                </div>
            </div>
        )
    }

    // Downloaded state - ready to install (only for 'ask' preference)
    if (status === 'downloaded' && preference === 'ask') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4">
                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.9)] p-10 max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Update Ready!</h2>
                        <p className="text-slate-400 font-medium">
                            Version {version} is ready to install
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="space-y-3">
                        {/* Primary: Install Now */}
                        <button
                            onClick={() => installNow()}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Install Now
                        </button>

                        {/* Secondary: Later */}
                        <button
                            onClick={() => dismissUpdate()}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold transition-all active:scale-[0.98]"
                        >
                            Install Later
                        </button>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                        💡 Tip: Change auto-update behavior in Settings
                    </p>
                </div>
            </div>
        )
    }

    return null
}

