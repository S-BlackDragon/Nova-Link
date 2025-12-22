import React, { useState } from 'react';
import axios from 'axios';
import { User, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import NovaLinkIcon from '../NovaLinkIcon';

interface LoginProps {
    onLoginSuccess: (token: string, user: any) => void;
    onSwitchToRegister: () => void;
    onForgotPassword: () => void;
}

export default function Login({ onLoginSuccess, onSwitchToRegister, onForgotPassword }: LoginProps) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                identifier,
                password,
            });
            onLoginSuccess(response.data.access_token, response.data.user);
        } catch (err: any) {
            console.error('Login error details:', err);
            const msg = err.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join(', ') : (msg || 'Invalid credentials or connection error.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[440px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20 transform hover:scale-110 transition-transform duration-500">
                        <NovaLinkIcon className="text-white drop-shadow-lg" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Welcome Back</h1>
                    <p className="text-slate-400 font-medium">Manage your modpacks with ease</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl mb-10 flex items-center gap-4 text-sm duration-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p className="leading-relaxed">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-300 ml-1 tracking-wide uppercase opacity-70">Username or Email</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-none">
                                <User className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Username or email"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-[1.25rem] py-5 pl-14 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-sm font-bold text-slate-300 tracking-wide uppercase opacity-70">Password</label>
                            <button
                                type="button"
                                onClick={onForgotPassword}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-none">
                                <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-[1.25rem] py-5 pl-14 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black py-5 rounded-[1.25rem] transition-all duration-300 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 active:scale-[0.97] mt-6 group"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <span className="text-lg">Login</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-slate-400 font-medium">
                        Don't have an account?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="text-indigo-400 font-bold hover:text-indigo-300 transition-all hover:underline underline-offset-4"
                        >
                            Register here
                        </button>
                    </p>
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Version 1.0.18</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
