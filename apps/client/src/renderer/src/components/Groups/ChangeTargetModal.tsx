import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { X, Calendar, Shield } from 'lucide-react';

interface ChangeTargetModalProps {
    groupId: string;
    currentVersionId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ChangeTargetModal: React.FC<ChangeTargetModalProps> = ({ groupId, currentVersionId, onClose, onSuccess }) => {
    const [modpacks, setModpacks] = useState<any[]>([]);
    const [selectedModpack, setSelectedModpack] = useState<any>(null);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(currentVersionId || null);

    useEffect(() => {
        fetchModpacks();
    }, []);

    const fetchModpacks = async () => {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (!user.id) return;

            const response = await axios.get(`${API_BASE_URL}/modpacks/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter by authorId as double-layer security
            const filtered = (Array.isArray(response.data) ? response.data : [])
                .filter(mp => mp.authorId === user.id);
            setModpacks(filtered);

            // If currentVersionId exists, try to pre-select path
            if (currentVersionId && response.data.length > 0) {
                // Logic to find which modpack has this version would require more data or iterating
                // For now, simplify.
            }

        } catch (error) {
            console.error('Failed to fetch modpacks:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedVersionId || !selectedModpack) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/groups/${groupId}/target`, {
                modpackId: selectedModpack.id,
                versionId: selectedVersionId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to update target:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg flex flex-col shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-xl">
                    <h3 className="text-lg font-bold text-zinc-100">Set Group Target</h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
                        <X size={20} className="text-zinc-400" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Modpack Selection */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Modpack</label>
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                            {modpacks.map(mp => (
                                <button
                                    key={mp.id}
                                    onClick={() => { setSelectedModpack(mp); setSelectedVersionId(null); }}
                                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all
                                        ${selectedModpack?.id === mp.id
                                            ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100'
                                            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}
                                >
                                    <Shield size={18} className={selectedModpack?.id === mp.id ? 'text-emerald-500' : 'text-zinc-500'} />
                                    <span className="font-medium">{mp.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Version Selection */}
                    {selectedModpack && (
                        <div className="animate-in slide-in-from-top-2 fade-in">
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Select Version</label>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                {selectedModpack.versions?.length > 0 ? selectedModpack.versions.map((ver: any) => (
                                    <button
                                        key={ver.id}
                                        onClick={() => setSelectedVersionId(ver.id)}
                                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all
                                            ${selectedVersionId === ver.id
                                                ? 'bg-indigo-900/20 border-indigo-500/50 text-indigo-100'
                                                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}
                                    >
                                        <span className="font-mono">{ver.versionNumber}</span>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <Calendar size={12} />
                                            {new Date(ver.createdAt).toLocaleDateString()}
                                        </div>
                                    </button>
                                )) : (
                                    <div className="text-zinc-500 text-sm italic p-2">No versions available</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-zinc-950/30 rounded-b-xl flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedVersionId}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                        Save Target
                    </button>
                </div>
            </div>
        </div>
    );
};
