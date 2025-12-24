import { useEffect } from 'react'
import { useUpdater } from '../hooks/useUpdater'
import { useToast } from '../contexts/ToastContext'
import { Download, RefreshCw, CheckCircle } from 'lucide-react'

export default function UpdateModal() {
    const { status, version, progress, error, installNow, dismissUpdate } = useUpdater()
    const toast = useToast()

    // Handle errors with toast
    useEffect(() => {
        if (status === 'error' && error) {
            toast.error('Update Error', error)
        }
    }, [status, error, toast])

    // Don't show modal for idle, checking, available, or not-available states, or error (handled by toast)
    if (status === 'idle' || status === 'checking' || status === 'available' || status === 'not-available' || status === 'error') {
        return null
    }

    // Downloading state
    if (status === 'downloading') {
        const percent = progress?.percent || 0
        const speed = progress?.bytesPerSecond || 0
        const speedMB = (speed / 1024 / 1024).toFixed(2)

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
                            <span className="text-slate-400 font-bold">{percent.toFixed(1)}%</span>
                            <span className="text-slate-500 font-medium">{speedMB} MB/s</span>
                        </div>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                        Please wait while the update downloads...
                    </p>
                </div>
            </div>
        )
    }

    // Downloaded state - ready to install
    if (status === 'downloaded') {
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
                            onClick={installNow}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-[0.97] group"
                        >
                            <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="text-base uppercase tracking-widest">Install and Restart</span>
                        </button>

                        {/* Secondary: Install Later */}
                        <button
                            onClick={() => {
                                if (dismissUpdate) dismissUpdate()
                            }}
                            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold py-4 rounded-2xl transition-all duration-300 border border-white/10 active:scale-[0.97]"
                        >
                            Install Later
                        </button>
                    </div>

                    <p className="text-center text-slate-500 text-xs mt-6 font-medium">
                        If you choose "Install Later", the update will be installed when you close Nova Link
                    </p>
                </div>
            </div>
        )
    }

    return null
}
