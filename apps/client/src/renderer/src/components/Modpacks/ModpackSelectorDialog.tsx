import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, X, Loader2, FolderPlus } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ModpackSelectorDialogProps {
    mod: any;
    gameVersion: string;
    loader: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModpackSelectorDialog({ mod, gameVersion, loader, onClose, onSuccess }: ModpackSelectorDialogProps) {
    const [modpacks, setModpacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newModpackName, setNewModpackName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
        fetchModpacks();
    }, []);

    const fetchModpacks = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                console.error('No user ID found');
                return;
            }

            const response = await axios.get(`${API_BASE_URL}/modpacks/user/${userId}`);
            // Filter modpacks that match the game version and loader
            const compatiblePacks = response.data.filter((pack: any) => {
                const version = pack.versions?.[0];
                return version?.gameVersion === gameVersion &&
                    version?.loaderType?.toLowerCase() === loader?.toLowerCase();
            });
            setModpacks(compatiblePacks);
        } catch (err) {
            console.error('Failed to fetch modpacks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToModpack = async (modpackId: string) => {
        try {
            const modpack = modpacks.find(p => p.id === modpackId);
            if (!modpack) return;

            const versionId = modpack.versions[0].id;
            await axios.post(`${API_BASE_URL}/modpacks/versions/${versionId}/mods`, {
                modrinthId: mod.project_id || mod.slug,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.versionId || null,
                projectType: mod.project_type || 'mod'
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to add mod to modpack:', err);
        }
    };

    const handleCreateModpack = async () => {
        if (!newModpackName.trim()) return;

        setCreating(true);
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                console.error('No user ID found');
                return;
            }

            // Create new modpack
            const response = await axios.post(`${API_BASE_URL}/modpacks`, {
                name: newModpackName,
                userId,
                gameVersion,
                loaderType: loader,
                loaderVersion: 'latest'
            });

            const newModpack = response.data;
            const versionId = newModpack.versions[0].id;

            // Add mod to the new modpack
            await axios.post(`${API_BASE_URL}/modpacks/versions/${versionId}/mods`, {
                modrinthId: mod.project_id || mod.slug,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.versionId || null,
                projectType: mod.project_type || 'mod'
            });

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create modpack:', err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-600/20 rounded-2xl flex items-center justify-center">
                            <Package className="w-7 h-7 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Add Mod to Modpack</h2>
                            <p className="text-slate-400 font-medium">Choose where to add "{mod.title}"</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {showCreateForm ? (
                        <div className="space-y-4">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-emerald-500 hover:text-emerald-400 font-bold text-sm flex items-center gap-2"
                            >
                                ← Back to selection
                            </button>
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
                                <h3 className="text-xl font-black text-white">Create New Modpack</h3>
                                <input
                                    type="text"
                                    value={newModpackName}
                                    onChange={(e) => setNewModpackName(e.target.value)}
                                    placeholder="Enter modpack name..."
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newModpackName.trim()) {
                                            handleCreateModpack();
                                        }
                                    }}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleCreateModpack}
                                        disabled={!newModpackName.trim() || creating}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-5 h-5" />
                                                Create & Add Mod
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="w-full bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-500 hover:text-white px-6 py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3"
                            >
                                <FolderPlus className="w-6 h-6" />
                                Create New Modpack
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-slate-900 text-slate-500 font-bold uppercase tracking-widest">Or add to existing</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                            ) : modpacks.length > 0 ? (
                                <div className="space-y-3">
                                    {modpacks.map((pack) => (
                                        <button
                                            key={pack.id}
                                            onClick={() => handleAddToModpack(pack.id)}
                                            className="w-full bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-white font-bold text-lg">{pack.name}</p>
                                                    <p className="text-slate-500 text-xs font-medium">
                                                        {pack.versions[0]?.mods?.length || 0} mods • {pack.versions[0]?.gameVersion} • {pack.versions[0]?.loaderType}
                                                    </p>
                                                </div>
                                            </div>
                                            <Plus className="w-5 h-5 text-slate-500 group-hover:text-emerald-500 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                                    <Package className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                                    <p className="text-slate-500 font-bold text-lg mb-2">No Compatible Modpacks</p>
                                    <p className="text-slate-600 text-sm">
                                        Create a new modpack for {gameVersion} • {loader}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
