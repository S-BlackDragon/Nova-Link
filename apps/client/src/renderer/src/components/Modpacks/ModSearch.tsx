import { useState } from 'react';
import axios from 'axios';
import { Search, Loader2, Download, ExternalLink, Package, Filter, ChevronDown, Monitor, Palette, Box, Layers, Layout, DownloadCloud, Calendar } from 'lucide-react';
import ModDetailsModal from './ModDetailsModal';
import ModpackSelectorDialog from './ModpackSelectorDialog';
import { API_BASE_URL } from '../../config/api';


interface ModSearchProps {
    // New props for embedding
    defaultGameVersion?: string;
    defaultLoader?: string;
    fixedFilters?: boolean;
    onAddMod?: (mod: any) => void;
    onInstallModpack?: (mod: any) => void;
    installingId?: string | null; // Track which modpack is currently installing
}

export default function ModSearch({ defaultGameVersion, defaultLoader, fixedFilters, onAddMod, onInstallModpack, installingId }: ModSearchProps) {
    const [query, setQuery] = useState('');
    const [mods, setMods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameVersion, setGameVersion] = useState(defaultGameVersion || '1.20.1');
    const [loader, setLoader] = useState(defaultLoader || 'Fabric');
    const [projectType, setProjectType] = useState('mod');
    const [selectedMod, setSelectedMod] = useState<any>(null);
    const [detailedModId, setDetailedModId] = useState<string | null>(null);

    const loaders = ['Fabric', 'Forge', 'Quilt', 'NeoForge'];
    const versions = ['1.21.1', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5'];
    const projectTypes = [
        { id: 'mod', name: 'Mods', icon: <Box className="w-4 h-4" /> },
        { id: 'modpack', name: 'Modpacks', icon: <Layout className="w-4 h-4" /> },
        { id: 'resourcepack', name: 'Resource Packs', icon: <Palette className="w-4 h-4" /> },
        { id: 'shader', name: 'Shaders', icon: <Monitor className="w-4 h-4" /> },
        { id: 'datapack', name: 'Datapacks', icon: <Layers className="w-4 h-4" /> },
    ];

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        try {
            console.log('Initiating search for:', { query, gameVersion, loader });
            const response = await axios.get(`${API_BASE_URL}/modrinth/search`, {
                params: {
                    query,
                    gameVersion,
                    loader,
                    projectType
                }
            });
            console.log('Search response from backend:', response.data);
            const hits = response.data.hits || [];
            setMods(hits);
            if (hits.length === 0) {
                console.warn('No hits found for query:', query);
            }
        } catch (err: any) {
            console.error('Search failed:', err);
            setError(err.response?.data?.message || 'Search failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full space-y-12">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Search Mods</h1>
                    <p className="text-slate-400 text-xl font-medium">Discover thousands of mods from Modrinth.</p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors w-6 h-6" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for mods (e.g. Sodium, JEI...)"
                            className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-6 pl-16 pr-8 text-white text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium"
                        />
                    </div>

                    <div className="flex gap-4">
                        {!fixedFilters && (
                            <div className="flex gap-4">
                                <div className="relative">
                                    <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <select
                                        value={projectType}
                                        onChange={(e) => setProjectType(e.target.value)}
                                        className="appearance-none bg-slate-800/30 border border-white/5 rounded-2xl py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer min-w-[180px]"
                                    >
                                        {projectTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                                </div>

                                <div className="relative">
                                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <select
                                        value={gameVersion}
                                        onChange={(e) => setGameVersion(e.target.value)}
                                        className="appearance-none bg-slate-800/30 border border-white/5 rounded-2xl py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
                                    >
                                        {versions.map(v => <option key={v} value={v}>{v}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                                </div>

                                <div className="relative">
                                    <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <select
                                        value={loader}
                                        onChange={(e) => setLoader(e.target.value)}
                                        className="appearance-none bg-slate-800/30 border border-white/5 rounded-2xl py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
                                    >
                                        {loaders.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                                </div>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-10 py-6 rounded-[1.5rem] font-black transition-all duration-300 shadow-2xl shadow-emerald-500/20 flex items-center gap-3 active:scale-[0.97]"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                            <span className="text-lg">Search</span>
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-8 rounded-[2rem] flex items-center gap-4 text-lg font-medium">
                    <AlertCircle className="w-8 h-8" />
                    {error}
                </div>
            )}

            {mods.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {mods.map((mod) => (
                        <div
                            key={mod.project_id}
                            onClick={() => setDetailedModId(mod.project_id || mod.slug)}
                            className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-500 group flex flex-col h-full relative overflow-hidden cursor-pointer"
                        >
                            <div className="flex gap-6 mb-8">
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 shadow-xl flex-shrink-0 border border-white/5">
                                    {mod.icon_url ? (
                                        <img
                                            src={mod.icon_url}
                                            alt={mod.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = '<div class="flex items-center justify-center w-full h-full text-slate-500 bg-slate-800 font-black">?</div>';
                                                }
                                            }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-slate-500 bg-slate-800">
                                            <Package className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-2xl font-black text-white mb-2 truncate group-hover:text-emerald-400 transition-colors">{mod.title}</h3>
                                    <p className="text-slate-400 font-medium line-clamp-2 text-sm leading-relaxed mb-4">{mod.description}</p>
                                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <DownloadCloud className="w-3.5 h-3.5 text-emerald-500" />
                                            {mod.downloads?.toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                            {new Date(mod.date_modified).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {mod.categories?.slice(0, 3).map((cat: string) => (
                                    <span key={cat} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/5">
                                        {cat}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between gap-4">
                                <a
                                    href={`https://modrinth.com/mod/${mod.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-emerald-500 font-black text-sm hover:text-emerald-400 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Modrinth</span>
                                </a>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Mod selected:', mod);
                                        const isModpack = mod.project_type?.toLowerCase() === 'modpack';
                                        if (isModpack && onInstallModpack) {
                                            onInstallModpack(mod);
                                        } else {
                                            onAddMod ? onAddMod(mod) : setSelectedMod(mod);
                                        }
                                    }}
                                    disabled={installingId === (mod.project_id || mod.slug)}
                                    className={`flex items-center gap-2 text-base font-black px-6 py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-[0.95] border disabled:opacity-70 disabled:cursor-wait ${mod.project_type?.toLowerCase() === 'modpack' ? 'bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white border-indigo-500/20' : 'bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border-emerald-500/20'}`}
                                >
                                    {installingId === (mod.project_id || mod.slug) ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Installing...</span>
                                        </>
                                    ) : (
                                        <>
                                            {mod.project_type?.toLowerCase() === 'modpack' ? <DownloadCloud className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                                            <span>{mod.project_type?.toLowerCase() === 'modpack' ? 'Install' : 'Add to Pack'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : !loading && query && (
                <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] border border-white/5 rounded-[3rem]">
                    <div className="w-28 h-28 bg-slate-800/40 rounded-[2.5rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner">
                        <Search className="w-14 h-14 text-slate-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">No mods found</h2>
                    <p className="text-slate-400 max-w-md text-xl leading-relaxed font-medium">
                        Try searching for something else or check your filters.
                    </p>
                </div>
            )}

            {detailedModId && (
                <ModDetailsModal
                    projectId={detailedModId}
                    gameVersion={gameVersion}
                    loader={loader}
                    onClose={() => setDetailedModId(null)}
                    onAddMod={async (mod, versionId) => {
                        if (onAddMod) {
                            onAddMod({ ...mod, versionId });
                        } else {
                            setSelectedMod({ ...mod, versionId });
                        }
                        setDetailedModId(null);
                    }}
                />
            )}

            {selectedMod && !onAddMod && (
                <ModpackSelectorDialog
                    mod={selectedMod}
                    gameVersion={gameVersion}
                    loader={loader}
                    onClose={() => setSelectedMod(null)}
                    onSuccess={() => {
                        setSelectedMod(null);
                        // Optionally refresh the search results
                    }}
                />
            )}
        </div>
    );
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}
