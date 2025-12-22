import { useEffect, useRef, useState } from 'react';
import { Terminal, X, Minimize2 } from 'lucide-react';
import { useLogs } from '../contexts/LogContext';

interface LauncherConsoleProps {
    onClose?: () => void;
    isEmbedded?: boolean;
}

export default function LauncherConsole({ onClose, isEmbedded }: LauncherConsoleProps) {
    const { logs } = useLogs();
    const bottomRef = useRef<HTMLDivElement>(null);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (bottomRef.current && (!isMinimized || isEmbedded)) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isMinimized, isEmbedded]);

    if (!isEmbedded && isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-4 right-4 z-[110] bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-xl hover:bg-slate-800 transition-colors flex items-center gap-3 text-white"
            >
                <Terminal className="w-5 h-5 text-emerald-500" />
                <span className="font-bold">Launcher Console</span>
            </button>
        );
    }

    return (
        <div className={isEmbedded ? "w-full h-full flex flex-col font-mono text-sm" : "fixed inset-0 z-[110] flex items-center justify-center p-6 pointer-events-none"}>
            <div className={isEmbedded ? "flex-1 flex flex-col overflow-hidden" : "bg-slate-950 border border-white/10 w-full max-w-4xl h-[600px] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto font-mono text-sm"}>
                <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-emerald-500" />
                        <span className="text-white font-bold tracking-tight">Minecraft Launcher Log</span>
                    </div>
                    {!isEmbedded && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <Minimize2 className="w-4 h-4" />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-slate-300 space-y-1 custom-scrollbar">
                    {logs.length === 0 && (
                        <div className="text-slate-600 italic">Waiting for logs...</div>
                    )}
                    {logs.map((log, i) => (
                        <div key={i} className="break-all whitespace-pre-wrap font-mono">
                            <span className="text-slate-500 mr-3">[{new Date().toLocaleTimeString()}]</span>
                            {log}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}
