import React, { useState } from 'react';
import axios from 'axios';
import { MailCheck, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface EmailVerificationProps {
    email: string;
    onVerificationSuccess: (token: string, user: any) => void;
    onBackToLogin: () => void;
}

export default function EmailVerification({ email, onVerificationSuccess, onBackToLogin }: EmailVerificationProps) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (code.length !== 6) {
            setError('Verification code must be 6 digits.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:3000/auth/verify', {
                email,
                code,
            });
            onVerificationSuccess(response.data.access_token, response.data.user);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[440px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/20 transform hover:scale-110 transition-transform duration-500">
                        <MailCheck className="text-white w-10 h-10" />
                    </div>
                    <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Verify Email</h1>
                    <p className="text-slate-400 font-medium">We've sent a 6-digit code to</p>
                    <p className="text-emerald-400 font-bold mt-1">{email}</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl mb-10 flex items-center gap-4 text-sm duration-300">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <p className="leading-relaxed">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-3 text-center">
                        <label className="text-sm font-bold text-slate-300 tracking-wide uppercase opacity-70">Verification Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="w-full bg-slate-800/30 border border-white/5 rounded-[1.25rem] py-6 text-center text-3xl font-black tracking-[0.5em] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-700"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black py-5 rounded-[1.25rem] transition-all duration-300 shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-3 active:scale-[0.97] group"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <span className="text-lg">Verify & Login</span>
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
