import React, { createContext, useContext, useState, useEffect } from 'react';

interface LogContextType {
    logs: string[];
    status: string;
    progress: number;
    launching: boolean;
    isRunning: boolean;
    activePackId: string | null;
    setLaunchingInfo: (info: { id: string | null; launching: boolean }) => void;
    clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState('');
    const [progress, setProgress] = useState(0);
    const [launching, setLaunching] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [activePackId, setActivePackId] = useState<string | null>(null);

    useEffect(() => {
        if (!(window as any).api) return;

        const handleLog = (_event: any, message: string) => {
            setLogs(prev => [...prev, message]);
        };

        const handleStatus = (_event: any, data: any) => {
            if (data.status) setStatus(data.status);
            if (data.progress !== undefined) setProgress(data.progress);
        };

        const handleRunning = (_event: any) => {
            setIsRunning(true);
            setLaunching(false);
        };

        const handleClose = (_event: any) => {
            setLaunching(false);
            setIsRunning(false);
            setProgress(0);
        };

        const removeLog = (window as any).api.onLaunchLog(handleLog);
        const removeStatus = (window as any).api.onLaunchStatus(handleStatus);
        const removeClose = (window as any).api.onLaunchClose(handleClose);
        const removeRunning = (window as any).api.onLaunchRunning(handleRunning);

        return () => {
            removeLog?.();
            removeStatus?.();
            removeClose?.();
            removeRunning?.();
        };
    }, []);

    const setLaunchingInfo = (info: { id: string | null; launching: boolean }) => {
        setActivePackId(info.id);
        setLaunching(info.launching);
        if (!info.launching) {
            setIsRunning(false);
        } else {
            setIsRunning(false); // Reset to false when starting a new launch
            setLogs([]);
            setProgress(0);
            setStatus('Preparing...');
        }
    };

    const clearLogs = () => setLogs([]);

    return (
        <LogContext.Provider value={{
            logs,
            status,
            progress,
            launching,
            isRunning,
            activePackId,
            setLaunchingInfo,
            clearLogs
        }}>
            {children}
        </LogContext.Provider>
    );
}

export function useLogs() {
    const context = useContext(LogContext);
    if (context === undefined) {
        throw new Error('useLogs must be used within a LogProvider');
    }
    return context;
}
