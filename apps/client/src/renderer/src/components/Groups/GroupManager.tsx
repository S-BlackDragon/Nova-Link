import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Plus, Copy, Check, Shield, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import JoinGroupDialog from './JoinGroupDialog';
import { GroupDetails } from './GroupDetails';

export default function GroupManager() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [loadingCreate, setLoadingCreate] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchGroups = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(response.data);
        } catch (err) {
            console.error('Failed to fetch groups:', err);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups(true);
    }, []);

    const [showJoin, setShowJoin] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingCreate(true);
        setCreateError(null);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/groups`, { name: newGroupName }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewGroupName('');
            setShowCreate(false);
            fetchGroups();
        } catch (err: any) {
            console.error('Failed to create group:', err);
            setCreateError(err.response?.data?.message || 'Failed to create group');
        } finally {
            setLoadingCreate(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(code);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-emerald-500" />
                    My Groups
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowJoin(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-xl transition-all font-bold text-sm border border-white/5"
                    >
                        <Users className="w-4 h-4" />
                        Join Group
                    </button>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl transition-all font-bold text-sm border border-emerald-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Create Group
                    </button>
                </div>
            </div>

            {showJoin && (
                <JoinGroupDialog
                    onClose={() => setShowJoin(false)}
                    onSuccess={() => {
                        fetchGroups();
                        setShowJoin(false);
                    }}
                />
            )}

            {showCreate && (
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={createGroup} className="flex gap-4">
                        <input
                            type="text"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Group Name"
                            className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500/50"
                        />
                        <button
                            type="submit"
                            disabled={!newGroupName.trim() || loadingCreate}
                            className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-emerald-600 transition-colors flex items-center gap-2"
                        >
                            {loadingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                        </button>
                    </form>
                    {createError && (
                        <p className="text-red-400 text-sm font-medium pl-1">{createError}</p>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <span className="text-slate-400">Loading groups...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.map((group) => (
                        <div
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/[0.07] transition-all group cursor-pointer relative"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{group.name}</h3>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <span className={`px-2 py-0.5 rounded-md ${group.myRole === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                                            {group.myRole}
                                        </span>
                                        <span>• {group.memberCount} Members</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        copyCode(group.inviteCode);
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/40 rounded-lg text-slate-400 hover:text-white text-xs font-mono border border-white/5 transition-colors z-10"
                                    title="Copy Invite Code"
                                >
                                    {copiedId === group.inviteCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    {group.inviteCode}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Active Target</p>
                                    {group.targetVersion ? (
                                        <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                                            <Shield className="w-4 h-4" />
                                            <span>{group.targetModpack?.name || 'Unknown Pack'}</span>
                                            <span className="text-slate-600">v{group.targetVersion.versionNumber}</span>
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm italic">No version selected</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {groups.length === 0 && !showCreate && (
                        <div className="col-span-full py-12 text-center text-slate-500 border border-white/5 border-dashed rounded-3xl">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>You haven't joined any groups yet.</p>
                        </div>
                    )}
                </div>
            )}

            {selectedGroupId && (
                <GroupDetails
                    groupId={selectedGroupId}
                    onClose={() => {
                        setSelectedGroupId(null);
                        fetchGroups();
                    }}
                />
            )}
        </div>
    );
}
