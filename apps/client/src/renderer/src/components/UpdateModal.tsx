import { useEffect, useState } from 'react'
import { useUpdater } from '../hooks/useUpdater'
import { useToast } from '../contexts/ToastContext'
import { Download, RefreshCw, CheckCircle } from 'lucide-react'

export default function UpdateModal() {
    const { status, version, progress, error, installNow, dismissUpdate } = useUpdater()
    const toast = useToast()
    const [dontAskAgain, setDontAskAgain] = useState(false)

    // Handle errors with toast
    useEffect(() => {
        if (status === 'error' && error) {
            toast.error('Update Error', error)
        }
    }, [status, error, toast])

    // Auto-install logic
    useEffect(() => {
        if (status === 'downloaded') {
            const pref = localStorage.getItem('update_preference');
            if (pref === 'always') {
                installNow();
            }
        }
    }, [status]);

    // Don't show modal for idle, checking, available, or not-available states, or error (handled by toast)
    if (status === 'idle' || status === 'checking' || status === 'available' || status === 'not-available' || status === 'error') {
        return null
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
                            onClick={() => {
                                // Save preference before installing
                                if (dontAskAgain) {
                                    localStorage.setItem('update_preference', 'always');
                                } else {
                                    localStorage.setItem('update_preference', 'ask');
                                }
                                installNow()
                            }}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Install Now
                        </button>

                        {/* Secondary: Later */}
                        <button
                            onClick={() => {
                                // Save preference if checked
                                if (dontAskAgain) {
                                    localStorage.setItem('update_preference', 'manual');
                                }
                                dismissUpdate()
                            }}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-bold transition-all active:scale-[0.98]"
                        >
                            Install Later
                        </button>
                    </div>

                    {/* Don't ask again checkbox */}
                    <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setDontAskAgain(!dontAskAgain)}
                            className="flex items-center gap-2 group"
                        >
                            <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${dontAskAgain ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 group-hover:border-slate-500 bg-transparent'}`}>
                                {dontAskAgain && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-sm font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                                Don't ask again
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
