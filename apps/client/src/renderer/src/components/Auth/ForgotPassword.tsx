import React, { useState } from 'react';
import axios from 'axios';
import { KeyRound, Mail, Loader2, AlertCircle, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ForgotPasswordProps {
    onBackToLogin: () => void;
    onResetRequested: () => void;
}

type Step = 'EMAIL' | 'CODE' | 'PASSWORD';

export default function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
    const [step, setStep] = useState<Step>('EMAIL');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
            setStatus('idle');
            setStep('CODE');
            setMessage(response.data.message);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Failed to send code. Please try again.');
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            await axios.post(`${API_BASE_URL}/auth/verify-reset-code`, { email, code });
            setStatus('idle');
            setStep('PASSWORD');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Invalid code. Please try again.');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
                email,
                code,
                newPassword
            });
            setStatus('success');
            setMessage(response.data.message);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Failed to reset password.');
        }
    };

    if (status === 'success') {
        return (
            <div className="w-full max-w-[440px] text-center">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck className="text-emerald-400 w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-4">Password Reset!</h2>
                    <p className="text-slate-400 font-medium mb-10 leading-relaxed">
                        Your password has been successfully updated. You can now login with your new credentials.
                    </p>
                    <button
                        onClick={onBackToLogin}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                    >
                        Back to login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[440px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-12 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
                        {step === 'EMAIL' && <Mail className="text-white w-8 h-8" />}
                        {step === 'CODE' && <KeyRound className="text-white w-8 h-8" />}
                        {step === 'PASSWORD' && <Lock className="text-white w-8 h-8" />}
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                        {step === 'EMAIL' && 'Forgot Password?'}
                        {step === 'CODE' && 'Enter Code'}
                        {step === 'PASSWORD' && 'New Password'}
                    </h1>
                    <p className="text-slate-400 font-medium text-sm">
                        {step === 'EMAIL' && 'Enter your email to receive a code'}
                        {step === 'CODE' && `Code sent to ${email}`}
                        {step === 'PASSWORD' && 'Set your new secure password'}
                    </p>
                </div>

                {/* Error Message */}
                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex items-center gap-3 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{message}</p>
                    </div>
                )}

                {/* Step 1: Email */}
                {step === 'EMAIL' && (
                    <form onSubmit={handleSendCode} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1 uppercase opacity-70">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin" /> : 'Send Code'}
                        </button>
                    </form>
                )}

                {/* Step 2: Code */}
                {step === 'CODE' && (
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1 uppercase opacity-70">Verification Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="123456"
                                maxLength={6}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-4 px-5 text-center text-2xl tracking-[0.5em] font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('EMAIL')}
                            className="w-full text-slate-500 hover:text-white text-sm font-medium transition-colors"
                        >
                            Change Email
                        </button>
                    </form>
                )}

                {/* Step 3: Password */}
                {step === 'PASSWORD' && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 ml-1 uppercase opacity-70">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={8}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-4 px-5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center pt-8 border-t border-white/5">
                    <button
                        onClick={onBackToLogin}
                        className="text-slate-500 hover:text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
