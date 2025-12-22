import { useState } from 'react';
import axios from 'axios';
import { Package, Plus, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../../config/api';
import { useLogs } from '../../contexts/LogContext';

interface ModpackSelectorProps {
    userId: string;
    mod: any;
    gameVersion?: string;
    loader?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModpackSelector({ userId, mod, gameVersion = '1.20.1', loader = 'fabric', onClose, onSuccess }: ModpackSelectorProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedLoader, setSelectedLoader] = useState(loader.toLowerCase());
    const [success, setSuccess] = useState(false);
    const { setLaunchingInfo } = useLogs();
    const queryClient = useQueryClient();

    // 1. Fetch Modpacks using useQuery
    const { data: modpacks = [], isLoading: loadingModpacks, error: modpacksError } = useQuery({
        queryKey: ['modpacks', userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const response = await axios.get(`${API_BASE_URL}/modpacks/user/${userId}`);
                return Array.isArray(response.data) ? response.data : [];
            } catch (error) {
                console.error('Fetch modpacks error:', error);
                throw error;
            }
        },
        enabled: !!userId,
        retry: 1
    });

    // 2. Mutation for Quick Create
    const quickCreateMutation = useMutation({
        mutationFn: async () => {
            // 1. Create Modpack
            const modpackResponse = await axios.post(`${API_BASE_URL}/modpacks`, {
                name: newName,
                description: `Created for ${mod.title}`,
                authorId: userId
            });

            // 2. Create Initial Version
            const versionResponse = await axios.post(`${API_BASE_URL}/modpacks/${modpackResponse.data.id}/versions`, {
                versionNumber: '1.0.0',
                gameVersion: gameVersion,
                loaderType: selectedLoader,
                loaderVersion: 'latest'
            });

            // 3. Add Mod
            await axios.post(`${API_BASE_URL}/modpacks/versions/${versionResponse.data.id}/mods`, {
                modrinthId: mod.project_id,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.version || null
            });

            // 4. Create Local Instance Folder & Sync
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const mcPath = settings.mcPath || 'C:\\Minecraft';
            await (window as any).api.createInstance({ rootPath: mcPath, modpackName: newName });

            // Detach Sync
            (window as any).api.syncModpack({
                versionId: versionResponse.data.id,
                modpackName: newName,
                rootPath: mcPath,
                gameVersion: gameVersion,
                loaderType: selectedLoader
            }).then(() => {
                setLaunchingInfo({ id: null, launching: false });
            }).catch((err: any) => {
                console.error(err);
                setLaunchingInfo({ id: null, launching: false });
            });

            return modpackResponse.data;
        },
        onMutate: () => {
            setLaunchingInfo({ id: 'new-pack', launching: true });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['modpacks'] });
            onClose(); // Close immediately on success start (sync runs in BG)
            onSuccess();
        },
        onError: () => {
            setLaunchingInfo({ id: null, launching: false }); // Reset global state on error
        }
    });

    // 3. Mutation for Install existing
    const installMutation = useMutation({
        mutationFn: async (modpackId: string) => {
            const modpack = modpacks.find(p => p.id === modpackId);
            const versionId = modpack?.versions?.[0]?.id;

            if (!versionId) throw new Error('No version found for this modpack.');

            await axios.post(`${API_BASE_URL}/modpacks/versions/${versionId}/mods`, {
                modrinthId: mod.project_id,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: mod.version || null
            });

            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const mcPath = settings.mcPath || 'C:\\Minecraft';

            (window as any).api.syncModpack({
                versionId: versionId,
                modpackName: modpack.name,
                rootPath: mcPath,
                gameVersion: modpack.versions[0].gameVersion,
                loaderType: modpack.versions[0].loaderType
            }).then(() => {
                setLaunchingInfo({ id: null, launching: false });
            }).catch((err: any) => {
                console.error(err);
                setLaunchingInfo({ id: null, launching: false });
            });
        },
        onMutate: (modpackId) => {
            setLaunchingInfo({ id: modpackId, launching: true });
        },
        onSuccess: () => {
            setSuccess(true);
            setTimeout(() => {
                onSuccess();
            }, 1000);
        },
        onError: () => {
            setLaunchingInfo({ id: null, launching: false });
        }
    });

    const error = quickCreateMutation.error?.message || installMutation.error?.message || (modpacksError as any)?.response?.data?.message || (modpacksError ? 'Failed to load modpacks' : null);

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
                    ) : loadingModpacks ? (
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
                            <button
                                onClick={() => setShowCreate(true)}
                                className="w-full py-4 border-2 border-dashed border-indigo-500/30 rounded-2xl text-indigo-400 font-black hover:bg-indigo-500/10 hover:border-indigo-500 hover:text-indigo-300 transition-all flex items-center justify-center gap-3 mb-2"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Create New Modpack</span>
                            </button>

                            {modpacks.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => installMutation.mutate(pack.id)}
                                    disabled={installMutation.isPending}
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
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Modpack Name</label>
                                <input
                                    type="text"
                                    placeholder="My Awesome Pack"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-400">Mod Loader</label>
                                <select
                                    value={selectedLoader}
                                    onChange={(e) => setSelectedLoader(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="fabric">Fabric</option>
                                    <option value="forge">Forge</option>
                                    <option value="neoforge">NeoForge</option>
                                    <option value="quilt">Quilt</option>
                                </select>
                            </div>

                            <button
                                onClick={() => quickCreateMutation.mutate()}
                                disabled={quickCreateMutation.isPending || !newName.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black transition-all disabled:opacity-50 mt-4"
                            >
                                {quickCreateMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Create & Add Mod'}
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
