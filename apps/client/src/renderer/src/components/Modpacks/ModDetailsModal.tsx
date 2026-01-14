import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { X, Download, ExternalLink, Calendar, User, DownloadCloud, Info, History, Image as ImageIcon, Layers, Loader2, Check, Tag, Link as LinkIcon, FileText, Globe, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ModDetailsModalProps {
    projectId: string;
    gameVersion?: string;
    loader?: string;
    onClose: () => void;
    canEdit?: boolean;
    onAddMod?: (mod: any, versionId: string) => void;
}

type Tab = 'overview' | 'versions' | 'changelog' | 'gallery';

export default function ModDetailsModal({ projectId, gameVersion, loader, onClose, canEdit = true, onAddMod }: ModDetailsModalProps) {
    const [project, setProject] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [adding, setAdding] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [pendingVersion, setPendingVersion] = useState<any>(null);

    const [internalGameVersion, setInternalGameVersion] = useState(gameVersion || 'Any');
    const [internalLoader, setInternalLoader] = useState(loader || 'Any');

    const filteredVersions = useMemo(() => {
        return versions.filter(v => {
            const hasLoader = internalLoader === 'Any' || (v.loaders && v.loaders.some(l => l.toLowerCase() === internalLoader.toLowerCase()));
            const hasGameVersion = internalGameVersion === 'Any' || (v.game_versions && v.game_versions.some(gv =>
                gv === internalGameVersion || gv.startsWith(internalGameVersion + '.')
            ));
            return hasLoader && hasGameVersion;
        });
    }, [versions, internalGameVersion, internalLoader]);

    // Extract unique loaders from all versions
    const availableLoaders = useMemo(() => {
        const loaderSet = new Set<string>();
        versions.forEach(v => {
            if (v.loaders) {
                v.loaders.forEach((l: string) => {
                    // Capitalize first letter for display
                    const formatted = l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
                    loaderSet.add(formatted);
                });
            }
        });
        return Array.from(loaderSet).sort();
    }, [versions]);

    // Extract unique game versions from all versions
    const availableGameVersions = useMemo(() => {
        const versionSet = new Set<string>();
        versions.forEach(v => {
            if (v.game_versions) {
                v.game_versions.forEach((gv: string) => versionSet.add(gv));
            }
        });
        // Sort versions in descending order (newest first)
        return Array.from(versionSet).sort((a, b) => {
            const aParts = a.split('.').map(Number);
            const bParts = b.split('.').map(Number);
            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aNum = aParts[i] || 0;
                const bNum = bParts[i] || 0;
                if (bNum !== aNum) return bNum - aNum;
            }
            return 0;
        });
    }, [versions]);

    // Fetch project details once
    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const projRes = await axios.get(`${API_BASE_URL}/modrinth/project/${projectId}`);
                setProject(projRes.data);
            } catch (err) {
                console.error('Failed to fetch mod details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [projectId]);

    // Fetch versions when internal filters change
    useEffect(() => {
        const fetchVersions = async () => {
            setLoadingVersions(true);
            try {
                const versRes = await axios.get(`${API_BASE_URL}/modrinth/project/${projectId}/versions`);
                const sortedVersions = versRes.data.sort((a: any, b: any) =>
                    new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
                );
                setVersions(sortedVersions);

                if (sortedVersions.length > 0) {
                    // Find first compatible version (matching both loader AND game version from modpack)
                    const compatibleVersion = sortedVersions.find((v: any) => {
                        const normalizedLoader = loader?.toLowerCase();
                        const versionLoaders = v.loaders?.map((l: string) => l.toLowerCase()) || [];

                        // Check loader compatibility
                        const hasLoader = !loader || loader === 'Any' ||
                            versionLoaders.includes(normalizedLoader) ||
                            // Forge/NeoForge interoperability
                            (normalizedLoader === 'neoforge' && versionLoaders.includes('forge')) ||
                            (normalizedLoader === 'forge' && versionLoaders.includes('neoforge'));

                        // Check game version compatibility
                        const hasGameVersion = !gameVersion || gameVersion === 'Any' ||
                            (v.game_versions && v.game_versions.includes(gameVersion));

                        return hasLoader && hasGameVersion;
                    });

                    setSelectedVersion(compatibleVersion || sortedVersions[0]);
                } else {
                    setSelectedVersion(null);
                }
            } catch (err) {
                console.error('Failed to fetch mod versions:', err);
                setVersions([]);
                setSelectedVersion(null);
            } finally {
                setLoadingVersions(false);
            }
        };

        if (projectId) {
            fetchVersions();
        }
    }, [projectId, internalGameVersion, internalLoader]);

    const checkCompatibility = (vers: any) => {
        const results = {
            loader: true as boolean | 'warn',
            gameVersion: true as boolean | 'warn'
        };

        // 1. Loader Check
        if (loader && loader !== 'Any') {
            const normalizedLoader = loader.toLowerCase();
            const versionSupports = vers?.loaders?.map((l: string) => l.toLowerCase()) || [];

            // A version MUST support the loader. The project-level loaders are just an aggregate.
            const isCompatible = versionSupports.includes(normalizedLoader);

            if (!isCompatible) {
                // Special case: "forge" and "neoforge" are often interchangeable
                if (normalizedLoader === 'neoforge' && versionSupports.includes('forge')) {
                    results.loader = 'warn';
                } else if (normalizedLoader === 'forge' && versionSupports.includes('neoforge')) {
                    results.loader = 'warn';
                } else {
                    results.loader = false;
                }
            }
        }

        // 2. Game Version Check
        if (gameVersion && gameVersion !== 'Any') {
            const versionSupports = vers?.game_versions || [];
            if (!versionSupports.includes(gameVersion)) {
                results.gameVersion = 'warn'; // Game version mismatch is almost always a warning (might work, might not)
            }
        }

        return results;
    };

    const handleAdd = async (v: any, force: boolean = false) => {
        if (!onAddMod) return;

        const compatibility = checkCompatibility(v);

        // Completely block if loader is incompatible (false = different loader family like Fabric vs Forge)
        if (compatibility.loader === false) {
            setPendingVersion(v);
            setShowWarning(true);
            return; // Cannot proceed even with force - this mod will never work
        }

        // Show warning for potential issues (but allow proceeding)
        if ((compatibility.loader === 'warn' || compatibility.gameVersion !== true) && !force) {
            setPendingVersion(v);
            setShowWarning(true);
            return;
        }

        setAdding(true);
        try {
            await onAddMod(project, v.id);
            setShowWarning(false);
            setPendingVersion(null);
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
                    <p className="text-white font-bold text-xl animate-pulse">Loading Details...</p>
                </div>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-8 bg-slate-950/80 backdrop-blur-xl overflow-hidden">

            <div className="bg-slate-900 border border-white/10 w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 relative">
                {/* Header Section */}
                <div className="relative p-10 flex flex-col md:flex-row gap-8 bg-gradient-to-br from-white/[0.03] to-transparent border-b border-white/5">
                    {/* Close Button - Restored inside container with square style */}
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 rounded-2xl text-slate-500 hover:text-white hover:bg-red-500 transition-all z-20"
                        title="Close"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl ring-4 ring-emerald-500/20 flex-shrink-0 flex items-center justify-center border border-white/5">
                        {project.icon_url ? (
                            <img
                                src={project.icon_url}
                                alt={project.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="flex items-center justify-center w-full h-full text-slate-500 font-black text-4xl uppercase">' + project.title.substring(0, 1) + '</div>';
                                }}
                            />
                        ) : (
                            <span className="text-slate-500 font-black text-4xl uppercase">{project.title.substring(0, 1)}</span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight truncate">{project.title}</h2>
                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 text-xs font-black rounded-lg uppercase tracking-widest border border-emerald-500/20">
                                {project.project_type}
                            </span>
                        </div>
                        <p className="text-slate-400 text-xl font-medium mb-6 line-clamp-2 max-w-2xl">{project.description}</p>

                        <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-emerald-500" />
                                <span className="font-bold">{project.team || 'Unknown Author'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <DownloadCloud className="w-4 h-4 text-emerald-500" />
                                <span className="font-bold">{project.downloads?.toLocaleString()} downloads</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                <span className="font-bold">Updated: {new Date(project.updated).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Selector */}
                <div className="px-10 py-2 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<Info className="w-4 h-4" />} label="Overview" />
                        <TabButton active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} icon={<Layers className="w-4 h-4" />} label="Versions" />
                        <TabButton active={activeTab === 'changelog'} onClick={() => setActiveTab('changelog')} icon={<History className="w-4 h-4" />} label="Changelog" />
                        {project.gallery?.length > 0 && (
                            <TabButton active={activeTab === 'gallery'} onClick={() => setActiveTab('gallery')} icon={<ImageIcon className="w-4 h-4" />} label="Gallery" />
                        )}
                    </div>

                    {selectedVersion && canEdit && (() => {
                        const compat = checkCompatibility(selectedVersion);
                        const isBlocked = compat.loader === false;
                        const hasWarning = compat.loader === 'warn' || compat.gameVersion !== true;

                        return project.project_type === 'modpack' ? (
                            <div className="flex items-center gap-4">
                                <span className="text-amber-500 font-bold text-sm bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                                    Modpacks cannot be added to other modpacks
                                </span>
                                <button
                                    onClick={() => {
                                        // onClose(); // Keep open so context is preserved on cancel
                                        window.dispatchEvent(new CustomEvent('open-modpack-creator', {
                                            detail: {
                                                name: project.title,
                                                description: project.description,
                                                gameVersion: selectedVersion.game_versions[0],
                                                loader: selectedVersion.loaders[0],
                                                supportedLoaders: selectedVersion.loaders,
                                                supportedGameVersions: availableGameVersions,
                                                modrinthModpackId: project.id,
                                                modrinthVersionId: selectedVersion.id
                                            }
                                        }));
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 sparkle-button"
                                >
                                    <Plus className="w-5 h-5" />
                                    Import as New Modpack
                                </button>
                            </div>
                        ) : isBlocked ? (
                            <div className="flex items-center gap-3">
                                <span className="text-red-500 font-bold text-sm bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 flex items-center gap-2">
                                    <X className="w-4 h-4" />
                                    No compatible version for {loader}
                                </span>
                            </div>
                        ) : (
                            <button
                                onClick={() => handleAdd(selectedVersion)}
                                disabled={adding}
                                className={`px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 sparkle-button mb-1 mt-1 ${hasWarning
                                    ? 'bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white'
                                    }`}
                            >
                                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : hasWarning ? <AlertCircle className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                                {adding ? 'Adding...' : hasWarning ? `Add with Warning (${selectedVersion.version_number})` : `Add Latest (${selectedVersion.version_number})`}
                            </button>
                        );
                    })()}
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 flex overflow-hidden bg-slate-950/20">
                    {/* Main Content (Scrollable) */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        {activeTab === 'overview' && (
                            <div className="prose prose-invert max-w-none prose-emerald prose-img:rounded-3xl prose-pre:bg-slate-900 prose-pre:border prose-pre:border-white/10 prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-300 prose-p:text-lg prose-p:leading-relaxed prose-a:text-emerald-400 hover:prose-a:text-emerald-300 prose-strong:text-white">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                >
                                    {project.body}
                                </ReactMarkdown>
                            </div>
                        )}

                        {activeTab === 'gallery' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {project.gallery.map((img: any, i: number) => (
                                    <div key={i} className="aspect-video bg-slate-800 rounded-3xl overflow-hidden group relative cursor-zoom-in border border-white/5 shadow-2xl">
                                        <img
                                            src={img.url}
                                            alt={img.title || 'Screenshot'}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/0f172a/64748b?text=Image+Not+Found';
                                            }}
                                        />
                                        {img.title && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                                <p className="text-white font-bold text-sm tracking-wide">{img.title}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'versions' && (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-1">Available Versions</h3>
                                        <p className="text-slate-500 font-bold text-sm">Showing versions compatible with your selection</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        {/* Game Version Filter */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Game Version</label>
                                            <div className="relative">
                                                <select
                                                    value={internalGameVersion}
                                                    onChange={(e) => setInternalGameVersion(e.target.value)}
                                                    className="bg-slate-950/50 border border-white/10 text-white text-sm font-bold px-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500/50 transition-all min-w-[140px] appearance-none cursor-pointer hover:border-white/20"
                                                >
                                                    <option value="Any">Any Version</option>
                                                    {availableGameVersions.map((gv: string) => (
                                                        <option key={gv} value={gv}>{gv}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Loader Filter */}
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Mod Loader</label>
                                            <div className="relative">
                                                <select
                                                    value={internalLoader}
                                                    onChange={(e) => setInternalLoader(e.target.value)}
                                                    className="bg-slate-950/50 border border-white/10 text-white text-sm font-bold px-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500/50 transition-all min-w-[140px] appearance-none cursor-pointer hover:border-white/20"
                                                >
                                                    <option value="Any">Any Loader</option>
                                                    {availableLoaders.map((l: string) => (
                                                        <option key={l} value={l} className="capitalize">
                                                            {l}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {loadingVersions ? (
                                    <div className="flex flex-col items-center py-32 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                                        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
                                        <p className="text-slate-500 font-bold text-2xl animate-pulse">Fetching compatible versions...</p>
                                    </div>
                                ) : filteredVersions.length > 0 ? (
                                    <div className="space-y-4">
                                        {filteredVersions.map((v: any) => {
                                            const compat = checkCompatibility(v);
                                            const isWarn = compat.loader === 'warn' || compat.gameVersion === 'warn';
                                            const isIncompat = compat.loader === false || compat.gameVersion === false;

                                            return (
                                                <div
                                                    key={v.id}
                                                    className={`p-6 rounded-[2rem] border transition-all group flex items-center justify-between ${selectedVersion?.id === v.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h4 className="text-xl font-black text-white">{v.name}</h4>
                                                            <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                                {v.version_number}
                                                            </span>
                                                            {isWarn && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded uppercase">
                                                                    <AlertCircle className="w-3 h-3" /> Potential Issue
                                                                </span>
                                                            )}
                                                            {isIncompat && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black rounded uppercase">
                                                                    <X className="w-3 h-3" /> Incompatible
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                                                            <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {v.game_versions.join(', ')}</span>
                                                            <span className="flex items-center gap-1"><Download className="w-4 h-4 text-emerald-500" /> {v.loaders.join(', ')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => handleAdd(v)}
                                                                disabled={isIncompat}
                                                                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${isIncompat ? 'bg-red-500/10 text-red-500 cursor-not-allowed opacity-50' : selectedVersion?.id === v.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                                                title={isIncompat ? 'This version is incompatible with your modpack' : undefined}
                                                            >
                                                                {isIncompat ? 'Blocked' : selectedVersion?.id === v.id ? <Check className="w-5 h-5" /> : 'Select'}
                                                            </button>
                                                        )}
                                                        <a
                                                            href={`https://modrinth.com/mod/${project.slug}/version/${v.id}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-3 bg-white/5 text-slate-500 rounded-2xl hover:text-white hover:bg-white/10 transition-all shadow-xl"
                                                        >
                                                            <ExternalLink className="w-5 h-5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-24 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
                                        <DownloadCloud className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                                        <p className="text-slate-500 font-bold text-2xl">No versions match current filters.</p>
                                        <button
                                            onClick={() => {
                                                setInternalGameVersion('Any');
                                                setInternalLoader('Any');
                                            }}
                                            className="mt-6 text-emerald-500 font-black uppercase tracking-widest text-xs hover:underline"
                                        >
                                            Show All Versions
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'changelog' && (
                            <div className="prose prose-invert max-w-none prose-emerald">
                                <div className="mb-10 p-8 bg-emerald-500/5 rounded-[2.5rem] border border-emerald-500/10">
                                    <h3 className="text-emerald-500 font-black text-2xl mb-1">Changelog for {selectedVersion?.name}</h3>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Version {selectedVersion?.version_number}</p>
                                </div>
                                {selectedVersion?.changelog ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                    >
                                        {selectedVersion.changelog}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="text-center py-20">
                                        <History className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-500 font-bold text-xl">No changelog available for this version.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Sidebar Area */}
                    <div className="w-96 border-l border-white/5 bg-white/[0.01] p-10 overflow-y-auto custom-scrollbar flex flex-col gap-10">
                        {/* Tags / Categories */}
                        <section>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-500" />
                                Categories
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {project.categories?.map((cat: string) => (
                                    <span key={cat} className="px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl text-xs font-bold text-slate-300 capitalize hover:bg-slate-800 transition-colors">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </section>

                        {/* External Links */}
                        <section>
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-emerald-500" />
                                External Links
                            </h4>
                            <div className="space-y-3">
                                {project.source_url && (
                                    <a href={project.source_url} target="_blank" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-slate-400 group-hover:text-emerald-500" />
                                            <span className="text-sm font-bold text-slate-300">Source Code</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white" />
                                    </a>
                                )}
                                {project.issues_url && (
                                    <a href={project.issues_url} target="_blank" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group">
                                        <div className="flex items-center gap-3">
                                            <AlertCircle className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
                                            <span className="text-sm font-bold text-slate-300">Issues / Bug Tracker</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white" />
                                    </a>
                                )}
                                {project.wiki_url && (
                                    <a href={project.wiki_url} target="_blank" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                                            <span className="text-sm font-bold text-slate-300">Project Wiki</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white" />
                                    </a>
                                )}
                                {project.discord_url && (
                                    <a href={project.discord_url} target="_blank" className="flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all group">
                                        <div className="flex items-center gap-3">
                                            <Globe className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                                            <span className="text-sm font-bold text-slate-300">Discord Community</span>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-white" />
                                    </a>
                                )}
                            </div>
                        </section>

                        {/* Technical Details Card */}
                        <section className="mt-auto bg-slate-950/40 p-8 rounded-3xl border border-white/5 shadow-inner">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">Technical Data</h4>
                            <div className="space-y-4 text-[11px] font-black uppercase tracking-widest text-slate-500">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span>Project ID</span>
                                    <span className="text-slate-300 select-all font-mono lowercase tracking-normal text-[13px]">{project.id}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <span>Created</span>
                                    <span className="text-slate-300">{new Date(project.published).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Members</span>
                                    <span className="text-emerald-500">{project.team}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* Footer Metadata (Simplified as info moved to sidebar) */}
                <div className="px-10 py-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[10px] text-slate-600 font-black uppercase tracking-[0.3em]">
                    <div className="flex gap-12">
                        <span>License: <span className="text-slate-400 ml-2">{project.license?.name || 'Unknown'}</span></span>
                        <span>Client: <span className={`ml-2 ${project.client_side === 'required' ? 'text-emerald-500' : 'text-slate-400'}`}>{project.client_side}</span></span>
                        <span>Server: <span className={`ml-2 ${project.server_side === 'required' ? 'text-emerald-500' : 'text-slate-400'}`}>{project.server_side}</span></span>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-slate-800 font-bold uppercase tracking-widest text-[9px]">Nova Link</span>
                    </div>
                </div>
            </div>

            {/* Warning Dialog */}
            {showWarning && pendingVersion && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">Compatibility Warning</h3>
                            <div className="space-y-4 mb-8">
                                <p className="text-slate-400 font-medium">
                                    This version might not be fully compatible with your modpack:
                                </p>
                                <div className="bg-white/5 rounded-2xl p-4 text-left space-y-2">
                                    {checkCompatibility(pendingVersion).loader === 'warn' && (
                                        <div className="flex items-center gap-2 text-amber-500 text-sm font-bold">
                                            <Tag className="w-4 h-4" />
                                            <span>Loader mismatch (Forge/NeoForge)</span>
                                        </div>
                                    )}
                                    {checkCompatibility(pendingVersion).loader === false && (
                                        <div className="flex items-center gap-2 text-red-500 text-sm font-bold">
                                            <X className="w-4 h-4" />
                                            <span>Incompatible Loader</span>
                                        </div>
                                    )}
                                    {checkCompatibility(pendingVersion).gameVersion === 'warn' && (
                                        <div className="flex items-center gap-2 text-amber-500 text-sm font-bold">
                                            <Layers className="w-4 h-4" />
                                            <span>Game version mismatch ({gameVersion} vs {pendingVersion.game_versions.join(', ')})</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                {(() => {
                                    const compatible = versions.find(v => {
                                        const comp = checkCompatibility(v);
                                        return comp.loader === true && comp.gameVersion === true;
                                    });
                                    if (compatible && compatible.id !== pendingVersion.id) {
                                        return (
                                            <button
                                                onClick={() => {
                                                    setSelectedVersion(compatible);
                                                    setShowWarning(false);
                                                    setPendingVersion(null);
                                                }}
                                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95"
                                            >
                                                Switch to Compatible ({compatible.version_number})
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}
                                {(() => {
                                    const compat = checkCompatibility(pendingVersion);
                                    if (compat.loader === false) {
                                        return (
                                            <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-4">
                                                <p className="text-red-500 text-sm font-bold">
                                                    CRITICAL: This mod is for a different loader ({pendingVersion.loaders.join(', ')}) and WILL NOT work.
                                                </p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <button
                                            onClick={() => handleAdd(pendingVersion, true)}
                                            className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-black py-4 rounded-2xl transition-all border border-emerald-500/20 active:scale-95"
                                        >
                                            Install Anyway
                                        </button>
                                    );
                                })()}
                                <button
                                    onClick={() => {
                                        setShowWarning(false);
                                        setPendingVersion(null);
                                    }}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-2 border-b-2 tracking-tight ${active ? 'bg-white/10 text-white border-emerald-500' : 'text-slate-500 hover:text-white hover:bg-white/5 border-transparent'}`}
        >
            {icon}
            {label}
        </button>
    );
}
