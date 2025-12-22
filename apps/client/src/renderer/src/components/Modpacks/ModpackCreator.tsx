import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, Loader2, X, ChevronDown, Layers, Terminal } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ModpackCreatorProps {
    userId: string;
    onCreated: () => void;
    onCancel: () => void;
}

export default function ModpackCreator({ userId, onCreated, onCancel }: ModpackCreatorProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [gameVersion, setGameVersion] = useState('1.20.1');
    const [loader, setLoader] = useState('Fabric');
    const [loaderVersion, setLoaderVersion] = useState('latest');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mcVersions, setMcVersions] = useState<any[]>([]);

    const loaders = ['Fabric', 'Forge', 'Quilt', 'NeoForge'];

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // 1. Create Modpack
            const modpackResponse = await axios.post(`${API_BASE_URL}/modpacks`, {
                name,
                description,
                authorId: userId
            });

            // 2. Create Initial Version
            await axios.post(`${API_BASE_URL}/modpacks/${modpackResponse.data.id}/versions`, {
                versionNumber: '1.0.0',
                gameVersion,
                loaderType: loader.toLowerCase(),
                loaderVersion: loaderVersion || 'latest'
            });

            // 3. Create Local Instance Folder
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
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
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    <Layers className="w-3 h-3" />
                                    Game Version
                                </label>
                                <div className="relative">
                                    <select
                                        value={gameVersion}
                                        onChange={(e) => setGameVersion(e.target.value)}
                                        className="w-full appearance-none bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer"
                                    >
                                        {mcVersions.length > 0 ? (
                                            mcVersions.map(v => <option key={v.id} value={v.id}>{v.id}</option>)
                                        ) : (
                                            <option value="1.20.1">1.20.1</option>
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                </div>
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
                                        {loaders.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                    Loader Version
                                </label>
                                <input
                                    type="text"
                                    value={loaderVersion}
                                    onChange={(e) => setLoaderVersion(e.target.value)}
                                    placeholder="e.g. 0.14.22 or latest"
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 font-bold flex items-center gap-3">
                                <X className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-4 pt-4">
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
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <span>Create Modpack</span>
                                        <Plus className="w-6 h-6" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
