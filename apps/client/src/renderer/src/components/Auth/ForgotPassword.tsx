import React, { useState } from 'react';
import axios from 'axios';
import { KeyRound, Mail, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
    onBackToLogin: () => void;
    onResetRequested: () => void;
}

export default function ForgotPassword({ onBackToLogin, onResetRequested }: ForgotPasswordProps) {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post('http://127.0.0.1:3000/auth/forgot-password', { email });
            setStatus('success');
            setMessage(response.data.message);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-[440px] text-center">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <Mail className="text-emerald-400 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4">Check your email</h2>
                    <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                        {message}
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={onResetRequested}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                            I have the token, set new password
                        </button>
                        <button
                            onClick={onBackToLogin}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl transition-all"
                        >
                            Back to login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[440px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20 transform hover:scale-110 transition-transform duration-500">
                        <KeyRound className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Recover Access</h1>
                    <p className="text-slate-400 font-medium">Enter your email to receive a reset link</p>
                </div>

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl mb-10 flex items-center gap-4 text-sm duration-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p className="leading-relaxed">{message}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-300 ml-1 tracking-wide uppercase opacity-70">Email Address</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center pointer-events-none">
                                <Mail className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-[1.25rem] py-5 pl-14 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-black py-5 rounded-[1.25rem] transition-all duration-300 shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-3 active:scale-[0.97] group"
                    >
                        {status === 'loading' ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <span className="text-lg">Send Instructions</span>
                                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <button
                        onClick={onBackToLogin}
                        className="flex items-center gap-2 text-slate-500 font-bold hover:text-white transition-all mx-auto group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to login
                    </button>
                </div>
            </div>
        </div>
    );
}
