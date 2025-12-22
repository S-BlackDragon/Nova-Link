import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface ModpackSelectorProps {
    userId: string;
    mod: any;
    gameVersion?: string;
    loader?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModpackSelector({ userId, mod, gameVersion = '1.20.1', loader = 'fabric', onClose, onSuccess }: ModpackSelectorProps) {
    const [modpacks, setModpacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [installing, setInstalling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        const fetchModpacks = async () => {
            if (!userId) {
                setError('User ID missing.');
                setLoading(false);
                return;
            }
            try {
                const response = await axios.get(`http://127.0.0.1:3000/modpacks/user/${userId}`);
                setModpacks(response.data);
            } catch (err) {
                console.error('Failed to load modpacks:', err);
                setError('Failed to load modpacks.');
            } finally {
                setLoading(false);
            }
        };
        fetchModpacks();
    }, [userId]);

    const handleQuickCreate = async () => {
        if (!newName.trim()) return;
        setInstalling(true);
        setError(null);
        try {
            // 1. Create Modpack
            const modpackResponse = await axios.post('http://127.0.0.1:3000/modpacks', {
                name: newName,
                description: `Created for ${mod.title}`,
                authorId: userId
            });

            // 2. Create Initial Version
            const versionResponse = await axios.post(`http://127.0.0.1:3000/modpacks/${modpackResponse.data.id}/versions`, {
                versionNumber: '1.0.0',
                gameVersion: gameVersion,
                loaderType: loader.toLowerCase(),
                loaderVersion: 'latest'
            });

            // 3. Add Mod
            await axios.post(`http://127.0.0.1:3000/modpacks/versions/${versionResponse.data.id}/mods`, {
                modrinthId: mod.project_id,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.version || null
            });

            // 4. Create Local Instance Folder & Sync
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const mcPath = settings.mcPath || 'C:\\Minecraft';
            await (window as any).api.createInstance({ rootPath: mcPath, modpackName: newName });

            await (window as any).api.syncModpack({
                versionId: versionResponse.data.id,
                modpackName: newName,
                rootPath: mcPath,
                gameVersion: gameVersion,
                loaderType: loader.toLowerCase()
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err: any) {
            console.error('Failed to quick create:', err);
            setError(err.response?.data?.message || 'Failed to create modpack.');
        } finally {
            setInstalling(false);
        }
    };

    const handleInstall = async (modpackId: string) => {
        setInstalling(true);
        setError(null);
        try {
            const modpack = modpacks.find(p => p.id === modpackId);
            const versionId = modpack?.versions?.[0]?.id;

            if (!versionId) {
                throw new Error('No version found for this modpack.');
            }

            await axios.post(`http://127.0.0.1:3000/modpacks/versions/${versionId}/mods`, {
                modrinthId: mod.project_id,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.version || null
            });

            // 2. Sync Mods
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const mcPath = settings.mcPath || 'C:\\Minecraft';
            await (window as any).api.syncModpack({
                versionId: versionId,
                modpackName: modpack.name,
                rootPath: mcPath,
                gameVersion: modpack.versions[0].gameVersion,
                loaderType: modpack.versions[0].loaderType
            });

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err: any) {
            console.error('Failed to add mod:', err);
            setError(err.response?.data?.message || 'Failed to add mod to modpack.');
        } finally {
            setInstalling(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[80vh] relative">
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center shadow-inner">
                            <Package className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Add to Modpack</h2>
                            <p className="text-slate-400 font-medium">Select a modpack for <span className="text-emerald-400">{mod.title || mod.name}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                    {success ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3">Mod Added!</h3>
                            <p className="text-slate-400 text-lg font-medium">The mod has been successfully added to your pack.</p>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                            <p className="text-slate-500 font-bold">Loading your modpacks...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-4 text-lg">
                            <AlertCircle className="w-8 h-8 flex-shrink-0" />
                            <p className="font-medium">{error}</p>
                        </div>
                    ) : modpacks.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {modpacks.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => handleInstall(pack.id)}
                                    disabled={installing}
                                    className="w-full flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all duration-300 group text-left"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
                                            <Package className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-black text-lg group-hover:text-indigo-400 transition-colors">{pack.name}</p>
                                            <p className="text-slate-500 text-sm font-medium">{pack.versions?.[0]?.gameVersion || 'Unknown version'}</p>
                                        </div>
                                    </div>
                                    <Plus className="w-6 h-6 text-slate-600 group-hover:text-indigo-400 group-hover:scale-110 transition-all" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                            <Package className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-slate-400">No modpacks found</h3>
                            <p className="text-slate-600 mt-2 font-medium mb-8">You need to create a modpack first.</p>
                            <button
                                onClick={() => setShowCreate(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black transition-all"
                            >
                                Create Modpack
                            </button>
                        </div>
                    )}
                </div>

                {showCreate && (
                    <div className="absolute inset-0 z-20 bg-slate-900 p-10 flex flex-col">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-2xl font-black text-white">Quick Create</h3>
                            <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-6">
                            <input
                                type="text"
                                placeholder="Modpack Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 text-white font-bold"
                            />
                            <button
                                onClick={handleQuickCreate}
                                disabled={installing || !newName.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black transition-all disabled:opacity-50"
                            >
                                {installing ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Create & Add Mod'}
                            </button>
                        </div>
                    </div>
                )}

                {!success && (
                    <div className="p-10 bg-white/[0.02] border-t border-white/5 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
