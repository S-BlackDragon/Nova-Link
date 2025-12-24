import React from 'react';
import { X, Trash2, ShieldAlert } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    type?: 'danger' | 'warning';
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Delete',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden group">

                {/* Background Glow */}
                <div className={`absolute -top-24 -left-24 w-48 h-48 ${type === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10'} rounded-full blur-[100px] transition-all group-hover:blur-[120px]`} />
                <div className={`absolute -bottom-24 -right-24 w-48 h-48 ${type === 'danger' ? 'bg-red-500/5' : 'bg-amber-500/5'} rounded-full blur-[100px] transition-all group-hover:blur-[120px]`} />

                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className={`w-20 h-20 ${type === 'danger' ? 'bg-red-500/10 text-red-500 shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)]' : 'bg-amber-500/10 text-amber-500 shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)]'} rounded-[2rem] flex items-center justify-center mb-8 border border-white/5`}>
                        {type === 'danger' ? <Trash2 className="w-10 h-10" /> : <ShieldAlert className="w-10 h-10" />}
                    </div>

                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed mb-10 px-4">
                        {description}
                    </p>

                    <div className="flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-black text-slate-400 hover:bg-white/5 hover:text-white transition-all transform active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-4 ${type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'} text-white rounded-2xl font-black text-lg shadow-lg transition-all transform active:scale-95 hover:-translate-y-1`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
