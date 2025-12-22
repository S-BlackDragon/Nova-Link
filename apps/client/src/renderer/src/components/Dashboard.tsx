import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Users, Settings as SettingsIcon, LogOut, Plus, LayoutDashboard, Compass, Loader2, Play, Shield, Copy, Check, Trash2, ExternalLink, ChevronDown, Square } from 'lucide-react';
import NovaLinkIcon from './NovaLinkIcon';
import { API_BASE_URL } from '../config/api';
import ModSearch from './Modpacks/ModSearch';
import GroupJoin from './Groups/GroupJoin';
import GroupCreator from './Groups/GroupCreator';
import ModpackCreator from './Modpacks/ModpackCreator';
import GroupDetails from './Groups/GroupDetails';
import ModpackDetails from './Modpacks/ModpackDetails';
import ModpackSelector from './Modpacks/ModpackSelector';
import Settings from './Settings';
import { useLogs } from '../contexts/LogContext';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'modpacks' | 'search' | 'groups' | 'settings'>('modpacks');
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateModpack, setShowCreateModpack] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedModpackId, setSelectedModpackId] = useState<string | null>(null);
  const [selectedMod, setSelectedMod] = useState<any | null>(null);
  const [modpacks, setModpacks] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingModpacks, setLoadingModpacks] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [installingModpack, setInstallingModpack] = useState<string | null>(null);
  const [deletingModpack, setDeletingModpack] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [msProfile, setMsProfile] = useState<{ name: string } | null>(null);
  const { setLaunchingInfo, launching: globalLaunching, isRunning, activePackId } = useLogs();

  useEffect(() => {
    const handleNav = () => setActiveTab('settings');
    window.addEventListener('navigate-settings', handleNav);
    return () => window.removeEventListener('navigate-settings', handleNav);
  }, []);

  // Load Microsoft profile on mount
  useEffect(() => {
    const stored = localStorage.getItem('ms_profile');
    if (stored) setMsProfile(JSON.parse(stored));
  }, [activeTab]);

  const navItems = [
    { id: 'modpacks', label: 'My Modpacks', icon: LayoutDashboard },
    { id: 'search', label: 'Search Mods', icon: Compass },
    { id: 'groups', label: 'Groups', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const fetchModpacks = async () => {
    if (!user?.id) return;
    setLoadingModpacks(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/modpacks/user/${user.id}`);
      setModpacks(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch modpacks:', err);
    } finally {
      setLoadingModpacks(false);
    }
  };

  const fetchGroups = async () => {
    if (!user?.id) return;
    setLoadingGroups(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/groups`, {
        params: { userId: user.id }
      });
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'modpacks') {
      fetchModpacks();
    } else if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab, user?.id]);

  const handleLaunch = async (e: React.MouseEvent, pack: any) => {
    e.stopPropagation();
    try {
      const settingsStr = localStorage.getItem('mc_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};

      const options = {
        rootPath: settings.mcPath || 'C:\\Minecraft',
        modpackId: pack.id,
        modpackName: pack.name,
        gameVersion: pack.versions?.[0]?.gameVersion || '1.20.1',
        loaderType: pack.versions?.[0]?.loaderType || 'vanilla',
        loaderVersion: pack.versions?.[0]?.loaderVersion,
        versionId: pack.versions?.[0]?.id,
        memory: settings.maxMemory || '4G',
        auth: {
          access_token: 'dummy',
          client_token: 'dummy',
          uuid: 'dummy',
          name: user?.username || 'Player'
        }
      };

      console.log('Launching with options:', options);
      setLaunchingInfo({ id: pack.id, launching: true });
      await (window as any).api.launchMinecraft(options);
    } catch (err) {
      console.error('Failed to launch:', err);
      setLaunchingInfo({ id: pack.id, launching: false });
    }
  };

  const handleInstallModpack = async (mod: any) => {
    if (installingModpack) return; // Prevent double-click

    console.log('Auto-installing modpack:', mod);
    setInstallingModpack(mod.project_id || mod.slug);

    const gameVersion = mod.game_versions?.[0] || '1.20.1';
    const loader = mod.loaders?.find((l: string) => l.toLowerCase() === 'fabric') || mod.loaders?.[0] || 'fabric';

    try {
      // 1. Create Modpack on Backend
      const modpackResponse = await axios.post(`${API_BASE_URL}/modpacks`, {
        name: mod.title,
        description: mod.description,
        authorId: user.id
      });

      // 2. Create Version
      const versionResponse = await axios.post(`${API_BASE_URL}/modpacks/${modpackResponse.data.id}/versions`, {
        versionNumber: '1.0.0',
        gameVersion: gameVersion,
        loaderType: loader.toLowerCase(),
        loaderVersion: 'latest'
      });

      // 3. Add the Modpack-Project as a "Mod" to the version
      // CRITICAL: projectType tells the sync engine to treat this as an .mrpack
      await axios.post(`${API_BASE_URL}/modpacks/versions/${versionResponse.data.id}/mods`, {
        modrinthId: mod.project_id || mod.slug,
        name: mod.title,
        iconUrl: mod.icon_url,
        projectType: 'modpack',
        versionId: null
      });

      // 4. Create Local Instance & Sync
      const settingsStr = localStorage.getItem('mc_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      const mcPath = settings.mcPath || 'C:\\Minecraft';

      await (window as any).api.createInstance({ rootPath: mcPath, modpackName: mod.title });

      // 5. Sync modpack files (download .mrpack and extract)
      await (window as any).api.syncModpack({
        versionId: versionResponse.data.id,
        modpackName: mod.title,
        rootPath: mcPath,
        gameVersion: gameVersion,
        loaderType: loader.toLowerCase()
      });

      // 6. Switch to modpacks tab and refresh
      setActiveTab('modpacks');
      await fetchModpacks();

    } catch (err) {
      console.error('Failed to auto-install modpack:', err);
      alert('Failed to install modpack. Please check console for details.');
    } finally {
      setInstallingModpack(null);
    }
  };

  const handleDeleteModpack = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this modpack? This will verify delete all local files for this instance.')) return;

    setDeletingModpack(id);
    try {
      // Find the modpack to get its name
      const pack = modpacks.find((p: any) => p.id === id);
      if (pack) {
        // Delete local files
        const settingsStr = localStorage.getItem('mc_settings');
        const settings = settingsStr ? JSON.parse(settingsStr) : {};
        const rootPath = settings.mcPath || 'C:\\Minecraft';

        console.log('Deleting local instance for:', pack.name);
        await (window as any).api.deleteInstance({
          rootPath,
          modpackName: pack.name
        });
      }

      // Delete from backend
      await axios.delete(`${API_BASE_URL}/modpacks/${id}`);
      fetchModpacks();
    } catch (err) {
      console.error('Failed to delete modpack:', err);
      alert('Failed to delete modpack');
    } finally {
      setDeletingModpack(null);
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/groups/${id}`);
      fetchGroups();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      // Setup listeners for one-time check
      const cleanupAvailable = (window as any).api.updater.onUpdateAvailable(() => {
        setCheckingUpdate(false);
        // Modal will open automatically via App.tsx or UpdateModal logic
      });
      const cleanupNotAvailable = (window as any).api.updater.onUpdateNotAvailable(() => {
        setCheckingUpdate(false);
        alert('You are on the latest version!');
        cleanupAvailable();
        cleanupNotAvailable();
        cleanupError();
      });
      const cleanupError = (window as any).api.updater.onUpdateError((err: any) => {
        setCheckingUpdate(false);
        alert('Update check failed: ' + (err.message || 'Unknown error'));
        cleanupAvailable();
        cleanupNotAvailable();
        cleanupError();
      });

      await (window as any).api.updater.checkForUpdates();
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setCheckingUpdate(false);
    }
  };

  const copyToClipboard = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 w-full font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 flex flex-col flex-shrink-0 z-20 relative">
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <NovaLinkIcon className="text-white drop-shadow-lg" size={28} />
          </div>
          <span className="font-black text-2xl tracking-tighter text-white">Nova Link</span>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setShowCreateModpack(false);
                setShowJoinGroup(false);
                setShowCreateGroup(false);
                setSelectedGroupId(null);
                setSelectedModpackId(null);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group ${activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon className={`w-6 h-6 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-bold text-lg">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 mt-auto border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center border border-white/10 shadow-lg">
              <span className="text-white font-black text-xl">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold truncate text-lg">{user?.username || 'User'}</p>
              <p className="text-slate-500 text-sm truncate font-medium">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-[1.25rem] text-red-400 font-bold hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>

          {/* Microsoft Account Status */}
          <div className={`mt-4 flex items-center justify-center gap-2 text-xs font-bold ${msProfile ? 'text-emerald-400' : 'text-slate-500'}`}>
            <div className={`w-2 h-2 rounded-full ${msProfile ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            {msProfile ? `Xbox: ${msProfile.name}` : 'Xbox: Not Connected'}
          </div>

          <div className="mt-3 text-center space-y-2">
            <span className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Version 1.0.20</span>
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className="text-[10px] font-bold text-slate-500 hover:text-emerald-500 transition-colors flex items-center justify-center gap-1 mx-auto disabled:opacity-50"
            >
              {checkingUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {checkingUpdate ? 'Checking...' : 'Check for Updates'}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900/20 flex flex-col">
        <div key={activeTab} className="w-full px-12 py-16 lg:px-20 max-w-[1600px] mx-auto">
          {activeTab === 'modpacks' && (
            <div>
              {showCreateModpack ? (
                <ModpackCreator
                  userId={user?.id}
                  onCreated={() => {
                    setShowCreateModpack(false);
                    fetchModpacks();
                  }}
                  onCancel={() => setShowCreateModpack(false)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-16">
                    <div>
                      <h1 className="text-5xl font-black text-white mb-4 tracking-tight">My Modpacks</h1>
                      <p className="text-slate-400 text-xl font-medium">Manage and launch your custom Minecraft experiences.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateModpack(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.25rem] font-black transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-indigo-500/30 active:scale-[0.97]"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-lg">New Modpack</span>
                    </button>
                  </div>

                  {loadingModpacks ? (
                    <div className="flex flex-col items-center justify-center py-32">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                      <p className="text-slate-500 font-bold">Loading your modpacks...</p>
                    </div>
                  ) : modpacks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {modpacks.map((pack) => (
                        <div
                          key={pack.id}
                          onClick={() => setSelectedModpackId(pack.id)}
                          className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 group flex flex-col relative overflow-hidden cursor-pointer"
                        >
                          <button
                            onClick={(e) => handleDeleteModpack(e, pack.id)}
                            disabled={deletingModpack === pack.id}
                            className="absolute top-6 right-6 z-10 p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:text-white shadow-lg disabled:opacity-70"
                          >
                            {deletingModpack === pack.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>

                          <div className="flex items-start justify-between mb-10">
                            <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center shadow-inner">
                              <Package className="w-10 h-10 text-indigo-500" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Version</span>
                              <span className="text-white font-black text-xl">{pack.versions?.[0]?.versionNumber || '1.0.0'}</span>
                            </div>
                          </div>

                          <div className="mb-10">
                            <h3 className="text-3xl font-black text-white mb-4 group-hover:text-indigo-400 transition-colors leading-tight">{pack.name}</h3>
                            <p className="text-slate-400 font-medium line-clamp-2 text-lg leading-relaxed">{pack.description || 'No description provided.'}</p>
                          </div>

                          <div className="mt-auto pt-10 border-t border-white/5 flex flex-col gap-8">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Game Version</span>
                                <span className="text-lg font-black text-slate-200">{pack.versions?.[0]?.gameVersion || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loader</span>
                                <span className="text-lg font-black text-slate-200 capitalize">{pack.versions?.[0]?.loaderType || 'Vanilla'}</span>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <button
                                onClick={(e) => {
                                  if (isRunning && activePackId === pack.id) {
                                    e.stopPropagation();
                                    (window as any).api.stopInstance(pack.name);
                                  } else {
                                    handleLaunch(e, pack);
                                  }
                                }}
                                disabled={(globalLaunching || isRunning) && activePackId !== pack.id}
                                className={`flex-1 py-5 rounded-2xl font-black transition-all duration-300 flex items-center justify-center gap-3 shadow-xl active:scale-[0.95] ${(globalLaunching && activePackId === pack.id)
                                  ? 'bg-amber-500 text-white shadow-amber-500/20 cursor-wait'
                                  : (isRunning && activePackId === pack.id)
                                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
                                  }`}
                              >
                                {globalLaunching && activePackId === pack.id ? (
                                  <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span className="text-lg">Preparing...</span>
                                  </>
                                ) : isRunning && activePackId === pack.id ? (
                                  <>
                                    <Square className="w-6 h-6 fill-current" />
                                    <span className="text-lg">Stop</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-6 h-6 fill-current" />
                                    <span className="text-lg">Launch Game</span>
                                  </>
                                )}
                              </button>
                              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors">
                                <ChevronDown className="w-6 h-6 -rotate-90" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-sm">
                      <div className="w-28 h-28 bg-slate-800/40 rounded-[2.5rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner">
                        <Package className="w-14 h-14 text-slate-500" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-4">No modpacks yet</h2>
                      <p className="text-slate-400 max-w-md text-xl leading-relaxed font-medium">
                        Create your first modpack or join a group to start playing with your friends.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div>
              <ModSearch
                key={`search-${activeTab}-${modpacks.length}`}
                onAddMod={(mod) => {
                  setSelectedMod(mod);
                }}
                onInstallModpack={handleInstallModpack}
                installingId={installingModpack}
              />
            </div>
          )}

          {activeTab === 'groups' && (
            <div>
              {showJoinGroup ? (
                <GroupJoin
                  userId={user?.id}
                  onJoined={() => {
                    setShowJoinGroup(false);
                    fetchGroups();
                  }}
                  onCancel={() => setShowJoinGroup(false)}
                />
              ) : showCreateGroup ? (
                <GroupCreator
                  userId={user?.id}
                  onCreated={() => {
                    setShowCreateGroup(false);
                    fetchGroups();
                  }}
                  onCancel={() => setShowCreateGroup(false)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-16">
                    <div>
                      <h1 className="text-5xl font-black text-white mb-4 tracking-tight">Groups</h1>
                      <p className="text-slate-400 text-xl font-medium">Collaborate on modpacks with your team.</p>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowJoinGroup(true)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 rounded-[1.25rem] font-black transition-all duration-300 flex items-center gap-3 shadow-xl active:scale-[0.97]"
                      >
                        <Users className="w-6 h-6" />
                        <span className="text-lg">Join Group</span>
                      </button>
                      <button
                        onClick={() => setShowCreateGroup(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.25rem] font-black transition-all duration-300 flex items-center gap-3 shadow-2xl shadow-indigo-500/30 active:scale-[0.97]"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-lg">Create Group</span>
                      </button>
                    </div>
                  </div>

                  {loadingGroups ? (
                    <div className="flex flex-col items-center justify-center py-32">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                      <p className="text-slate-500 font-bold">Loading your groups...</p>
                    </div>
                  ) : groups.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                      {groups.map((group) => (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 group flex flex-col relative overflow-hidden cursor-pointer"
                        >
                          <button
                            onClick={(e) => handleDeleteGroup(e, group.id)}
                            className="absolute top-4 right-4 z-10 p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:text-white shadow-lg"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <div className="flex items-start justify-between mb-8">
                            <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0">
                              <Shield className="w-8 h-8 text-indigo-500" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={(e) => copyToClipboard(e, group.inviteCode)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-colors border border-white/5 max-w-[140px]"
                              >
                                {copiedId === group.inviteCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span className="truncate">{group.inviteCode}</span>
                              </button>
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-1">Invite Code</span>
                            </div>
                          </div>
                          <h3 className="text-2xl font-black text-white mb-3 group-hover:text-indigo-400 transition-colors">{group.name}</h3>
                          <p className="text-slate-400 font-medium mb-8">
                            {group.members?.length || 0} Members • {group.targetModpack?.name || 'No target pack'}
                          </p>

                          <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Pack</span>
                            <div className="flex items-center gap-2 text-indigo-400">
                              <span className="text-sm font-bold">{group.targetModpack?.name || 'None'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-sm">
                      <div className="w-28 h-28 bg-slate-800/40 rounded-[2.5rem] flex items-center justify-center mb-10 border border-white/5 shadow-inner">
                        <Users className="w-14 h-14 text-slate-500" />
                      </div>
                      <h2 className="text-3xl font-black text-white mb-4">No groups yet</h2>
                      <p className="text-slate-400 max-w-md text-xl leading-relaxed font-medium">
                        Join an existing group with an invite code or create your own to start collaborating.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <Settings />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedGroupId && (
        <GroupDetails
          groupId={selectedGroupId}
          userId={user?.id}
          onClose={() => {
            setSelectedGroupId(null);
            fetchGroups();
          }}
        />
      )}

      {selectedModpackId && (
        <ModpackDetails
          modpackId={selectedModpackId}
          onClose={() => {
            setSelectedModpackId(null);
            fetchModpacks();
          }}
        />
      )}

      {selectedMod && (
        <ModpackSelector
          userId={user?.id}
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
          onSuccess={() => {
            setSelectedMod(null);
            fetchModpacks();
          }}
        />
      )}

      {selectedModpackId && (
        <ModpackDetails
          modpackId={selectedModpackId}
          onClose={() => {
            setSelectedModpackId(null);
            fetchModpacks();
          }}
        />
      )}

      {/* Global Progress Indicator */}
      {(globalLaunching || (useLogs().progress > 0 && useLogs().progress < 100)) && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-2 w-80 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="text-sm font-bold text-white truncate max-w-[150px]">{useLogs().status || 'Processing...'}</span>
            </div>
            <span className="text-xs font-black text-indigo-400">{useLogs().progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-indigo-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${useLogs().progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
