import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Users, Shield, Copy, Check, X, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';

interface GroupDetailsProps {
    groupId: string;
    userId: string;
    onClose: () => void;
}

export default function GroupDetails({ groupId, userId, onClose }: GroupDetailsProps) {
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [myModpacks, setMyModpacks] = useState<any[]>([]);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [groupRes, packsRes] = await Promise.all([
                    axios.get(`http://127.0.0.1:3000/groups/${groupId}`),
                    axios.get(`http://127.0.0.1:3000/modpacks/user/${userId}`)
                ]);
                setGroup(groupRes.data);
                setMyModpacks(packsRes.data);
            } catch (err) {
                console.error('Failed to fetch group details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [groupId, userId]);

    const copyInviteCode = () => {
        navigator.clipboard.writeText(group.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSetModpack = async (packId: string) => {
        setUpdating(true);
        try {
            await axios.patch(`http://127.0.0.1:3000/groups/${groupId}`, {
                targetModpackId: packId
            });
            // Refresh group data
            const groupRes = await axios.get(`http://127.0.0.1:3000/groups/${groupId}`);
            setGroup(groupRes.data);
        } catch (err) {
            console.error('Failed to update group modpack:', err);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const isOwner = group.ownerId === userId;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-white/10 w-full max-w-4xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center shadow-inner">
                            <Shield className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">{group.name}</h2>
                            <p className="text-slate-400 font-medium">Manage members and modpacks</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white">
                        <X className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                    {/* Invite Section */}
                    <section>
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Invite Members</h3>
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-white font-bold text-lg mb-1">Invite Code</p>
                                <p className="text-slate-500 text-sm font-medium">Share this code with your friends to let them join.</p>
                            </div>
                            <button
                                onClick={copyInviteCode}
                                className="flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black transition-all shadow-lg active:scale-95"
                            >
                                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                <span>{group.inviteCode}</span>
                            </button>
                        </div>
                    </section>

                    {/* Modpack Section */}
                    <section>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Group Modpack</h3>
                            {isOwner && <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md uppercase tracking-wider">Owner Controls</span>}
                        </div>

                        {group.targetModpack ? (
                            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-8 flex items-center justify-between mb-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                                        <Package className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-white">{group.targetModpack.name}</h4>
                                        <p className="text-indigo-400/60 font-medium">Active modpack for this group</p>
                                    </div>
                                </div>
                                {isOwner && (
                                    <button
                                        onClick={() => handleSetModpack('')}
                                        className="text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
                                    >
                                        Remove Pack
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-12 text-center mb-8">
                                <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 font-bold">No modpack selected for this group.</p>
                            </div>
                        )}

                        {isOwner && (
                            <div className="space-y-4">
                                <p className="text-white font-bold">Select a modpack to use:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {myModpacks.map(pack => (
                                        <button
                                            key={pack.id}
                                            onClick={() => handleSetModpack(pack.id)}
                                            disabled={updating || group.targetModpackId === pack.id}
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${group.targetModpackId === pack.id
                                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-indigo-500/30 hover:text-white'
                                                }`}
                                        >
                                            <span className="font-bold truncate">{pack.name}</span>
                                            {group.targetModpackId === pack.id ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Members Section */}
                    <section>
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Members ({group.members?.length || 0})</h3>
                        <div className="space-y-4">
                            {group.members?.map((member: any) => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-400">
                                            {member.user?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{member.user?.username}</p>
                                            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">{member.role}</p>
                                        </div>
                                    </div>
                                    {isOwner && member.userId !== userId && (
                                        <button className="text-red-500/50 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
