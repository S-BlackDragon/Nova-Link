import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

interface ToastProviderProps {
    children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto-remove after duration (default 5 seconds)
        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message, duration: 8000 }); // Errors stay longer
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    const warning = useCallback((title: string, message?: string) => {
        addToast({ type: 'warning', title, message, duration: 6000 });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
}

// Toast Container Component
interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
            ))}
        </div>
    );
}

// Individual Toast Component
interface ToastItemProps {
    toast: Toast;
    onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/30',
            iconColor: 'text-emerald-400',
            titleColor: 'text-emerald-300',
        },
        error: {
            icon: AlertCircle,
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            iconColor: 'text-red-400',
            titleColor: 'text-red-300',
        },
        warning: {
            icon: AlertTriangle,
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            iconColor: 'text-amber-400',
            titleColor: 'text-amber-300',
        },
        info: {
            icon: Info,
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            iconColor: 'text-blue-400',
            titleColor: 'text-blue-300',
        },
    };

    const style = config[toast.type];
    const Icon = style.icon;

    return (
        <div
            className={`${style.bg} backdrop-blur-xl border ${style.border} rounded-2xl p-4 shadow-2xl pointer-events-auto animate-in slide-in-from-right-5 duration-300`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                    <h3 className={`${style.titleColor} font-bold text-sm mb-0.5`}>{toast.title}</h3>
                    {toast.message && (
                        <p className="text-slate-400 text-xs">{toast.message}</p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
