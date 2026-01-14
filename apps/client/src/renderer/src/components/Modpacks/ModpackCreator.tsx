import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Loader2, X, ChevronDown, Layers, Terminal, Hash } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ModpackImportData {
    name?: string;
    description?: string;
    gameVersion?: string;
    loader?: string;
    supportedLoaders?: string[];
    supportedGameVersions?: string[];
    modrinthModpackId?: string;
    modrinthVersionId?: string;
}

interface ModpackCreatorProps {
    userId: string;
    onCreated: () => void;
    onCancel: () => void;
    importData?: ModpackImportData | null;
    installProgress?: { status: string, progress: number, detail?: string } | null;
}

export default function ModpackCreator({ userId, onCreated, onCancel, importData, installProgress }: ModpackCreatorProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [gameVersion, setGameVersion] = useState('1.20.1');
    const [loader, setLoader] = useState('Fabric');
    const [loaderVersion, setLoaderVersion] = useState('latest');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mcVersions, setMcVersions] = useState<any[]>([]);
    const [availableLoaderVersions, setAvailableLoaderVersions] = useState<string[]>([]);
    const [loadingLoaderVersions, setLoadingLoaderVersions] = useState(false);
    // Removed local installProgress state/effect as it's passed from parent

    const [importingMods, setImportingMods] = useState(false);

    const [allowedLoaders, setAllowedLoaders] = useState<string[]>(['Fabric', 'Forge', 'Quilt', 'NeoForge']);
    const [allowedGameVersions, setAllowedGameVersions] = useState<string[]>([]);
    const [forceVersion, setForceVersion] = useState(false);

    // Initialize from importData if provided
    useEffect(() => {
        if (importData) {
            if (importData.name) setName(importData.name);
            if (importData.description) setDescription(importData.description);
            if (importData.gameVersion) setGameVersion(importData.gameVersion);
            if (importData.loader) {
                const formattedLoader = importData.loader.charAt(0).toUpperCase() + importData.loader.slice(1).toLowerCase();
                setLoader(formattedLoader);
            }
            // Restrict loaders to those supported by the modpack
            if (importData.supportedLoaders && importData.supportedLoaders.length > 0) {
                const formatted = importData.supportedLoaders.map(l =>
                    l.charAt(0).toUpperCase() + l.slice(1).toLowerCase()
                );
                setAllowedLoaders(formatted);
            }

            // Restrict game versions
            if (importData.supportedGameVersions && importData.supportedGameVersions.length > 0) {
                setAllowedGameVersions(importData.supportedGameVersions);
            }
        }
    }, [importData]);

    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const versions = await (window as any).api.getMcVersions();
                setMcVersions(versions);
            } catch (err) {
                console.error('Failed to fetch MC versions:', err);
            }
        };
        fetchVersions();
    }, []);

    // Fetch Loader Versions
    useEffect(() => {
        const fetchLoaderVersions = async () => {
            setLoadingLoaderVersions(true);
            setAvailableLoaderVersions([]);
            setLoaderVersion('latest');

            const loaderType = loader.toLowerCase();

            try {
                if (loaderType === 'fabric') {
                    const res = await axios.get('https://meta.fabricmc.net/v2/versions/loader');
                    const versions = res.data.map((v: any) => v.version).slice(0, 20);
                    setAvailableLoaderVersions(versions);
                } else if (loaderType === 'quilt') {
                    const res = await axios.get('https://meta.quiltmc.org/v3/versions/loader');
                    const versions = res.data.map((v: any) => v.version).slice(0, 20);
                    setAvailableLoaderVersions(versions);
                } else if (loaderType === 'neoforge') {
                    const res = await axios.get('https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml');
                    const match = res.data.matchAll(/<version>(.*?)<\/version>/g);
                    const all = Array.from(match).map((m: any) => m[1]);

                    const gameParts = gameVersion.split('.');
                    const minor = parseInt(gameParts[1]);
                    let filtered: string[] = [];

                    if (minor >= 21) {
                        const prefix = `${minor}.${gameParts[2] || 0}.`;
                        filtered = all.filter(v => v.startsWith(prefix));
                    } else {
                        const prefix = `${gameVersion}-`;
                        filtered = all.filter(v => v.startsWith(prefix));
                    }

                    filtered.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    setAvailableLoaderVersions(filtered.reverse().slice(0, 20));
                } else if (loaderType === 'forge') {
                    await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
                    // We can't easily list all forge versions from this slim json, but we can allow 'latest'
                    setAvailableLoaderVersions(['latest']);
                }
            } catch (err) {
                console.error('Failed to fetch loader versions:', err);
                setAvailableLoaderVersions(['latest']);
            } finally {
                setLoadingLoaderVersions(false);
            }
        };

        fetchLoaderVersions();
    }, [loader, gameVersion]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setImportingMods(false);

        try {
            // 1. Create Modpack in Backend
            const res = await axios.post(`${API_BASE_URL}/modpacks`, {
                name,
                description,
                authorId: userId,
                isPublic: false
            });

            const modpackId = res.data.id;

            // 2. Create Initial Version
            const versionResponse = await axios.post(`${API_BASE_URL}/modpacks/${modpackId}/versions`, {
                versionNumber: '1.0.0',
                gameVersion,
                loaderType: loader.toLowerCase(),
                loaderVersion: loaderVersion || 'latest'
            });

            // 3. If importing from Modrinth modpack, download the mrpack and extract mods
            if (importData?.modrinthModpackId && importData?.modrinthVersionId) {
                setImportingMods(true);
                try {
                    // Get the version info to find the mrpack file URL
                    const modpackVersionRes = await axios.get(
                        `https://api.modrinth.com/v2/version/${importData.modrinthVersionId}`,
                        { headers: { 'User-Agent': 'NovaLink/1.0.84' } }
                    );

                    // Find the mrpack file in the version files
                    const mrpackFile = modpackVersionRes.data.files?.find(
                        (f: any) => f.filename?.endsWith('.mrpack') || f.url?.includes('.mrpack')
                    );

                    if (mrpackFile?.url) {
                        // Download and process the mrpack file via the main process
                        const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
                        const mcPath = settings.mcPath || 'C:\\\\Minecraft';

                        // Use main process to download mrpack, extract and get mod list
                        // Use main process to download mrpack, extract and get mod list
                        const result = await (window as any).api.installMrpack({
                            mrpackUrl: mrpackFile.url,
                            modpackName: name,
                            rootPath: mcPath
                        });

                        const modList = result.mods;

                        // 1. Try to resolve missing Project IDs via Hash Lookup
                        const missingIdMods = modList.filter((m: any) => !m.projectId && m.hashes?.sha1);
                        const hashesToLookup = missingIdMods.map((m: any) => m.hashes.sha1);

                        if (hashesToLookup.length > 0) {

                            // Chunking logic for hashes
                            for (let i = 0; i < hashesToLookup.length; i += 50) {
                                const chunk = hashesToLookup.slice(i, i + 50);
                                try {
                                    const hashRes = await axios.post('https://api.modrinth.com/v2/version_files',
                                        { hashes: chunk, algorithm: 'sha1' },
                                        { headers: { 'User-Agent': 'NovaLink/1.0.88' } }
                                    );

                                    // Map results back to mods
                                    for (const [hash, fileInfo] of Object.entries(hashRes.data)) {
                                        const mod = modList.find((m: any) => m.hashes?.sha1 === hash);
                                        if (mod && (fileInfo as any).project_id) {
                                            mod.projectId = (fileInfo as any).project_id;
                                        }
                                    }
                                } catch (e) {
                                    console.error('Hash lookup failed', e);
                                }
                            }
                        }

                        // Fetch metadata for mods
                        const projectIds = [...new Set(modList.map((m: any) => m.projectId).filter(Boolean))];
                        const metadataMap = new Map();

                        if (projectIds.length > 0) {
                            // Progress update handled by backend events

                            // Chunking logic (50 at a time)
                            for (let i = 0; i < projectIds.length; i += 50) {
                                const chunk = projectIds.slice(i, i + 50);
                                try {
                                    const metaRes = await axios.get('https://api.modrinth.com/v2/projects', {
                                        params: { ids: JSON.stringify(chunk) },
                                        headers: { 'User-Agent': 'NovaLink/1.0.87' }
                                    });
                                    if (Array.isArray(metaRes.data)) {
                                        metaRes.data.forEach((p: any) => metadataMap.set(p.id, p));
                                    }
                                } catch (e) {
                                    console.error('Metadata fetch failed', e);
                                }
                            }
                        }

                        // Add each mod from the mrpack to the backend database
                        if (modList && Array.isArray(modList)) {
                            let processed = 0;
                            for (const mod of modList) {
                                try {
                                    const meta = metadataMap.get(mod.projectId);

                                    await axios.post(`${API_BASE_URL}/modpacks/versions/${versionResponse.data.id}/mods`, {
                                        modrinthId: mod.projectId || mod.path,
                                        name: meta ? meta.title : (mod.name || mod.filename),
                                        iconUrl: meta ? meta.icon_url : '',
                                        filename: mod.filename,
                                        url: mod.downloadUrl,
                                        sha1: mod.sha1,
                                        size: mod.size,
                                        projectType: 'mod'
                                    });
                                } catch (modErr) {
                                    console.warn(`Failed to add mod ${mod.name || mod.path}:`, modErr);
                                }
                                processed++;
                                // Progress update handled by backend events
                            }
                        }
                    } else {
                        console.warn('No mrpack file found in version files');
                    }
                } catch (importErr) {
                    console.warn('Failed to import mods from modpack:', importErr);
                } finally {
                    setImportingMods(false);
                }
            }


            // 4. Create Local Instance Folder
            const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
            const mcPath = settings.mcPath || 'C:\\Minecraft';
            await (window as any).api.createInstance({ rootPath: mcPath, modpackName: name });

            onCreated();
        } catch (err: any) {
            console.error('Failed to create modpack:', err);
            setError(err.response?.data?.message || 'Failed to create modpack. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-12 bg-white/[0.02]">
                    <div className="flex items-center gap-6 mb-12">
                        <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center shadow-inner">
                            <Package className="w-10 h-10 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tight">New Modpack</h2>
                            <p className="text-slate-400 text-lg font-medium">Create a fresh Minecraft experience.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4 md:col-span-2">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    Modpack Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My Awesome Pack"
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/80 transition-all duration-300 placeholder:text-slate-600 font-medium"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-4 md:col-span-2">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this pack about?"
                                    rows={3}
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/80 transition-all duration-300 placeholder:text-slate-600 font-medium resize-none"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                        <Layers className="w-3 h-3" />
                                        Game Version
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setForceVersion(!forceVersion)}
                                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg transition-colors border ${forceVersion
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                            : 'bg-slate-700/30 text-slate-500 border-transparent hover:text-slate-400'
                                            }`}
                                    >
                                        {forceVersion ? 'Unlock Enabled' : 'Unlock Version'}
                                    </button>
                                </div>
                                <div className="relative">
                                    <select
                                        value={gameVersion}
                                        onChange={(e) => setGameVersion(e.target.value)}
                                        className={`w-full appearance-none bg-slate-800/50 border rounded-[1.5rem] py-6 px-8 text-white font-bold focus:outline-none focus:ring-2 transition-all cursor-pointer ${forceVersion && allowedGameVersions.length > 0 && !allowedGameVersions.includes(gameVersion)
                                            ? 'border-amber-500/30 focus:ring-amber-500/50'
                                            : 'border-white/5 focus:ring-indigo-500/50'
                                            }`}
                                    >
                                        {!forceVersion && allowedGameVersions.length > 0 ? (
                                            allowedGameVersions.map(v => <option key={v} value={v}>{v}</option>)
                                        ) : (
                                            mcVersions.map(v => <option key={v.id} value={v.id}>{v.id}</option>)
                                        )}

                                        {/* Fallback if list is empty or fails to load */}
                                        {mcVersions.length === 0 && allowedGameVersions.length === 0 && (
                                            <option value="1.20.1">1.20.1</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                </div>

                                {forceVersion && (
                                    <div className="text-amber-500 text-xs font-bold leading-tight px-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                                        <span className="mt-0.5 text-lg">⚠️</span>
                                        <p>Forcing a version not supported by the modpack may cause crashes or missing mods. Proceed with caution.</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    <Terminal className="w-3 h-3" />
                                    Mod Loader
                                </label>
                                <div className="relative">
                                    <select
                                        value={loader}
                                        onChange={(e) => setLoader(e.target.value)}
                                        className="w-full appearance-none bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {allowedLoaders.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    <Hash className="w-3 h-3" />
                                    Loader Version
                                </label>
                                <div className="relative">
                                    <select
                                        value={loaderVersion}
                                        onChange={(e) => setLoaderVersion(e.target.value)}
                                        disabled={loadingLoaderVersions}
                                        className="w-full appearance-none bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer disabled:opacity-50"
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
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold flex items-center gap-3">
                                <X className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
                            {installProgress ? (
                                <div className="w-full bg-slate-800/50 rounded-[1.5rem] p-6 border border-white/5 shadow-inner">
                                    <div className="flex justify-between mb-3 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        <span>{installProgress.detail || 'Processing...'}</span>
                                        <span>{installProgress.progress}%</span>
                                    </div>
                                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out relative overflow-hidden"
                                            style={{ width: `${installProgress.progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>
                                    <p className="text-center text-xs text-slate-500 mt-3 font-medium">Please wait while we install your modpack...</p>
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="mt-4 w-full py-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all font-bold flex items-center justify-center gap-2 border border-white/5 hover:border-white/10"
                                    >
                                        <X className="w-4 h-4" />
                                        Run in Background
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-10 py-6 rounded-[1.5rem] font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all text-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-6 rounded-[1.5rem] font-black text-xl transition-all duration-300 shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 active:scale-[0.97]"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span>{importingMods ? 'Importing Mods...' : 'Creating...'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Create Modpack</span>
                                                <Plus className="w-6 h-6" />
                                            </>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
