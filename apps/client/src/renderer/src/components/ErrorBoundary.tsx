import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950 p-6">
                    <div className="bg-slate-900 border border-red-500/20 rounded-[2rem] p-10 max-w-2xl w-full shadow-2xl shadow-red-500/10">
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 ring-4 ring-red-500/10">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-2">Something went wrong</h1>
                            <p className="text-slate-400 text-lg">
                                Nova Link encountered a critical error and had to stop.
                            </p>
                        </div>

                        <div className="bg-slate-950/50 rounded-xl p-6 border border-white/5 mb-8 text-left overflow-auto max-h-60">
                            <p className="text-red-400 font-mono font-bold text-sm mb-2">
                                {this.state.error?.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
