import React, { useState } from 'react';
import axios from 'axios';
import { Users, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GroupJoinProps {
    userId: string;
    onJoined: (group: any) => void;
    onCancel: () => void;
}

export default function GroupJoin({ userId, onJoined, onCancel }: GroupJoinProps) {
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteCode.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`http://127.0.0.1:3000/groups/join`, {
                userId,
                inviteCode
            });
            setSuccess(true);
            setTimeout(() => {
                onJoined(response.data);
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to join group. Check the code.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center duration-500 min-h-[400px] bg-white/[0.02] border border-white/5 rounded-[3rem]">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">Successfully Joined!</h2>
                <p className="text-slate-400 text-xl font-medium">Welcome to the group. Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-12 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] shadow-2xl my-12">
            <div className="flex items-center gap-6 mb-12">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                    <Users className="w-10 h-10 text-indigo-500" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Join a Group</h2>
                    <p className="text-slate-400 text-lg font-medium">Enter the invitation code provided by the host.</p>
                </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-10">
                <div className="space-y-4">
                    <label className="text-sm font-bold text-slate-300 ml-1 tracking-wide uppercase opacity-70">Invitation Code</label>
                    <input
                        type="text"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="e.g. CL-123-ABC"
                        className="w-full bg-slate-800/30 border border-white/5 rounded-[1.5rem] py-8 px-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 font-mono tracking-[0.3em] text-center text-4xl text-white transition-all duration-300 placeholder:tracking-normal placeholder:text-slate-700 placeholder:text-2xl"
                        autoFocus
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-4 text-red-400 bg-red-500/10 p-6 rounded-[1.5rem] text-base font-medium border border-red-500/20 duration-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex gap-6 pt-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 px-8 py-5 rounded-[1.5rem] font-black text-xl text-slate-400 hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/5"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !inviteCode.trim()}
                        className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-8 py-5 rounded-[1.5rem] font-black text-xl text-white transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-indigo-500/30 active:scale-[0.97]"
                    >
                        {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : (
                            <>
                                <span>Join Group</span>
                                <ArrowRight className="w-7 h-7" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
