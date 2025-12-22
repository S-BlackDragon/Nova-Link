import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Trash2, X, Loader2, ExternalLink, AlertCircle, Eye, EyeOff, Search, Terminal, Play, Square, Folder, RotateCw } from 'lucide-react';
import LauncherConsole from '../LauncherConsole';
import ModSearch from './ModSearch';
import ModDetailsModal from './ModDetailsModal';
import { useLogs } from '../../contexts/LogContext';

interface ModpackDetailsProps {
    modpackId: string;
    onClose: () => void;
}

type Tab = 'content' | 'search' | 'logs';
type ContentType = 'mod' | 'resourcepack' | 'shader' | 'datapack';

export default function ModpackDetails({ modpackId, onClose }: ModpackDetailsProps) {
    const [modpack, setModpack] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [localLaunching, setLocalLaunching] = useState(false);
    const { launching: globalLaunching, activePackId, setLaunchingInfo, status: launchStatus, progress: launchProgress } = useLogs();
    const [activeTab, setActiveTab] = useState<Tab>('content');
    const [activeContentType, setActiveContentType] = useState<ContentType>('mod');
    const [diskFiles, setDiskFiles] = useState<string[]>([]);
    const [detailedModId, setDetailedModId] = useState<string | null>(null);

    const launching = localLaunching || (globalLaunching && activePackId === modpackId);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`http://127.0.0.1:3000/modpacks/${modpackId}`);
            setModpack(response.data);
            await Promise.all([
                fetchDiskFiles(response.data, activeContentType),
                checkRunningStatus(response.data)
            ]);
        } catch (err) {
            console.error('Failed to fetch modpack details:', err);
            setError('Failed to load modpack details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDiskFiles = async (packData = modpack, type = activeContentType) => {
        if (!packData) return;
        try {
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const rootPath = settings.mcPath || 'C:\\Minecraft';
            const files = await (window as any).api.listMods({
                rootPath,
                modpackName: packData.name,
                type
            });
            setDiskFiles(files);
        } catch (e) {
            console.error('Failed to list disk files:', e);
        }
    };

    useEffect(() => {
        if (activeTab === 'content') {
            fetchDiskFiles(modpack, activeContentType);
        }
    }, [activeContentType, activeTab]);

    const checkRunningStatus = async (packData = modpack) => {
        if (!packData) return;
        try {
            const isRunning = await (window as any).api.isInstanceRunning(packData.name);
            setLocalLaunching(isRunning);
        } catch (e) {
            console.error('Failed to check running status:', e);
        }
    };


    useEffect(() => {
        fetchDetails();
    }, [modpackId]);

    useEffect(() => {
        const removeListener = (window as any).api.onLaunchClose(() => {
            setLocalLaunching(false);
        });
        return () => {
            if (typeof removeListener === 'function') removeListener();
        };
    }, []);

    const handleSync = async () => {
        if (!modpack || !currentVersion) return;
        setSyncing(true);
        try {
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const rootPath = settings.mcPath || 'C:\\Minecraft';

            await (window as any).api.syncModpack({
                versionId: currentVersion.id,
                modpackName: modpack.name,
                rootPath,
                gameVersion: currentVersion.gameVersion,
                loaderType: currentVersion.loaderType
            });
            await fetchDetails();
        } catch (err) {
            console.error('Sync failed:', err);
            setError('Failed to sync modpack files.');
        } finally {
            setSyncing(false);
        }
    };

    const handleRemoveMod = async (modId: string) => {
        try {
            await axios.delete(`http://127.0.0.1:3000/modpacks/mods/${modId}`);
            fetchDetails();
        } catch (err) {
            console.error('Failed to remove mod:', err);
        }
    };

    const handleToggleMod = async (modId: string, currentStatus: boolean) => {
        try {
            await axios.patch(`http://127.0.0.1:3000/modpacks/mods/${modId}`, {
                enabled: !currentStatus
            });
            // Optimistic update
            setModpack((prev: any) => {
                if (!prev) return null;
                const newVersions = [...prev.versions];
                const version = newVersions[0];
                version.mods = version.mods.map((m: any) =>
                    m.id === modId ? { ...m, enabled: !currentStatus } : m
                );
                return { ...prev, versions: newVersions };
            });
        } catch (err) {
            console.error('Failed to toggle mod:', err);
        }
    };

    const currentVersion = modpack?.versions?.[0];
    const mods = currentVersion?.mods || [];
    // Content listing logic:
    // Filter DB mods by current active content type
    const dbMods = mods.filter((m: any) => m.projectType === activeContentType);

    const mergedContent = diskFiles.map(filename => {
        const dbMod = dbMods.find((m: any) => m.name.toLowerCase().includes(filename.replace('.jar', '').replace('.zip', '').toLowerCase()) || filename.toLowerCase().includes(m.name.toLowerCase()));

        return {
            id: dbMod?.id || filename,
            name: dbMod?.name || filename,
            iconUrl: dbMod?.iconUrl,
            modrinthId: dbMod?.modrinthId,
            enabled: dbMod?.enabled ?? true,
            isExternal: !dbMod,
            filename
        };
    });

    // Filter content
    const filteredContent = mergedContent.filter((mod: any) =>
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mod.modrinthId && mod.modrinthId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        mod.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLaunch = async () => {
        if (!currentVersion) return;
        setLaunchingInfo({ id: modpackId, launching: true });
        setLocalLaunching(true);
        setActiveTab('logs'); // Auto switch to logs

        try {
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const rootBase = settings.mcPath || 'C:\\Minecraft';

            const options = {
                versionId: currentVersion.id,
                gameVersion: currentVersion.gameVersion,
                loaderType: currentVersion.loaderType,
                loaderVersion: currentVersion.loaderVersion,
                modpackName: modpack.name,
                rootPath: rootBase,
                memory: settings.maxMemory || '4G',
                auth: { name: 'Player' }
            };

            const result = await (window as any).api.launchMinecraft(options);
            if (!result.success) {
                setLaunchingInfo({ id: null, launching: false });
                setLocalLaunching(false);
                setError(`Launch failed: ${result.error}`);
            }
        } catch (err: any) {
            console.error('Launch failed:', err);
            setError('Failed to launch Minecraft.');
            setLaunchingInfo({ id: null, launching: false });
            setLocalLaunching(false);
        }
    };

    const handleStop = async () => {
        if (!modpack) return;
        try {
            await (window as any).api.stopInstance(modpack.name);
            setLocalLaunching(false);
            setLaunchingInfo({ id: null, launching: false });
        } catch (err) {
            console.error('Stop failed:', err);
        }
    };

    const handleOpenFolder = async () => {
        if (!modpack) return;
        try {
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const rootBase = settings.mcPath || 'C:\\Minecraft';
            const safeName = modpack.name.replace(/[^a-zA-Z0-9-]/g, '_');
            const folderPath = `${rootBase}\\instances\\${safeName}`;

            // Ensure it exists first
            await (window as any).api.createInstance({ rootPath: rootBase, modpackName: modpack.name });
            // Open it
            await (window as any).api.openFolder(folderPath);
        } catch (err) {
            console.error('Failed to open folder:', err);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !modpack) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <div className="bg-slate-900 p-10 rounded-[2rem] border border-white/10 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-white font-bold">{error || 'Modpack not found.'}</p>
                    <button onClick={onClose} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 w-full max-w-5xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-[85vh]">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center shadow-inner">
                            <Package className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">{modpack.name}</h2>
                            <p className="text-slate-400 font-medium">{currentVersion?.gameVersion} • {currentVersion?.loaderType} {currentVersion?.loaderVersion}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleOpenFolder}
                            className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-white"
                            title="Open Modpack Folder"
                        >
                            <Folder className="w-8 h-8" />
                        </button>
                        {launching ? (
                            <button
                                onClick={handleStop}
                                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-8 py-4 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-lg active:scale-95"
                            >
                                <Square className="w-6 h-6 fill-current" />
                                Stop
                            </button>
                        ) : (
                            <button
                                onClick={handleLaunch}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xl flex items-center gap-3 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                disabled={globalLaunching && activePackId !== modpackId}
                            >
                                <Play className="w-6 h-6 fill-current" />
                                Play
                            </button>
                        )}
                        <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* Progress bar if launching */}
                {launching && globalLaunching && activePackId === modpackId && (
                    <div className="px-8 py-2 bg-indigo-600/10 border-b border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {launchStatus}
                            </span>
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">{launchProgress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-500"
                                style={{ width: `${launchProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-2 px-8 py-4 border-b border-white/5 bg-slate-900/50 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('content')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'content' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Package className="w-5 h-5" />
                        Installed
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'search' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Search className="w-5 h-5" />
                        Add Content
                    </button>
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'logs' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Terminal className="w-5 h-5" />
                        Logs
                    </button>
                </div>

                {activeTab === 'content' && (
                    <div className="flex items-center gap-8 px-10 py-3 bg-white/[0.01] border-b border-white/5 overflow-x-auto no-scrollbar">
                        <CategoryTab active={activeContentType === 'mod'} onClick={() => setActiveContentType('mod')} label="Mods" />
                        <CategoryTab active={activeContentType === 'resourcepack'} onClick={() => setActiveContentType('resourcepack')} label="Resource Packs" />
                        <CategoryTab active={activeContentType === 'shader'} onClick={() => setActiveContentType('shader')} label="Shaders" />
                        <CategoryTab active={activeContentType === 'datapack'} onClick={() => setActiveContentType('datapack')} label="Datapacks" />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <div className="absolute inset-0 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex-1 flex items-center gap-4 bg-slate-800/30 p-5 rounded-[1.5rem] border border-white/5 focus-within:border-emerald-500/50 transition-all shadow-inner">
                                    <Search className="w-6 h-6 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder={`Filter installed ${activeContentType}s...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-transparent border-none text-white focus:outline-none flex-1 font-bold text-lg placeholder:text-slate-600"
                                    />
                                </div>
                                <button
                                    onClick={handleSync}
                                    disabled={syncing}
                                    className="p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-[1.5rem] text-emerald-500 hover:text-white hover:bg-emerald-600 transition-all group active:scale-95 disabled:opacity-50 shadow-xl"
                                    title="Sync with local folder"
                                >
                                    <Loader2 className={`w-6 h-6 ${syncing ? 'animate-spin text-emerald-500' : 'hidden'}`} />
                                    {!syncing && <RotateCw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />}
                                </button>
                            </div>

                            {filteredContent.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredContent.map((mod: any) => (
                                        <div
                                            key={mod.id}
                                            onClick={() => {
                                                if (mod.modrinthId) setDetailedModId(mod.modrinthId);
                                            }}
                                            className={`flex items-center justify-between p-7 bg-white/[0.02] border ${mod.enabled === false ? 'border-red-500/20 opacity-60' : 'border-white/5'} rounded-[2.2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all group cursor-pointer shadow-sm relative overflow-hidden`}
                                        >
                                            <div className="flex items-center gap-6">
                                                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xl relative border border-white/5">
                                                    {mod.iconUrl ? (
                                                        <img
                                                            src={mod.iconUrl}
                                                            alt={mod.name}
                                                            className={`w-full h-full object-cover ${mod.enabled === false ? 'grayscale' : ''}`}
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                                const parent = target.parentElement;
                                                                if (parent) {
                                                                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-slate-500 font-bold">?</div>';
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <Package className="w-10 h-10 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-white font-black text-xl mb-1 truncate ${mod.enabled === false ? 'line-through text-slate-500' : ''}`}>{mod.name}</p>
                                                    <p className="text-slate-500 text-xs font-black tracking-widest uppercase truncate max-w-sm">{mod.filename}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleMod(mod.id, mod.enabled ?? true);
                                                    }}
                                                    className={`p-4 rounded-2xl transition-all shadow-xl ${mod.enabled === false ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                                                    title={mod.enabled === false ? "Enable" : "Disable"}
                                                >
                                                    {mod.enabled === false ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>

                                                {!mod.isExternal && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveMod(mod.id);
                                                        }}
                                                        className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                                    <Package className="w-20 h-20 mx-auto mb-6 text-slate-800" />
                                    <p className="text-slate-500 font-bold text-2xl">No {activeContentType}s found.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search Tab */}
                    {activeTab === 'search' && (
                        <div className="absolute inset-0 overflow-hidden">
                            <ModSearch
                                defaultGameVersion={currentVersion?.gameVersion}
                                defaultLoader={currentVersion?.loaderType}
                                fixedFilters={true}
                                onAddMod={async (mod) => {
                                    try {
                                        await axios.post(`http://127.0.0.1:3000/modpacks/versions/${currentVersion.id}/mods`, {
                                            modrinthId: mod.project_id || mod.slug,
                                            name: mod.title,
                                            iconUrl: mod.icon_url,
                                            versionId: mod.versionId || null
                                        });
                                        await handleSync();
                                        fetchDetails();
                                        setActiveTab('content');
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Logs Tab */}
                    {activeTab === 'logs' && (
                        <div className="absolute inset-0 bg-black">
                            <LauncherConsole isEmbedded={true} />
                        </div>
                    )}
                </div>
            </div>
            {detailedModId && (
                <ModDetailsModal
                    projectId={detailedModId}
                    gameVersion={currentVersion?.gameVersion}
                    loader={currentVersion?.loaderType}
                    onClose={() => setDetailedModId(null)}
                />
            )}
        </div>
    );
}

function CategoryTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-black uppercase tracking-[0.2em] transition-all border-b-2 flex-shrink-0 ${active ? 'text-emerald-500 border-emerald-500' : 'text-slate-500 hover:text-white border-transparent'}`}
        >
            {label}
        </button>
    );
}
