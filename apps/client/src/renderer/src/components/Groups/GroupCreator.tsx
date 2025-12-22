import { useState } from 'react';
import axios from 'axios';
import { Users, Plus, Loader2, Shield, X } from 'lucide-react';

interface GroupCreatorProps {
    userId: string;
    onCreated: () => void;
    onCancel: () => void;
}

export default function GroupCreator({ userId, onCreated, onCancel }: GroupCreatorProps) {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.post('http://127.0.0.1:3000/groups', {
                name,
                ownerId: userId
            });
            onCreated();
        } catch (err: any) {
            console.error('Failed to create group:', err);
            setError(err.response?.data?.message || 'Failed to create group. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto my-12 relative z-[100]">
            <div className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="p-12 bg-white/[0.02]">
                    <div className="flex items-center gap-6 mb-12">
                        <div className="w-20 h-20 bg-indigo-600/20 rounded-[2rem] flex items-center justify-center shadow-inner">
                            <Users className="w-10 h-10 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tight">Create a Group</h2>
                            <p className="text-slate-400 text-lg font-medium">Collaborate on modpacks with your friends.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
                                <Shield className="w-3 h-3" />
                                Group Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. The Modders Squad"
                                className="w-full bg-slate-800/50 border border-white/5 rounded-[1.5rem] py-6 px-8 text-white text-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/80 transition-all duration-300 placeholder:text-slate-600 font-medium"
                                required
                                autoFocus
                            />
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
                                        <span>Create Group</span>
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
