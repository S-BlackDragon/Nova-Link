import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Trash2, X, Loader2, AlertCircle, Eye, EyeOff, Search, Terminal, Play, Square, Folder, RotateCw, Info } from 'lucide-react';
import LauncherConsole from '../LauncherConsole';
import ModSearch from './ModSearch';
import ModDetailsModal from './ModDetailsModal';
import { useLogs } from '../../contexts/LogContext';
import { API_BASE_URL } from '../../config/api';
import { playNotification } from '../../utils/sounds';

import { SyncProgressModal } from '../Groups';

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
    const [pathNotification, setPathNotification] = useState(false);
    const [authNotification, setAuthNotification] = useState(false);

    const launching = localLaunching || (globalLaunching && activePackId === modpackId);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/modpacks/${modpackId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
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
            const token = localStorage.getItem('token');

            const manifestResponse = await axios.get(`${API_BASE_URL}/sync/manifest/${currentVersion.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await (window as any).api.sync.start(modpack.name, manifestResponse.data, token || undefined, rootPath);
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
            await axios.delete(`${API_BASE_URL}/modpacks/mods/${modId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchDetails();
        } catch (err) {
            console.error('Failed to remove mod:', err);
        }
    };

    const handleToggleMod = async (mod: any, currentStatus: boolean) => {
        try {
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const rootPath = settings.mcPath || 'C:\\Minecraft';

            const result = await (window as any).api.toggleModFile({
                rootPath,
                modpackName: modpack.name,
                filename: mod.filename,
                enabled: !currentStatus
            });

            if (result.success) {
                if (mod.id && !mod.isExternal) {
                    await axios.patch(`${API_BASE_URL}/modpacks/mods/${mod.id}`, {
                        enabled: !currentStatus
                    }, {
                        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                    });
                }
                await fetchDiskFiles(modpack, activeContentType);
            } else {
                console.error('Failed to toggle mod file:', result.error);
            }
        } catch (err) {
            console.error('Failed to toggle mod:', err);
        }
    };

    const currentVersion = modpack?.versions?.[0];
    const mods = currentVersion?.mods || [];
    const dbMods = mods.filter((m: any) => m.projectType === activeContentType);
    const diskMap = new Map(diskFiles.map(f => [f.replace('.disabled', '').toLowerCase(), f]));

    const mergedContent = dbMods.map((dbMod: any) => {
        const cleanName = dbMod.filename || `${dbMod.name}.jar`;
        const diskFile = diskMap.get(cleanName.toLowerCase());
        const isDisabled = diskFile?.endsWith('.disabled');

        if (diskFile) diskMap.delete(cleanName.toLowerCase());

        return {
            id: dbMod.id,
            name: dbMod.name,
            iconUrl: dbMod.iconUrl,
            modrinthId: dbMod.modrinthId,
            enabled: diskFile ? !isDisabled : true,
            isExternal: false,
            filename: diskFile || cleanName,
            onDisk: !!diskFile
        };
    });

    diskMap.forEach((filename) => {
        const isDisabled = filename.endsWith('.disabled');
        mergedContent.push({
            id: filename,
            name: filename.replace('.disabled', ''),
            iconUrl: null,
            modrinthId: null,
            enabled: !isDisabled,
            isExternal: true,
            filename: filename,
            onDisk: true
        });
    });

    const filteredContent = mergedContent.filter((mod: any) =>
        mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (mod.modrinthId && mod.modrinthId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        mod.filename.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncState, setSyncState] = useState<{
        status: 'scanning' | 'downloading' | 'overrides' | 'completed' | 'error',
        progress: number,
        currentFile?: string,
        error?: string
    }>({ status: 'scanning', progress: 0 });

    const handleLaunch = async () => {
        if (!currentVersion) return;

        const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
        const rootBase = settings.mcPath;

        if (!rootBase || rootBase.trim() === '') {
            playNotification('warning');
            setPathNotification(true);
            return;
        }

        const storedAuth = localStorage.getItem('ms_auth');
        const storedProfile = localStorage.getItem('ms_profile');
        if (!settings.offlineMode && (!storedAuth || !storedProfile)) {
            playNotification('warning');
            setAuthNotification(true);
            return;
        }

        setShowSyncModal(true);
        setSyncState({ status: 'scanning', progress: 0 });

        try {
            const token = localStorage.getItem('token');
            let manifest;
            try {
                const response = await axios.get(`${API_BASE_URL}/sync/manifest/${currentVersion.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                manifest = response.data;
            } catch (err: any) {
                console.error('Manifest fetch failed:', err);
                throw new Error(`Failed to fetch manifest. Are you online?`);
            }

            const instanceId = modpack.name;
            const unsubscribe = (window as any).api.sync.onProgress((p: any) => {
                setSyncState({
                    status: p.status,
                    progress: p.progress,
                    currentFile: p.file
                });
            });

            await (window as any).api.sync.start(instanceId, manifest, token, rootBase);
            unsubscribe();
            setSyncState({ status: 'completed', progress: 100 });

            await new Promise(r => setTimeout(r, 1000));
            setShowSyncModal(false);

            setLaunchingInfo({ id: modpackId, launching: true });
            setLocalLaunching(true);
            setActiveTab('logs');

            let auth = { name: 'Player' };
            if (!settings.offlineMode && storedAuth && storedProfile) {
                try {
                    const parsedAuth = JSON.parse(storedAuth);
                    const parsedProfile = JSON.parse(storedProfile);
                    auth = {
                        ...parsedAuth,
                        name: parsedProfile.name || 'Player',
                        uuid: parsedProfile.uuid
                    };
                } catch (e) {
                    console.error('Failed to parse stored auth:', e);
                }
            }

            const options = {
                versionId: currentVersion.id,
                gameVersion: currentVersion.gameVersion,
                loaderType: currentVersion.loaderType,
                loaderVersion: currentVersion.loaderVersion,
                modpackName: modpack.name,
                rootPath: rootBase,
                memory: settings.maxMemory || '4G',
                auth: auth,
                amdCompatibility: settings.amdCompatibility,
                skipSync: true,
                token: localStorage.getItem('token')
            };

            const result = await (window as any).api.launchMinecraft(options);
            if (!result.success) {
                setLaunchingInfo({ id: null, launching: false });
                setLocalLaunching(false);
                setError(`Launch failed: ${result.error}`);
            }
        } catch (err: any) {
            console.error('Launch sequence failed:', err);
            setSyncState(prev => ({ ...prev, status: 'error', error: err.message || 'Unknown error' }));
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

            await (window as any).api.createInstance({ rootPath: rootBase, modpackName: modpack.name });
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
                    {modpack.canEdit && (
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'search' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Search className="w-5 h-5" />
                            Add Content
                        </button>
                    )}
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

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
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
                                                {modpack.canEdit && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleMod(mod, mod.enabled ?? true);
                                                        }}
                                                        className={`p-4 rounded-2xl transition-all shadow-xl ${mod.enabled === false ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                                                        title={mod.enabled === false ? "Enable" : "Disable"}
                                                    >
                                                        {mod.enabled === false ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (mod.modrinthId) {
                                                            setDetailedModId(mod.modrinthId);
                                                        }
                                                    }}
                                                    className={`p-4 rounded-2xl transition-all shadow-xl ${mod.modrinthId ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                                    title={mod.modrinthId ? "View mod details" : "External mod - no details available"}
                                                    disabled={!mod.modrinthId}
                                                >
                                                    <Info className="w-5 h-5" />
                                                </button>

                                                {modpack.canEdit && !mod.isExternal && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveMod(mod.id);
                                                        }}
                                                        className="p-4 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                                        title="Remove from modpack"
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

                    {activeTab === 'search' && (
                        <div className="absolute inset-0 overflow-hidden">
                            <ModSearch
                                defaultGameVersion={currentVersion?.gameVersion}
                                defaultLoader={currentVersion?.loaderType}
                                fixedFilters={true}
                                onAddMod={async (mod) => {
                                    try {
                                        const token = localStorage.getItem('token');
                                        await axios.post(`${API_BASE_URL}/modpacks/versions/${currentVersion.id}/mods`, {
                                            modrinthId: mod.modrinthId || mod.project_id || mod.id || mod.slug,
                                            name: mod.title,
                                            iconUrl: mod.icon_url,
                                            versionId: mod.versionId || null
                                        }, {
                                            headers: { Authorization: `Bearer ${token}` }
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

                    {activeTab === 'logs' && (
                        <div className="absolute inset-0 bg-black">
                            <LauncherConsole isEmbedded={true} />
                        </div>
                    )}
                </div>
            </div>

            {/* Overlays */}
            {(pathNotification || authNotification) && (
                <div className="absolute top-10 right-10 z-[200] flex flex-col gap-4 animate-in slide-in-from-right duration-300">
                    {pathNotification && (
                        <div className="bg-slate-900 border border-indigo-500/50 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-sm">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                                <div>
                                    <h3 className="text-white font-black text-lg">Path Not Set</h3>
                                    <p className="text-slate-400 font-medium text-sm">You need to set an installation path before playing.</p>
                                </div>
                                <button onClick={() => setPathNotification(false)}><X className="w-5 h-5 text-slate-500" /></button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setPathNotification(false);
                                        const event = new CustomEvent('navigate-settings');
                                        window.dispatchEvent(event);
                                    }}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm"
                                >
                                    Configure
                                </button>
                                <button
                                    onClick={() => {
                                        const defaultPath = 'C:\\Users\\' + ((window as any).msProfile?.name || 'User') + '\\AppData\\Roaming\\.minecraft';
                                        const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
                                        localStorage.setItem('mc_settings', JSON.stringify({ ...settings, mcPath: defaultPath }));
                                        setPathNotification(false);
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 rounded-xl text-sm"
                                >
                                    Default
                                </button>
                            </div>
                        </div>
                    )}

                    {authNotification && (
                        <div className="bg-slate-900 border border-red-500/50 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 max-w-sm">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                                <div>
                                    <h3 className="text-white font-black text-lg">Login Required</h3>
                                    <p className="text-slate-400 font-medium text-sm">Enable Offline Mode or sign in with Microsoft to play.</p>
                                </div>
                                <button onClick={() => setAuthNotification(false)}><X className="w-5 h-5 text-slate-500" /></button>
                            </div>
                            <button
                                onClick={() => {
                                    setAuthNotification(false);
                                    const event = new CustomEvent('navigate-settings');
                                    window.dispatchEvent(event);
                                }}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-sm"
                            >
                                Go to Settings
                            </button>
                        </div>
                    )}
                </div>
            )}

            {showSyncModal && (
                <SyncProgressModal
                    status={syncState.status}
                    progress={syncState.progress}
                    currentFile={syncState.currentFile}
                    error={syncState.error}
                    onClose={() => setShowSyncModal(false)}
                />
            )}

            {detailedModId && (
                <ModDetailsModal
                    projectId={detailedModId}
                    gameVersion={currentVersion?.gameVersion}
                    loader={currentVersion?.loaderType}
                    onClose={() => setDetailedModId(null)}
                    canEdit={modpack.canEdit}
                    onAddMod={async (project, versionId) => {
                        try {
                            const token = localStorage.getItem('token');
                            await axios.post(`${API_BASE_URL}/modpacks/versions/${currentVersion.id}/mods`, {
                                modrinthId: project.id,
                                name: project.title,
                                iconUrl: project.icon_url,
                                versionId: versionId
                            }, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            await handleSync();
                            fetchDetails();
                        } catch (e) {
                            console.error(e);
                        }
                    }}
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
