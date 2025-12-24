import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Loader2, X, CheckCircle2, AlertCircle, ChevronDown, Layers, Terminal, Hash } from 'lucide-react';
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

export default function ModpackSelector({ userId, mod, gameVersion: initialGameVersion = '1.20.1', loader = 'fabric', onClose, onSuccess }: ModpackSelectorProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [selectedGameVersion, setSelectedGameVersion] = useState(initialGameVersion);
    const [selectedLoader, setSelectedLoader] = useState(loader.toLowerCase());
    const [selectedLoaderVersion, setSelectedLoaderVersion] = useState('latest');
    const [availableGameVersions, setAvailableGameVersions] = useState<string[]>(['1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5']);
    const [supportedLoaders, setSupportedLoaders] = useState<string[]>([]);
    const [availableLoaderVersions, setAvailableLoaderVersions] = useState<string[]>([]);
    const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);
    const [versionMap, setVersionMap] = useState<Map<string, Set<string>>>(new Map());

    const [success, setSuccess] = useState(false);
    const { setLaunchingInfo } = useLogs();
    const queryClient = useQueryClient();

    // Auto-detect version and loader from mod metadata
    useEffect(() => {
        const detect = async () => {
            try {
                const response = await axios.get(`https://api.modrinth.com/v2/project/${mod.project_id || mod.slug}/version`);
                if (response.data && response.data.length > 0) {
                    const allVersions = new Set<string>();
                    const map = new Map<string, Set<string>>(); // gameVer -> loaders

                    response.data.forEach((v: any) => {
                        // Filter out alpha/beta if needed? For now include all.
                        v.game_versions?.forEach((gv: string) => {
                            allVersions.add(gv);
                            if (!map.has(gv)) map.set(gv, new Set());
                            v.loaders?.forEach((l: string) => {
                                map.get(gv)?.add(l.toLowerCase());
                            });
                        });
                    });

                    setVersionMap(map);

                    // Update available versions based on mod support
                    const supportedVersions = Array.from(allVersions)
                        .filter(v => availableGameVersions.includes(v) || v.match(/^\d+\.\d+(\.\d+)?$/)) // standard versions
                        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

                    if (supportedVersions.length > 0) {
                        setAvailableGameVersions(supportedVersions);

                        // Auto-select best version (newest)
                        const bestVersion = supportedVersions[0];
                        setSelectedGameVersion(bestVersion);

                        // Loaders will be updated by the dependency effect on [selectedGameVersion]
                    }
                }
            } catch (err) {
                console.error('Failed to auto-detect mod info:', err);
            }
        };
        detect();
    }, [mod.project_id, mod.slug]);

    // Update supported loaders when game version changes
    useEffect(() => {
        if (versionMap.has(selectedGameVersion)) {
            const loaders = Array.from(versionMap.get(selectedGameVersion) || []);
            setSupportedLoaders(loaders);

            // Auto-select best loader if current not supported
            if (!loaders.includes(selectedLoader)) {
                const loaderPriority = ['fabric', 'neoforge', 'forge', 'quilt'];
                const bestLoader = loaderPriority.find(l => loaders.includes(l));
                if (bestLoader) {
                    setSelectedLoader(bestLoader);
                } else if (loaders.length > 0) {
                    setSelectedLoader(loaders[0]);
                }
            }
        }
    }, [selectedGameVersion, versionMap]);

    // Fetch Loader Versions
    useEffect(() => {
        const fetchLoaderVersions = async () => {
            setLoadingLoaderVersions(true);
            setAvailableLoaderVersions([]);
            setSelectedLoaderVersion('latest');

            try {
                if (selectedLoader === 'fabric') {
                    const res = await axios.get('https://meta.fabricmc.net/v2/versions/loader');
                    // Just take top 20 stable versions
                    const versions = res.data.map((v: any) => v.version).slice(0, 20);
                    setAvailableLoaderVersions(versions);
                } else if (selectedLoader === 'quilt') {
                    const res = await axios.get('https://meta.quiltmc.org/v3/versions/loader');
                    const versions = res.data.map((v: any) => v.version).slice(0, 20);
                    setAvailableLoaderVersions(versions);
                } else if (selectedLoader === 'neoforge') {
                    const res = await axios.get('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
                    const match = res.data.matchAll(/<version>(.*?)<\/version>/g);
                    const all = Array.from(match).map((m: any) => m[1]);

                    // Filter by MC version
                    const gameParts = selectedGameVersion.split('.');
                    const minor = parseInt(gameParts[1]);
                    let filtered: string[] = [];

                    if (minor >= 21) {
                        // 21.x format
                        const prefix = `${minor}.${gameParts[2] || 0}.`;
                        filtered = all.filter(v => v.startsWith(prefix));
                    } else {
                        // 1.20 format "1.20.1-..."
                        const prefix = `${selectedGameVersion}-`;
                        filtered = all.filter(v => v.startsWith(prefix));
                    }

                    filtered.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
                    setAvailableLoaderVersions(filtered.slice(0, 30));
                    if (filtered.length > 0) setSelectedLoaderVersion(filtered[0]);

                } else if (selectedLoader === 'forge') {
                    // Start with 'latest' and 'recommended' as explicit options, then list others if possible?
                    // Forge maven is huge.
                    // We'll use the promotions_slim.json to get recommended/latest
                    const res = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
                    const promos = res.data.promos;
                    const specific: string[] = [];
                    if (promos[`${selectedGameVersion}-latest`]) specific.push(promos[`${selectedGameVersion}-latest`]);
                    if (promos[`${selectedGameVersion}-recommended`]) specific.push(promos[`${selectedGameVersion}-recommended`]);

                    const unique = Array.from(new Set(specific));
                    // If we want more, we need full maven xml. simpler for now.
                    if (unique.length === 0) {
                        setAvailableLoaderVersions(['latest']);
                    } else {
                        setAvailableLoaderVersions([...unique]);
                        setSelectedLoaderVersion(unique[0]);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch loader versions', e);
                setAvailableLoaderVersions(['latest']);
            } finally {
                setLoadingLoaderVersions(false);
            }
        };

        if (showCreate) {
            fetchLoaderVersions();
        }
    }, [selectedLoader, selectedGameVersion, showCreate]);


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
                gameVersion: selectedGameVersion,
                loaderType: selectedLoader,
                loaderVersion: selectedLoaderVersion === 'latest' && selectedLoader === 'neoforge' ? availableLoaderVersions[0] : selectedLoaderVersion
            });

            // 3. Add Mod
            await axios.post(`${API_BASE_URL}/modpacks/versions/${versionResponse.data.id}/mods`, {
                modrinthId: mod.project_id,
                name: mod.title,
                iconUrl: mod.icon_url,
                versionId: null // Let backend pick matching version
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
                gameVersion: selectedGameVersion,
                loaderType: selectedLoader,
                neoForgeVersionId: selectedLoader === 'neoforge' ? `neoforge-${selectedLoaderVersion}` : undefined // Hint for backend/sync
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
                                            <p className="text-slate-500 text-sm font-medium">{pack.versions?.[0]?.gameVersion || 'Unknown version'} • {pack.versions?.[0]?.loaderType}</p>
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
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Modpack Name</label>
                                <input
                                    type="text"
                                    placeholder="My Awesome Pack"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-slate-800 border border-white/5 rounded-xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                        <Layers className="w-3 h-3" />
                                        Game Version
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedGameVersion}
                                            onChange={(e) => setSelectedGameVersion(e.target.value)}
                                            className="w-full appearance-none bg-slate-800 border border-white/5 rounded-xl p-4 pr-10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            {availableGameVersions.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                        <Terminal className="w-3 h-3" />
                                        Loader Type
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedLoader}
                                            onChange={(e) => setSelectedLoader(e.target.value)}
                                            className="w-full appearance-none bg-slate-800 border border-white/5 rounded-xl p-4 pr-10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            {supportedLoaders.length > 0 ? (
                                                supportedLoaders.map(l => (
                                                    <option key={l} value={l}>
                                                        {l.charAt(0).toUpperCase() + l.slice(1)}
                                                    </option>
                                                ))
                                            ) : (
                                                ['fabric', 'forge', 'neoforge', 'quilt'].map(l => (
                                                    <option key={l} value={l}>
                                                        {l.charAt(0).toUpperCase() + l.slice(1)}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                        <Hash className="w-3 h-3" />
                                        Loader Version
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedLoaderVersion}
                                            onChange={(e) => setSelectedLoaderVersion(e.target.value)}
                                            disabled={loadingLoaderVersions}
                                            className="w-full appearance-none bg-slate-800 border border-white/5 rounded-xl p-4 pr-10 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                                        >
                                            {loadingLoaderVersions ? (
                                                <option>Loading...</option>
                                            ) : availableLoaderVersions.length > 0 ? (
                                                availableLoaderVersions.map(v => (
                                                    <option key={v} value={v}>{v}</option>
                                                ))
                                            ) : (
                                                <option value="latest">Latest</option>
                                            )}
                                        </select>
                                        {loadingLoaderVersions ? (
                                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5 animate-spin" />
                                        ) : (
                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => quickCreateMutation.mutate()}
                                disabled={quickCreateMutation.isPending || !newName.trim()}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black transition-all disabled:opacity-50 mt-4 active:scale-[0.98] shadow-xl"
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
