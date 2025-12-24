import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { X, User, Shield, Trash2, Copy, LogOut } from 'lucide-react';
import { ChangeTargetModal } from './ChangeTargetModal';
import { DeleteConfirmationModal } from '../Modpacks/DeleteConfirmationModal';

interface Member {
    id: string;
    role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
    joinedAt: string;
    user: {
        id: string;
        username: string;
        avatarUrl: string;
    };
}

interface GroupDetailsProps {
    groupId: string;
    onClose: () => void;
}

export const GroupDetails: React.FC<GroupDetailsProps> = ({ groupId, onClose }) => {
    const [group, setGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [myRole, setMyRole] = useState<string>('MEMBER');
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning';
    }>({ isOpen: false, title: '', description: '', onConfirm: () => { } });

    useEffect(() => {
        fetchGroupDetails();
    }, [groupId]);

    const [showTargetModal, setShowTargetModal] = useState(false);

    const fetchGroupDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroup(response.data);

            // Find my role
            const myId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const me = response.data.members.find((m: any) => m.user.id === myId);
            if (me) setMyRole(me.role);

        } catch (error) {
            console.error('Failed to fetch group details:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyInvite = () => {
        if (group?.inviteCode) {
            navigator.clipboard.writeText(group.inviteCode);
            // Could add toast here
        }
    };

    const leaveGroup = async () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Leave Group?',
            description: `Are you sure you want to leave "${group?.name}"? You will lose access to its modpacks.`,
            type: 'warning',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.post(`${API_BASE_URL}/groups/${groupId}/leave`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    onClose();
                } catch (error) {
                    console.error('Failed to leave group:', error);
                    alert('Failed to leave group.');
                }
            }
        });
    };

    const deleteGroup = async () => {
        setConfirmConfig({
            isOpen: true,
            title: 'Delete Group?',
            description: `🚨 WARNING: Are you sure you want to PERMANENTLY DELETE "${group?.name}"? This action cannot be undone and all members will be removed.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_BASE_URL}/groups/${groupId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    onClose();
                } catch (error) {
                    console.error('Failed to delete group:', error);
                    alert('Failed to delete group.');
                }
            }
        });
    };

    const kickMember = async (userId: string, username: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Remove Member?',
            description: `Are you sure you want to remove ${username} from the group?`,
            type: 'warning',
            onConfirm: async () => {
                try {
                    const token = localStorage.getItem('token');
                    await axios.delete(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchGroupDetails();
                } catch (error) {
                    console.error('Failed to kick member:', error);
                    alert('Failed to remove member.');
                }
            }
        });
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Loading details...</div>;
    if (!group) return <div className="p-8 text-center text-zinc-400">Group not found</div>;

    const isAdmin = myRole === 'ADMIN';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">{group.name}</h2>
                        <div className="flex items-center gap-2 mt-2 text-sm text-zinc-400">
                            <span>Invite Code: <span className="font-mono text-zinc-300">{group.inviteCode}</span></span>
                            <button onClick={copyInvite} className="p-1 hover:text-emerald-400 transition-colors">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin ? (
                            <button
                                onClick={deleteGroup}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-zinc-400"
                                title="Delete Group"
                            >
                                <Trash2 size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={leaveGroup}
                                className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-zinc-400"
                                title="Leave Group"
                            >
                                <LogOut size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">

                    {/* Target Modpack Section */}
                    <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
                        <h3 className="text-lg font-semibold text-zinc-200 mb-3">Target Modpack</h3>
                        {group.targetModpack ? (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                                    <Shield size={20} className="text-emerald-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-zinc-200">{group.targetModpack.name}</div>
                                    <div className="text-xs text-zinc-500">Version: {group.targetVersion?.versionNumber || 'Latest'}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-zinc-500 italic">No modpack targeted</div>
                        )}

                        {isAdmin && (
                            <button
                                onClick={() => setShowTargetModal(true)}
                                className="mt-3 text-sm text-emerald-500 hover:text-emerald-400 font-medium"
                            >
                                Change Target
                            </button>
                        )}
                    </div>

                    {/* Members List */}
                    <div>
                        <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center justify-between">
                            <span>Members</span>
                            <span className="text-xs font-normal bg-zinc-800 px-2 py-1 rounded text-zinc-400">{group.members.length}</span>
                        </h3>

                        <div className="space-y-2">
                            {group.members.map((member: Member) => (
                                <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {member.user.avatarUrl ? (
                                            <img src={member.user.avatarUrl} alt={member.user.username} className="w-8 h-8 rounded-full bg-zinc-700" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                                                <User size={14} className="text-zinc-400" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-zinc-200">{member.user.username}</div>
                                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium border
                                            ${member.role === 'ADMIN' ? 'bg-amber-900/20 text-amber-500 border-amber-900/30' :
                                                member.role === 'MODERATOR' ? 'bg-indigo-900/20 text-indigo-400 border-indigo-900/30' :
                                                    'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                            {member.role}
                                        </span>

                                        {isAdmin && member.role !== 'ADMIN' && (
                                            <button
                                                onClick={() => kickMember(member.user.id, member.user.username)}
                                                className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                                title="Kick Member"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {
                showTargetModal && (
                    <ChangeTargetModal
                        groupId={groupId}
                        currentVersionId={group.targetVersion?.id}
                        onClose={() => setShowTargetModal(false)}
                        onSuccess={() => {
                            setShowTargetModal(false);
                            fetchGroupDetails();
                        }}
                    />
                )
            }

            <DeleteConfirmationModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                description={confirmConfig.description}
                type={confirmConfig.type}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
            />
        </div >
    );
};
