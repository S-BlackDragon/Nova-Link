import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Loader2, ExternalLink, Package, Filter, ChevronDown, Monitor, Palette, Box, Layers, Layout, DownloadCloud, AlertCircle } from 'lucide-react';
import ModDetailsModal from './ModDetailsModal';
import ModpackSelectorDialog from './ModpackSelectorDialog';
import { API_BASE_URL } from '../../config/api';

interface ModSearchProps {
    defaultGameVersion?: string;
    defaultLoader?: string;
    fixedFilters?: boolean;
    onAddMod?: (mod: any) => void;
}



export default function ModSearch({ defaultGameVersion, defaultLoader, fixedFilters, onAddMod }: ModSearchProps) {
    const [query, setQuery] = useState('');
    const [mods, setMods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gameVersion, setGameVersion] = useState(defaultGameVersion || 'Any');
    const [loader, setLoader] = useState(defaultLoader || 'Any');
    const [projectType, setProjectType] = useState('mod');
    const [selectedMod, setSelectedMod] = useState<any>(null);
    const [detailedModId, setDetailedModId] = useState<string | null>(null);
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [page, setPage] = useState(1);
    const [totalHits, setTotalHits] = useState(0);
    const itemsPerPage = 100;

    const [trendingModpacks, setTrendingModpacks] = useState<any[]>([]);
    const [trendingMods, setTrendingMods] = useState<any[]>([]);
    const [trendingResourcePacks, setTrendingResourcePacks] = useState<any[]>([]);
    const [loadingDiscovery, setLoadingDiscovery] = useState(false);

    const loaders = ['Any', 'Fabric', 'Forge', 'Quilt', 'NeoForge'];
    const versions = ['Any', '1.21.1', '1.20.4', '1.20.1', '1.19.2', '1.18.2', '1.16.5'];
    const projectTypes = [
        { id: 'mod', name: 'Mods', icon: <Box className="w-4 h-4" /> },
        { id: 'modpack', name: 'Modpacks', icon: <Layout className="w-4 h-4" /> },
        { id: 'resourcepack', name: 'Resource Packs', icon: <Palette className="w-4 h-4" /> },
        { id: 'shader', name: 'Shaders', icon: <Monitor className="w-4 h-4" /> },
        { id: 'datapack', name: 'Datapacks', icon: <Layers className="w-4 h-4" /> },
    ];

    const fetchDiscovery = async () => {
        setLoadingDiscovery(true);
        try {
            const [packs, mds, rs] = await Promise.all([
                axios.get(`${API_BASE_URL}/modrinth/search`, { params: { query: '', projectType: 'modpack', limit: 8 } }),
                axios.get(`${API_BASE_URL}/modrinth/search`, { params: { query: '', projectType: 'mod', limit: 8 } }),
                axios.get(`${API_BASE_URL}/modrinth/search`, { params: { query: '', projectType: 'resourcepack', limit: 8 } })
            ]);
            setTrendingModpacks(packs.data.hits || []);
            setTrendingMods(mds.data.hits || []);
            setTrendingResourcePacks(rs.data.hits || []);
        } catch (err) {
            console.error('Failed to fetch discovery data:', err);
        } finally {
            setLoadingDiscovery(false);
        }
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
            setPage(1);
        }

        if (!query.trim()) {
            setMods([]);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params: any = {
                query: query.trim(),
                projectType,
                offset: (page - 1) * itemsPerPage,
                limit: itemsPerPage
            };

            if (gameVersion && gameVersion !== 'Any') params.gameVersion = gameVersion;
            if (loader && loader !== 'Any') params.loader = loader;

            const response = await axios.get(`${API_BASE_URL}/modrinth/search`, { params });
            setMods(response.data.hits || []);
            setTotalHits(response.data.total_hits || 0);
        } catch (err: any) {
            console.error('Search failed:', err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            setError(`Search failed: ${msg}. (Backend: ${API_BASE_URL})`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        setPage(1);
    }, [debouncedQuery, gameVersion, loader, projectType]);

    useEffect(() => {
        if (!query.trim()) {
            fetchDiscovery();
        } else {
            handleSearch();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [debouncedQuery, gameVersion, loader, projectType, page]);

    const [serviceStatus, setServiceStatus] = useState<'checking' | 'operational' | 'down'>('checking');

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/modrinth/status`);
                setServiceStatus(response.data.status === 'operational' ? 'operational' : 'down');
            } catch (err) {
                setServiceStatus('down');
            }
        };
        checkStatus();
    }, []);

    return (
        <div className="w-full space-y-12 pb-20">
            {serviceStatus === 'down' && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 p-6 rounded-[2rem] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <AlertCircle className="w-6 h-6 text-amber-500" />
                        <div>
                            <p className="font-bold text-lg">Modrinth Service Issues</p>
                            <p className="text-amber-200/70">Search and downloads may be degraded due to Modrinth API outage.</p>
                        </div>
                    </div>
                    <a
                        href="https://status.modrinth.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded-xl font-bold text-sm transition-colors"
                    >
                        Check Status
                    </a>
                </div>
            )}

            <div className="flex flex-col gap-10">
                <div className="relative overflow-hidden p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-br from-emerald-600/20 to-indigo-600/20 border border-white/5 shadow-2xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[100px] -ml-48 -mb-48 rounded-full" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter">Mod Discovery Hub</h1>
                            <div className={`px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 ${serviceStatus === 'operational' ? 'bg-emerald-500/20 text-emerald-400' : serviceStatus === 'down' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${serviceStatus === 'operational' ? 'bg-emerald-500 animate-pulse' : serviceStatus === 'down' ? 'bg-red-500' : 'bg-slate-500'}`} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {serviceStatus === 'operational' ? 'Systems Normal' : serviceStatus === 'down' ? 'Service Issues' : 'Checking Status...'}
                                </span>
                            </div>
                        </div>
                        <p className="text-slate-300 text-lg md:text-xl lg:text-2xl font-medium max-w-2xl leading-relaxed">
                            Discover thousands of high-quality mods, modpacks, and resource packs curated for your ultimate Minecraft experience.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col 2xl:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors w-6 h-6" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for mods (e.g. Sodium, JEI...)"
                            className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-5 md:py-6 pl-16 pr-8 text-white text-lg md:text-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-4">
                        {!fixedFilters && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1 md:flex-none">
                                <div className="relative">
                                    <Layout className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <select
                                        value={projectType}
                                        onChange={(e) => setProjectType(e.target.value)}
                                        className="appearance-none w-full bg-slate-800/30 border border-white/5 rounded-2xl py-5 md:py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer min-w-[150px]"
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
                                        className="appearance-none w-full bg-slate-800/30 border border-white/5 rounded-2xl py-5 md:py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
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
                                        className="appearance-none w-full bg-slate-800/30 border border-white/5 rounded-2xl py-5 md:py-6 pl-12 pr-12 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all cursor-pointer"
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
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-10 py-5 md:py-6 rounded-[1.5rem] font-black transition-all duration-300 shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-[0.97]"
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

            {!query ? (
                <div className="space-y-20">
                    {loadingDiscovery ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8">
                            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                            <p className="text-slate-400 text-2xl font-black animate-pulse uppercase tracking-[0.3em]">Igniting Discovery...</p>
                        </div>
                    ) : (
                        <>
                            <DiscoverySection
                                title="Trending Modpacks"
                                icon={<Layout className="w-8 h-8 text-indigo-400" />}
                                bgColor="bg-indigo-500/10"
                                borderColor="border-indigo-500/20"
                                mods={trendingModpacks}
                                onViewAll={() => { setProjectType('modpack'); setQuery(' '); setTimeout(() => setQuery(''), 50) }}
                                labelColor="text-indigo-400"
                                setDetailedModId={setDetailedModId}
                                status={serviceStatus}
                            />

                            <DiscoverySection
                                title="Popular Mods"
                                icon={<Box className="w-8 h-8 text-emerald-400" />}
                                bgColor="bg-emerald-500/10"
                                borderColor="border-emerald-500/20"
                                mods={trendingMods}
                                onViewAll={() => { setProjectType('mod'); setQuery(' '); setTimeout(() => setQuery(''), 50) }}
                                labelColor="text-emerald-400"
                                setDetailedModId={setDetailedModId}
                                status={serviceStatus}
                            />

                            <DiscoverySection
                                title="Resource Packs"
                                icon={<Palette className="w-8 h-8 text-amber-400" />}
                                bgColor="bg-amber-500/10"
                                borderColor="border-amber-500/20"
                                mods={trendingResourcePacks}
                                onViewAll={() => { setProjectType('resourcepack'); setQuery(' '); setTimeout(() => setQuery(''), 50) }}
                                labelColor="text-amber-400"
                                setDetailedModId={setDetailedModId}
                                status={serviceStatus}
                            />
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-8">
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Search Results</h2>
                        <span className="px-6 py-2 bg-white/5 rounded-full text-slate-400 font-bold border border-white/5 text-sm">
                            {totalHits.toLocaleString()} items found
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-8">
                            <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                            <p className="text-slate-400 text-2xl font-black animate-pulse uppercase tracking-[0.3em]">Filtering the best...</p>
                        </div>
                    ) : mods.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 min-[1900px]:grid-cols-4 gap-6 md:gap-8">
                                {mods.map((mod) => (
                                    <ModCard key={mod.project_id} mod={mod} setDetailedModId={setDetailedModId} compact={false} />
                                ))}
                            </div>

                            <Pagination
                                page={page}
                                totalHits={totalHits}
                                itemsPerPage={itemsPerPage}
                                loading={loading}
                                onPageChange={setPage}
                            />
                        </>
                    ) : (
                        <EmptySearch />
                    )}
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
                    onSuccess={() => setSelectedMod(null)}
                />
            )}
        </div>
    );
}

function DiscoverySection({ title, icon, bgColor, borderColor, mods, onViewAll, labelColor, setDetailedModId, status }: any) {
    return (
        <section className="space-y-8">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className={`p-3 ${bgColor} rounded-2xl border ${borderColor}`}>
                        {icon}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{title}</h2>
                </div>
                <button onClick={onViewAll} className={`${labelColor} font-bold hover:opacity-80 transition-all flex items-center gap-2 text-lg`}>
                    View all <ExternalLink className="w-5 h-5" />
                </button>
            </div>
            {status === 'down' && (!mods || mods.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 border border-white/5 rounded-[2.5rem] bg-white/[0.02]">
                    <AlertCircle className="w-12 h-12 text-slate-600 mb-4" />
                    <p className="text-slate-500 font-bold text-lg">Temporarily Unavailable</p>
                    <p className="text-slate-600 text-sm">Cannot fetch trending items right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {mods.map((mod: any) => (
                        <ModCard
                            key={mod.project_id}
                            mod={mod}
                            setDetailedModId={setDetailedModId}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function Pagination({ page, totalHits, itemsPerPage, loading, onPageChange }: any) {
    const totalPages = Math.ceil(totalHits / itemsPerPage) || 1;
    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-16 pb-12">
            <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1 || loading}
                className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 rounded-3xl text-white font-black hover:bg-white/10 hover:border-emerald-500/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 backdrop-blur-xl group"
            >
                <ChevronDown className="w-6 h-6 rotate-90 group-hover:-translate-x-1 transition-transform" />
                <span>Previous</span>
            </button>

            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-8 py-5 rounded-3xl backdrop-blur-xl">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Page</span>
                <span className="text-emerald-400 font-black text-2xl">{page}</span>
                <span className="text-slate-600 font-bold">/</span>
                <span className="text-slate-400 font-black text-lg">{totalPages}</span>
            </div>

            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page * itemsPerPage >= totalHits || loading}
                className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 rounded-3xl text-white font-black hover:bg-white/10 hover:border-emerald-500/30 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 backdrop-blur-xl group"
            >
                <span>Next</span>
                <ChevronDown className="w-6 h-6 -rotate-90 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

function EmptySearch() {
    return (
        <div className="flex flex-col items-center justify-center py-40 text-center bg-white/[0.01] border border-white/5 rounded-[4rem]">
            <div className="w-32 h-32 bg-slate-800/40 rounded-[3rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner">
                <Search className="w-16 h-16 text-slate-500" />
            </div>
            <h2 className="text-4xl font-black text-white mb-6 tracking-tight">No creations found</h2>
            <p className="text-slate-400 max-w-md text-xl leading-relaxed font-medium">
                Try adjusting your search terms or filters to find what you're looking for.
            </p>
        </div>
    );
}

function ModCard({ mod, setDetailedModId, compact = true }: any) {
    return (
        <div
            onClick={() => setDetailedModId(mod.project_id || mod.slug)}
            className={`group bg-white/[0.02] border border-white/5 rounded-[2.5rem] ${compact ? 'p-6' : 'p-8'} hover:border-emerald-500/30 hover:bg-white/[0.04] transition-all duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer`}
        >
            <div className={`flex ${compact ? 'gap-4' : 'gap-6'} mb-6`}>
                <div className={`${compact ? 'w-16 h-16' : 'w-24 h-24'} rounded-2xl overflow-hidden bg-slate-800 shadow-xl flex-shrink-0 border border-white/5`}>
                    {mod.icon_url ? (
                        <img src={mod.icon_url} alt={mod.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-slate-500 bg-slate-800">
                            <Package className="w-10 h-10" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-black text-white mb-1 truncate group-hover:text-emerald-400 transition-colors`}>{mod.title}</h3>
                    {!compact && <p className="text-slate-400 font-medium line-clamp-2 text-sm leading-relaxed mb-4">{mod.description}</p>}
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-1">
                            <DownloadCloud className="w-3 h-3 text-emerald-500" />
                            {mod.downloads?.toLocaleString() || '0'}
                        </div>
                    </div>
                </div>
            </div>

            {compact && <p className="text-slate-400 font-medium line-clamp-2 text-xs leading-relaxed mb-6">{mod.description}</p>}

            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                <a
                    href={`https://modrinth.com/mod/${mod.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-emerald-500 font-black text-xs hover:text-emerald-400 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Modrinth</span>
                </a>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Always open details modal for compatibility check
                        setDetailedModId(mod.project_id || mod.slug);
                    }}
                    className={`flex items-center gap-2 ${compact ? 'text-xs px-4 py-2' : 'text-sm px-6 py-3'} font-black rounded-xl transition-all duration-300 shadow-lg active:scale-[0.95] border ${mod.project_type?.toLowerCase() === 'modpack' ? 'bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white border-indigo-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5'}`}
                >
                    <span>View Details</span>
                </button>
            </div>
        </div>
    );
}
