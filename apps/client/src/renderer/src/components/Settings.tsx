import React, { useState, useEffect } from 'react';
import { Save, Folder, Cpu, CheckCircle2, Plus, Wifi, WifiOff, User, LogIn, LogOut, Loader2, Volume2, VolumeX, Download } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface MicrosoftProfile {
    name: string;
    uuid?: string;
}

// Update preference types
type UpdatePreference = 'always' | 'ask' | 'manual';

export default function Settings() {
    const [mcPath, setMcPath] = useState('');
    const [maxMemory, setMaxMemory] = useState('4G');
    const [minMemory, setMinMemory] = useState('2G');
    const [offlineMode, setOfflineMode] = useState(false);
    const [notificationSounds, setNotificationSounds] = useState(true);
    const [amdCompatibility, setAmdCompatibility] = useState(false);
    const [updatePreference, setUpdatePreference] = useState<UpdatePreference>('ask');
    const [saved, setSaved] = useState(false);
    const toast = useToast();

    // Microsoft account state
    const [msAccount, setMsAccount] = useState<MicrosoftProfile | null>(null);
    const [msLoading, setMsLoading] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('mc_settings', JSON.stringify({ mcPath, maxMemory, minMemory, offlineMode, notificationSounds, amdCompatibility }));
        setSaved(true);
        toast.success('Settings Saved', 'Your preferences have been updated.');
        setTimeout(() => setSaved(false), 2000);
    };

    const handleMicrosoftLogin = async () => {
        setMsLoading(true);
        try {
            const result = await (window as any).api.microsoftLogin();
            if (result.success) {
                setMsAccount(result.profile);
                // Store auth for later use when launching
                localStorage.setItem('ms_auth', JSON.stringify(result.auth));
                localStorage.setItem('ms_profile', JSON.stringify(result.profile));
                toast.success('Logged In', `Connected as ${result.profile.name}`);
            } else {
                toast.error('Login Failed', result.error);
            }
        } catch (err: any) {
            console.error('Microsoft login error:', err);
            toast.error('Login Failed', 'Failed to login with Microsoft. Please try again.');
        } finally {
            setMsLoading(false);
        }
    };

    const handleMicrosoftLogout = () => {
        setMsAccount(null);
        localStorage.removeItem('ms_auth');
        localStorage.removeItem('ms_profile');
    };

    useEffect(() => {
        try {
            const settings = localStorage.getItem('mc_settings');
            if (settings) {
                const parsed = JSON.parse(settings);
                if (parsed.mcPath) setMcPath(parsed.mcPath);
                if (parsed.maxMemory) setMaxMemory(parsed.maxMemory);
                if (parsed.minMemory) setMinMemory(parsed.minMemory);
                if (parsed.offlineMode !== undefined) setOfflineMode(parsed.offlineMode);
                if (parsed.notificationSounds !== undefined) setNotificationSounds(parsed.notificationSounds);
                if (parsed.amdCompatibility !== undefined) setAmdCompatibility(parsed.amdCompatibility);
            }

            // Load update preference (stored separately)
            const updatePref = localStorage.getItem('update_preference') as UpdatePreference;
            if (updatePref && ['always', 'ask', 'manual'].includes(updatePref)) {
                setUpdatePreference(updatePref);
            } else {
                setUpdatePreference('ask'); // Default to 'ask'
            }

            // Load Microsoft profile if exists
            const msProfile = localStorage.getItem('ms_profile');
            if (msProfile) {
                setMsAccount(JSON.parse(msProfile));
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
                {/* Microsoft Account Section */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-blue-500/20 transition-all duration-500">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                            <User className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white tracking-tight">Microsoft Account</h2>
                            <p className="text-slate-400 text-lg font-medium">Connect your Minecraft account to play online.</p>
                        </div>

                        {/* Status Badge */}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${msAccount ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
                            <div className={`w-2 h-2 rounded-full ${msAccount ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            <span className="text-sm font-bold">{msAccount ? 'Connected' : 'Not Connected'}</span>
                        </div>
                    </div>

                    {msAccount ? (
                        <div className="flex items-center justify-between bg-slate-800/30 border border-white/5 rounded-[1.5rem] p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-black text-lg">{msAccount.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">{msAccount.name}</p>
                                    <p className="text-slate-500 text-sm">Xbox / Microsoft Account</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleMicrosoftLogout}
                                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-6 py-3 rounded-xl font-bold transition-all duration-300"
                            >
                                <LogOut className="w-5 h-5" />
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleMicrosoftLogin}
                            disabled={msLoading}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 text-white font-black px-8 py-5 rounded-[1.5rem] transition-all duration-300 shadow-lg shadow-blue-500/20"
                        >
                            {msLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-6 h-6" />
                                    Connect Microsoft Account
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Offline Mode Toggle */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-amber-500/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${offlineMode ? 'bg-amber-600/20' : 'bg-slate-700/30'}`}>
                                {offlineMode ? <WifiOff className="w-8 h-8 text-amber-500" /> : <Wifi className="w-8 h-8 text-slate-500" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Offline Mode</h2>
                                <p className="text-slate-400 text-lg font-medium max-w-lg">
                                    Play Minecraft without a premium account. Works on offline/cracked servers only.
                                </p>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                            type="button"
                            onClick={() => setOfflineMode(!offlineMode)}
                            className={`relative w-20 h-10 rounded-full transition-all duration-300 ${offlineMode ? 'bg-amber-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${offlineMode ? 'left-11' : 'left-1'}`} />
                        </button>
                    </div>

                    {offlineMode && (
                        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-amber-400 text-sm font-medium">
                                ⚠️ Offline mode enabled. You can play on cracked/offline servers without a Microsoft account.
                            </p>
                        </div>
                    )}
                </div>

                {/* Notification Sounds Toggle */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-violet-500/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${notificationSounds ? 'bg-violet-600/20' : 'bg-slate-700/30'}`}>
                                {notificationSounds ? <Volume2 className="w-8 h-8 text-violet-500" /> : <VolumeX className="w-8 h-8 text-slate-500" />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Notification Sounds</h2>
                                <p className="text-slate-400 text-lg font-medium max-w-lg">
                                    Play sounds when important notifications appear.
                                </p>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                            type="button"
                            onClick={() => setNotificationSounds(!notificationSounds)}
                            className={`relative w-20 h-10 rounded-full transition-all duration-300 ${notificationSounds ? 'bg-violet-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${notificationSounds ? 'left-11' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Update Settings Section */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-cyan-500/20 transition-all duration-500">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner bg-cyan-600/20">
                            <Download className="w-8 h-8 text-cyan-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Update Settings</h2>
                            <p className="text-slate-400 text-lg font-medium max-w-lg">
                                Control how Nova Link handles updates.
                            </p>
                        </div>
                    </div>

                    {/* Radio Options */}
                    <div className="space-y-4">
                        {/* Option 1: Always */}
                        <button
                            type="button"
                            onClick={() => {
                                setUpdatePreference('always');
                                localStorage.setItem('update_preference', 'always');
                            }}
                            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${updatePreference === 'always'
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${updatePreference === 'always' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500'
                                    }`}>
                                    {updatePreference === 'always' && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className={`font-bold ${updatePreference === 'always' ? 'text-cyan-400' : 'text-white'}`}>
                                        Always install automatically
                                    </p>
                                    <p className="text-slate-500 text-sm">
                                        Download and install updates without asking. The app will restart automatically.
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Option 2: Ask */}
                        <button
                            type="button"
                            onClick={() => {
                                setUpdatePreference('ask');
                                localStorage.setItem('update_preference', 'ask');
                            }}
                            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${updatePreference === 'ask'
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${updatePreference === 'ask' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500'
                                    }`}>
                                    {updatePreference === 'ask' && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className={`font-bold ${updatePreference === 'ask' ? 'text-cyan-400' : 'text-white'}`}>
                                        Ask before installing
                                    </p>
                                    <p className="text-slate-500 text-sm">
                                        Download updates and show a prompt to install. You choose when to restart.
                                    </p>
                                </div>
                            </div>
                        </button>

                        {/* Option 3: Manual */}
                        <button
                            type="button"
                            onClick={() => {
                                setUpdatePreference('manual');
                                localStorage.setItem('update_preference', 'manual');
                            }}
                            className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${updatePreference === 'manual'
                                ? 'border-cyan-500 bg-cyan-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${updatePreference === 'manual' ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500'
                                    }`}>
                                    {updatePreference === 'manual' && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className={`font-bold ${updatePreference === 'manual' ? 'text-cyan-400' : 'text-white'}`}>
                                        Never check automatically
                                    </p>
                                    <p className="text-slate-500 text-sm">
                                        Only check for updates manually using the "Check Updates" button.
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {updatePreference === 'manual' && (
                        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <p className="text-amber-400 text-sm font-medium">
                                ⚠️ You won't receive updates automatically. Check for updates manually from the sidebar.
                            </p>
                        </div>
                    )}
                </div>

                {/* AMD Compatibility Toggle */}
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl group hover:border-red-500/20 transition-all duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner ${amdCompatibility ? 'bg-red-600/20' : 'bg-slate-700/30'}`}>
                                <Cpu className={`w-8 h-8 ${amdCompatibility ? 'text-red-500' : 'text-slate-500'}`} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">AMD Compatibility Mode</h2>
                                <p className="text-slate-400 text-lg font-medium max-w-lg">
                                    Fixes crashes on AMD/Intel GPUs by disabling the NeoForge early loading screen.
                                </p>
                            </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                            type="button"
                            onClick={() => setAmdCompatibility(!amdCompatibility)}
                            className={`relative w-20 h-10 rounded-full transition-all duration-300 ${amdCompatibility ? 'bg-red-500' : 'bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-300 ${amdCompatibility ? 'left-11' : 'left-1'}`} />
                        </button>
                    </div>

                    {amdCompatibility && (
                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                            <p className="text-red-400 text-sm font-medium">
                                🚀 Compatibility mode enabled. This will disable the early loading window and use specialized driver workarounds.
                            </p>
                        </div>
                    )}
                </div>

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

                    <div className="relative group/input flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={mcPath}
                                onChange={(e) => setMcPath(e.target.value)}
                                placeholder="Choose a folder..."
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

                        <button
                            type="button"
                            onClick={() => setMcPath('C:\\Users\\' + (msAccount?.name || 'User') + '\\AppData\\Roaming\\.minecraft')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-8 rounded-[1.5rem] font-bold transition-all border border-white/5"
                            title="Use Default .minecraft"
                        >
                            Default
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
            </form >
        </div >
    );
}

