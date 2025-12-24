import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Users, Settings as SettingsIcon, LogOut, Plus, LayoutDashboard, Compass, Loader2, Play, Trash2, ChevronDown, Square, RefreshCw } from 'lucide-react';
import NovaLinkIcon from './NovaLinkIcon';
import { API_BASE_URL } from '../config/api';
import ModSearch from './Modpacks/ModSearch';
import { GroupManager } from './Groups'; // Use index import
import ModpackCreator from './Modpacks/ModpackCreator';
import ModpackDetails from './Modpacks/ModpackDetails';
import ModpackSelector from './Modpacks/ModpackSelector';
import Settings from './Settings';
import { DeleteConfirmationModal } from './Modpacks/DeleteConfirmationModal';
import UserProfile from './Auth/UserProfile';
import { useLogs } from '../contexts/LogContext';
import { useToast } from '../contexts/ToastContext';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onUserUpdate: (updatedUser: any) => void; // Added for user update
}

export default function Dashboard({ user, onLogout, onUserUpdate }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'modpacks' | 'search' | 'groups' | 'settings'>('modpacks');

  const [showCreateModpack, setShowCreateModpack] = useState(false);
  const [selectedModpackId, setSelectedModpackId] = useState<string | null>(null);
  const [selectedMod, setSelectedMod] = useState<any | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [modpacks, setModpacks] = useState<any[]>([]);

  const [installingModpack, setInstallingModpack] = useState<string | null>(null);
  const [loadingModpacks, setLoadingModpacks] = useState(true);

  const [deletingModpack, setDeletingModpack] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ type: 'modpack' | 'group', id: string, name: string } | null>(null);
  const [msProfile, setMsProfile] = useState<{ name: string } | null>(null);
  const { setLaunchingInfo, launching: globalLaunching, isRunning, activePackId } = useLogs();
  const toast = useToast();

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
      const [authoredRes, sharedRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/modpacks/user/${user.id}`),
        axios.get(`${API_BASE_URL}/modpacks/user/${user.id}/shared`)
      ]);
      const combined = [...(Array.isArray(authoredRes.data) ? authoredRes.data : []), ...(Array.isArray(sharedRes.data) ? sharedRes.data : [])];
      const deduped = Array.from(new Map(combined.map(mp => [mp.id, mp])).values());
      setModpacks(deduped);
    } catch (err: any) {
      console.error('Failed to fetch modpacks from bankend:', err);
      const status = err.response?.status;
      toast.error('Fetch Failed', `Connectivity error to ${API_BASE_URL} (${status || 'Offline'}).`);
    } finally {
      setLoadingModpacks(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'modpacks') return;

    fetchModpacks();
    const interval = setInterval(fetchModpacks, 30000); // Pulse refresh every 30s
    return () => clearInterval(interval);
  }, [activeTab, user?.id]);

  const handleLaunch = async (e: React.MouseEvent, pack: any) => {
    e.stopPropagation();
    try {
      const settingsStr = localStorage.getItem('mc_settings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};

      // 1. Check if path is set
      if (!settings.mcPath || settings.mcPath.trim() === '') {
        toast.error('Path Not Set', 'Please set an installation path in Settings before playing.');
        return;
      }

      // 2. Check authentication status
      const storedAuth = localStorage.getItem('ms_auth');
      const storedProfile = localStorage.getItem('ms_profile');

      if (!settings.offlineMode && (!storedAuth || !storedProfile)) {
        toast.error('Login Required', 'Please enable Offline Mode or sign in with Microsoft to play.');
        return;
      }

      // 3. Build auth object based on mode
      let auth: { access_token?: string; client_token?: string; uuid: string; name: string } = {
        uuid: crypto.randomUUID().replace(/-/g, ''), // Valid 32-char hex UUID for offline
        name: user?.username || 'Player'
      };

      // Use real Microsoft auth if not in offline mode
      if (!settings.offlineMode && storedAuth && storedProfile) {
        try {
          const parsedAuth = JSON.parse(storedAuth);
          const parsedProfile = JSON.parse(storedProfile);
          auth = {
            access_token: parsedAuth.access_token,
            client_token: parsedAuth.client_token || crypto.randomUUID(),
            uuid: parsedProfile.uuid || parsedProfile.id || crypto.randomUUID().replace(/-/g, ''),
            name: parsedProfile.name || user?.username || 'Player'
          };
        } catch (parseErr) {
          console.error('Failed to parse stored auth:', parseErr);
          // Fall back to offline-style auth with valid UUID
        }
      }

      const options = {
        rootPath: settings.mcPath || 'C:\\Minecraft',
        modpackId: pack.id,
        modpackName: pack.name,
        gameVersion: pack.versions?.[0]?.gameVersion || '1.20.1',
        loaderType: pack.versions?.[0]?.loaderType || 'vanilla',
        loaderVersion: pack.versions?.[0]?.loaderVersion,
        versionId: pack.versions?.[0]?.id,
        memory: settings.maxMemory || '4G',
        auth,
        token: localStorage.getItem('token')
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
        loaderType: loader.toLowerCase(),
        token: localStorage.getItem('token')
      });

      // 6. Switch to modpacks tab and refresh
      setActiveTab('modpacks');
      await fetchModpacks();

    } catch (err) {
      console.error('Failed to auto-install modpack:', err);
      toast.error('Install Failed', 'Failed to install modpack. Check console for details.');
    } finally {
      setInstallingModpack(null);
    }
  };

  const executeDeleteModpack = async (id: string) => {
    setDeletingModpack(id);
    try {
      const pack = modpacks.find((p: any) => p.id === id);
      if (pack) {
        const settingsStr = localStorage.getItem('mc_settings');
        const settings = settingsStr ? JSON.parse(settingsStr) : {};
        const rootPath = settings.mcPath || 'C:\\Minecraft';

        console.log('Deleting local instance for:', pack.name);
        await (window as any).api.deleteInstance({
          rootPath,
          modpackName: pack.name
        });
      }

      await axios.delete(`${API_BASE_URL}/modpacks/${id}`);
      fetchModpacks();
      toast.success('Deleted', 'Modpack deleted successfully');
    } catch (err) {
      console.error('Failed to delete modpack:', err);
      toast.error('Deletion Failed', 'Failed to delete modpack.');
    } finally {
      setDeletingModpack(null);
      setDeleteConfirmation(null);
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
        toast.success('Up to Date', 'You are on the latest version!');
        cleanupAvailable();
        cleanupNotAvailable();
        cleanupError();
      });
      const cleanupError = (window as any).api.updater.onUpdateError((err: any) => {
        setCheckingUpdate(false);
        toast.error('Update Check Failed', err.message || 'Unknown error');
        cleanupAvailable();
        cleanupNotAvailable();
        cleanupError();
      });

      await (window as any).api.updater.checkForUpdates();
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setCheckingUpdate(false);
      toast.error('Update Check Failed', 'Could not communicate with update server.');
    }
  };



  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 w-full font-sans">
      {/* Sidebar */}
      <aside className="w-20 lg:w-72 bg-slate-900/40 backdrop-blur-3xl border-r border-white/5 flex flex-col flex-shrink-0 z-20 relative transition-all duration-300">
        <div className="p-6 lg:p-8 flex items-center gap-4 justify-center lg:justify-start">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 flex-shrink-0">
            <NovaLinkIcon className="text-white drop-shadow-lg" size={24} />
          </div>
          <span className="font-black text-xl lg:text-2xl tracking-tighter text-white hidden lg:block">Nova Link</span>
        </div>

        <nav className="flex-1 px-3 lg:px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setShowCreateModpack(false);
                setSelectedModpackId(null);
              }}
              className={`w-full flex items-center gap-4 px-3 lg:px-5 py-4 rounded-xl lg:rounded-[1.25rem] transition-all duration-300 group justify-center lg:justify-start ${activeTab === item.id
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              title={item.label}
            >
              <item.icon className={`w-6 h-6 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="font-bold text-lg hidden lg:block">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 lg:p-8 mt-auto border-t border-white/5 bg-white/[0.02]">
          {/* Check for Updates Button */}
          <div className="mb-4">
            <button
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
              className={`w-full flex items-center justify-center gap-3 px-3 lg:px-5 py-4 rounded-xl lg:rounded-[1.25rem] font-bold transition-all duration-300 border border-transparent hover:border-emerald-500/20 hover:bg-emerald-500/10 ${checkingUpdate ? 'opacity-50 text-slate-500' : 'text-slate-400 hover:text-emerald-400'}`}
              title="Check for Updates"
            >
              {checkingUpdate ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span className="hidden lg:block">{checkingUpdate ? 'Checking...' : 'Check Updates'}</span>
            </button>
          </div>

          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-4 mb-6 justify-center lg:justify-start cursor-pointer group/user p-2 -m-2 rounded-2xl hover:bg-white/5 transition-colors"
            title="View Profile"
          >
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl lg:rounded-2xl flex items-center justify-center border border-white/10 shadow-lg flex-shrink-0 overflow-hidden group-hover/user:border-indigo-500/50 transition-colors">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg lg:text-xl">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 hidden lg:block">
              <p className="text-white font-bold truncate text-lg group-hover/user:text-indigo-400 transition-colors">{user?.username || 'User'}</p>
              <p className="text-slate-500 text-sm truncate font-medium">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-3 lg:px-5 py-4 rounded-xl lg:rounded-[1.25rem] text-red-400 font-bold hover:bg-red-500/10 transition-all duration-300 border border-transparent hover:border-red-500/20"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block">Sign Out</span>
          </button>

          {/* Microsoft Account Status */}
          <div className={`mt-4 items-center justify-center gap-2 text-[10px] font-bold hidden lg:flex ${msProfile ? 'text-emerald-400' : 'text-slate-500'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {msProfile ? `Xbox: ${msProfile.name}` : 'Xbox: Not Connected'}
          </div>

          <div className="mt-4 text-center hidden lg:block">
            <span className="block text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Version {__APP_VERSION__}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-900/20 flex flex-col">
        <div key={activeTab} className="w-full px-6 py-8 md:px-12 lg:px-20 max-w-[1800px] mx-auto transition-all duration-500">
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
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 md:mb-16">
                    <div className="text-center md:text-left">
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight">My Modpacks</h1>
                      <p className="text-slate-400 text-lg md:text-xl font-medium">Manage and launch your custom Minecraft experiences.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateModpack(true)}
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-[1.25rem] font-black transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/30 active:scale-[0.97]"
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 min-[1900px]:grid-cols-4 gap-6 md:gap-8 lg:gap-10">
                      {modpacks.map((pack) => (
                        <div
                          key={pack.id}
                          onClick={() => setSelectedModpackId(pack.id)}
                          className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-10 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 group flex flex-col relative overflow-hidden cursor-pointer"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmation({ type: 'modpack', id: pack.id, name: pack.name });
                            }}
                            disabled={deletingModpack === pack.id}
                            className="absolute top-4 right-4 z-10 p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:text-white shadow-lg disabled:opacity-70"
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
                            <div className="flex flex-col items-end gap-1 mr-12">
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
                key={`search-${activeTab}`}
                onAddMod={(mod) => {
                  setSelectedMod(mod);
                }}
                onInstallModpack={handleInstallModpack}
                installingId={installingModpack}
              />
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="h-full">
              <GroupManager />
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

      <UserProfile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={(updatedUser) => {
          onUserUpdate(updatedUser);
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteConfirmation}
        title={`Delete ${deleteConfirmation?.type === 'modpack' ? 'Modpack' : 'Group'}?`}
        description={`Are you sure you want to delete "${deleteConfirmation?.name}"? ${deleteConfirmation?.type === 'modpack' ? 'This will permanently remove all local files.' : ''}`}
        type="danger"
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          if (deleteConfirmation?.type === 'modpack') executeDeleteModpack(deleteConfirmation.id);
        }}
      />

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
