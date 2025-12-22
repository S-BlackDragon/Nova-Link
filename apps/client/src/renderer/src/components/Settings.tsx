import React, { useState, useEffect } from 'react';
import { Save, Folder, Cpu, CheckCircle2, Plus } from 'lucide-react';

export default function Settings() {
    const [mcPath, setMcPath] = useState('C:\\Users\\alexf\\AppData\\Roaming\\.minecraft');
    const [maxMemory, setMaxMemory] = useState('4G');
    const [minMemory, setMinMemory] = useState('2G');
    const [saved, setSaved] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('mc_settings', JSON.stringify({ mcPath, maxMemory, minMemory }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    useEffect(() => {
        try {
            const settings = localStorage.getItem('mc_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.mcPath) setMcPath(parsed.mcPath);
                if (parsed.maxMemory) setMaxMemory(parsed.maxMemory);
                if (parsed.minMemory) setMinMemory(parsed.minMemory);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    }, []);

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-16">
                <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Settings</h1>
                <p className="text-slate-400 text-xl font-medium">Configure your launcher and Minecraft environment.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-10">
                {/* Minecraft Path */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-indigo-500/20 transition-all duration-500">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                            <Folder className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Installation Path</h2>
                            <p className="text-slate-400 text-lg font-medium">Where Minecraft and mods will be stored.</p>
                        </div>
                    </div>

                    <div className="relative group/input">
                        <input
                            type="text"
                            value={mcPath}
                            onChange={(e) => setMcPath(e.target.value)}
                            className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 font-mono"
                        />
                        <button
                            type="button"
                            onClick={async () => {
                                const path = await (window as any).api.selectDirectory();
                                if (path) setMcPath(path);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 shadow-lg active:scale-[0.95]"
                        >
                            Browse
                        </button>
                    </div>
                </div>

                {/* Performance */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-emerald-500/20 transition-all duration-500">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 bg-emerald-600/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                            <Cpu className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Performance</h2>
                            <p className="text-slate-400 text-lg font-medium">Allocate system memory for a smoother experience.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-300 ml-1 tracking-wide uppercase opacity-70">Maximum Memory</label>
                            <div className="relative">
                                <select
                                    value={maxMemory}
                                    onChange={(e) => setMaxMemory(e.target.value)}
                                    className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 appearance-none cursor-pointer font-black"
                                >
                                    <option value="2G">2 GB</option>
                                    <option value="4G">4 GB</option>
                                    <option value="6G">6 GB</option>
                                    <option value="8G">8 GB</option>
                                    <option value="12G">12 GB</option>
                                    <option value="16G">16 GB</option>
                                </select>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-300 ml-1 tracking-wide uppercase opacity-70">Minimum Memory</label>
                            <div className="relative">
                                <select
                                    value={minMemory}
                                    onChange={(e) => setMinMemory(e.target.value)}
                                    className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 appearance-none cursor-pointer font-black"
                                >
                                    <option value="1G">1 GB</option>
                                    <option value="2G">2 GB</option>
                                    <option value="4G">4 GB</option>
                                </select>
                                <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <Plus className="w-6 h-6 rotate-45" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-8 pt-6">
                    {saved && (
                        <div className="flex items-center gap-3 text-emerald-400 font-black text-lg duration-500">
                            <CheckCircle2 className="w-7 h-7" />
                            Settings saved!
                        </div>
                    )}
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-12 py-6 rounded-[1.5rem] transition-all duration-300 shadow-2xl shadow-indigo-500/30 flex items-center gap-3 active:scale-[0.97] text-xl"
                    >
                        <Save className="w-7 h-7" />
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
