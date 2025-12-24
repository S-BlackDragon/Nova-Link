import { useState } from 'react';
import axios from 'axios';
import { X, ArrowRight, Loader2, Users } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

export default function JoinGroupDialog({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/groups/join`, { inviteCode: code.trim() }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Join failed:', err);
            setError(err.response?.data?.message || 'Failed to join group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" />
                        Join Group
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleJoin} className="p-6 space-y-6">
                    <div>
                        <label className="block text-slate-400 text-sm font-bold mb-2 uppercase tracking-wide">Invite Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. A1B2C3D4"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white text-lg font-mono text-center tracking-widest focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:tracking-normal placeholder:font-sans"
                            autoFocus
                            maxLength={8}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center font-medium">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || code.length < 4}
                            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Join <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
