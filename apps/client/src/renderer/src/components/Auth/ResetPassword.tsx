import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Loader2, AlertCircle, ArrowRight, ShieldClose, Ticket } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ResetPasswordProps {
    onSuccess: () => void;
}

export default function ResetPassword({ onSuccess }: ResetPasswordProps) {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Password strength check (reused from Register)
    const [strength, setStrength] = useState({
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasLength: false,
        score: 0
    });

    useEffect(() => {
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9\W]/.test(password);
        const hasLength = password.length >= 8;
        const score = [hasUpper, hasLower, hasNumber, hasLength].filter(Boolean).length;
        setStrength({ hasUpper, hasLower, hasNumber, hasLength, score });
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (strength.score < 4) {
            setStatus('error');
            setMessage('Please fulfill all password requirements.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
                token,
                newPassword: password,
            });
            setStatus('success');
            setMessage(response.data.message);
            setTimeout(onSuccess, 3000);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Failed to reset password. Token might be invalid or expired.');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-[440px] text-center">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck className="text-emerald-400 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4">Password reset!</h2>
                    <p className="text-slate-400 font-medium mb-4 leading-relaxed">
                        {message}
                    </p>
                    <p className="text-slate-500 text-sm">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[480px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-emerald-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 transform hover:scale-110 transition-transform duration-500">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Set New Password</h1>
                    <p className="text-slate-400 font-medium text-sm">Enter your reset token and new credentials</p>
                </div>

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 flex items-center gap-3 text-xs duration-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="leading-relaxed">{message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase text-left block">Reset Token</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Ticket className="w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Paste token from email"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium text-sm"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase text-left block">New Password</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium text-sm"
                                required
                            />
                        </div>

                        {/* Password Strength Indicators */}
                        <div className="mt-4 p-4 bg-white/5 rounded-2xl space-y-3">
                            <div className="flex gap-1 h-1">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= i ? 'bg-emerald-500' : 'bg-white/10'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-tight">
                                <div className={`flex items-center gap-1.5 ${strength.hasLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {strength.hasLength ? <ShieldCheck className="w-3 h-3" /> : <ShieldClose className="w-3 h-3" />}
                                    8+ Characters
                                </div>
                                <div className={`flex items-center gap-1.5 ${strength.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {strength.hasUpper ? <ShieldCheck className="w-3 h-3" /> : <ShieldClose className="w-3 h-3" />}
                                    Uppercase
                                </div>
                                <div className={`flex items-center gap-1.5 ${strength.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {strength.hasLower ? <ShieldCheck className="w-3 h-3" /> : <ShieldClose className="w-3 h-3" />}
                                    Lowercase
                                </div>
                                <div className={`flex items-center gap-1.5 ${strength.hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    {strength.hasNumber ? <ShieldCheck className="w-3 h-3" /> : <ShieldClose className="w-3 h-3" />}
                                    Number/Symbol
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 active:scale-[0.97] mt-4 group"
                    >
                        {status === 'loading' ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span className="text-base uppercase tracking-widest">Update Password</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
