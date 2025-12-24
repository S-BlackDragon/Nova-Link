
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncProgressModalProps {
    status: 'scanning' | 'downloading' | 'overrides' | 'completed' | 'error';
    progress: number;
    currentFile?: string;
    error?: string;
    onClose: () => void;
}

export default function SyncProgressModal({ status, progress, currentFile, error, onClose }: SyncProgressModalProps) {
    const isCompleted = status === 'completed';
    const isError = status === 'error';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col items-center p-8 md:p-12 text-center relative">

                {isError ? (
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                ) : isCompleted ? (
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                ) : (
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                )}

                <h3 className="text-2xl font-black text-white mb-2">
                    {isError ? 'Sync Failed' : isCompleted ? 'Ready to Play!' : 'Synchronizing...'}
                </h3>

                <p className="text-slate-400 font-medium mb-8 max-w-xs">
                    {isError ? error : isCompleted ? 'Your instance is up to date.' : 'Please wait while we update your modpack files.'}
                </p>

                {!isCompleted && !isError && (
                    <div className="w-full space-y-4 mb-8">
                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                            <span>{status}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${Math.max(2, progress)}%` }}
                            />
                        </div>
                        {currentFile && (
                            <p className="text-xs text-slate-500 truncate font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                                {currentFile}
                            </p>
                        )}
                    </div>
                )}

                {isCompleted && (
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                    >
                        Launch Game
                    </button>
                )}

                {isError && (
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
}
