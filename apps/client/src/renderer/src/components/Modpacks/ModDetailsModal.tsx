import { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { X, Download, ExternalLink, Calendar, User, DownloadCloud, Info, History, Image as ImageIcon, Layers, Loader2, Check, Tag, Link as LinkIcon, FileText, Globe, AlertCircle } from 'lucide-react';

interface ModDetailsModalProps {
    projectId: string;
    gameVersion?: string;
    loader?: string;
    onClose: () => void;
    onAddMod?: (mod: any, versionId: string) => void;
}

type Tab = 'overview' | 'versions' | 'changelog' | 'gallery';

export default function ModDetailsModal({ projectId, gameVersion, loader, onClose, onAddMod }: ModDetailsModalProps) {
    const [project, setProject] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            try {
                const [projRes, versRes] = await Promise.all([
                    axios.get(`http://127.0.0.1:3000/modrinth/project/${projectId}`),
                    axios.get(`http://127.0.0.1:3000/modrinth/project/${projectId}/versions`, {
                        params: { gameVersion, loader }
                    })
                ]);
                setProject(projRes.data);
                setVersions(versRes.data);
                if (versRes.data.length > 0) {
                    setSelectedVersion(versRes.data[0]);
                }
            } catch (err) {
                console.error('Failed to fetch mod details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [projectId, gameVersion, loader]);

    const handleAdd = async (v: any) => {
        if (!onAddMod) return;
        setAdding(true);
        try {
            await onAddMod(project, v.id);
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
            <div className="bg-slate-900 border border-white/10 w-full max-w-6xl h-full max-h-[90vh] rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header Section */}
                <div className="relative p-10 flex flex-col md:flex-row gap-8 bg-gradient-to-br from-white/[0.03] to-transparent border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-2xl transition-all text-slate-500 hover:text-white z-10"
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

                    {selectedVersion && (
                        <button
                            onClick={() => handleAdd(selectedVersion)}
                            disabled={adding}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 sparkle-button mb-1 mt-1"
                        >
                            {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            {adding ? 'Adding...' : `Add Latest (${selectedVersion.version_number})`}
                        </button>
                    )}
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
                                <div className="flex items-center justify-between mb-8 items-end">
                                    <div>
                                        <h3 className="text-2xl font-black text-white mb-2">Available Versions</h3>
                                        <p className="text-slate-500 font-bold">Showing versions compatible with yours</p>
                                    </div>
                                </div>
                                {versions.length > 0 ? versions.map((v: any) => (
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
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-slate-500 font-bold">
                                                <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {v.game_versions.join(', ')}</span>
                                                <span className="flex items-center gap-1"><Download className="w-4 h-4 text-emerald-500" /> {v.loaders.join(', ')}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedVersion(v)}
                                                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${selectedVersion?.id === v.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                            >
                                                {selectedVersion?.id === v.id ? <Check className="w-5 h-5" /> : 'Select'}
                                            </button>
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
                                )) : (
                                    <div className="text-center py-24 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
                                        <DownloadCloud className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                                        <p className="text-slate-500 font-bold text-2xl">No compatible versions found.</p>
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
