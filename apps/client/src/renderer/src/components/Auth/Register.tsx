import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Lock, User, Loader2, AlertCircle, ArrowRight, ShieldCheck, ShieldClose } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import NovaLinkIcon from '../NovaLinkIcon';

interface RegisterProps {
    onRegisterSuccess: (email: string) => void;
    onSwitchToLogin: () => void;
}

export default function Register({ onRegisterSuccess, onSwitchToLogin }: RegisterProps) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Email validation state
    const [emailValidation, setEmailValidation] = useState<{
        isValidating: boolean;
        isValid: boolean | null;
        message: string;
    }>({ isValidating: false, isValid: null, message: '' });

    // Password strength state
    const [strength, setStrength] = useState({
        hasUpper: false,
        hasLower: false,
        hasNumber: false,
        hasLength: false,
        score: 0
    });

    // Real-time email validation with debounce
    useEffect(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || !emailRegex.test(email)) {
            setEmailValidation({ isValidating: false, isValid: null, message: '' });
            return;
        }

        setEmailValidation(prev => ({ ...prev, isValidating: true }));

        const timeoutId = setTimeout(async () => {
            try {
                const response = await axios.post(`${API_BASE_URL}/auth/validate-email`, { email });
                setEmailValidation({
                    isValidating: false,
                    isValid: response.data.valid,
                    message: response.data.reason
                });
            } catch (err: any) {
                setEmailValidation({
                    isValidating: false,
                    isValid: false,
                    message: err.response?.data?.message || 'Could not validate email'
                });
            }
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [email]);

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
        setError('');

        if (username.length < 4 || username.length > 25) {
            setError('Username must be between 4 and 25 characters.');
            return;
        }

        if (strength.score < 4) {
            setError('Please fulfill all password requirements for a secure account.');
            return;
        }

        if (emailValidation.isValid === false) {
            setError('Please use a valid email address.');
            return;
        }

        setLoading(true);

        try {
            await axios.post(`${API_BASE_URL}/auth/register`, {
                username,
                email,
                password,
            });
            onRegisterSuccess(email);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[480px] duration-700">
            <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)]">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20 transform hover:scale-110 transition-transform duration-500">
                        <NovaLinkIcon className="text-white drop-shadow-lg" size={32} />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Create Account</h1>
                    <p className="text-slate-400 font-medium">Join the modpack community today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-8 flex items-center gap-3 text-xs duration-300">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="leading-relaxed">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">Username</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <User className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="4-25 chars"
                                minLength={4}
                                maxLength={25}
                                className={`w-full bg-slate-800/30 border rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium text-sm ${username.length >= 4 && username.length <= 25
                                    ? 'border-emerald-500/50 focus:ring-emerald-500/50'
                                    : username.length > 0
                                        ? 'border-red-500/50 focus:ring-red-500/50'
                                        : 'border-white/5 focus:ring-purple-500/50'
                                    }`}
                                required
                            />
                            {/* Username validation indicator */}
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {username.length > 0 && (
                                    <>
                                        <span className={`text-[10px] font-bold ${username.length >= 4 && username.length <= 25 ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                            {username.length}/25
                                        </span>
                                        {username.length >= 4 && username.length <= 25 ? (
                                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <ShieldClose className="w-4 h-4 text-red-400" />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        {username.length > 0 && (username.length < 4 || username.length > 25) && (
                            <p className="text-[10px] font-medium ml-1 text-red-400">
                                Username must be 4-25 characters
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">Email Address</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className={`w-full bg-slate-800/30 border rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:ring-2 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium text-sm ${emailValidation.isValid === true
                                    ? 'border-emerald-500/50 focus:ring-emerald-500/50'
                                    : emailValidation.isValid === false
                                        ? 'border-red-500/50 focus:ring-red-500/50'
                                        : 'border-white/5 focus:ring-purple-500/50'
                                    }`}
                                required
                            />
                            {/* Email validation indicator */}
                            <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                {emailValidation.isValidating && (
                                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                )}
                                {!emailValidation.isValidating && emailValidation.isValid === true && (
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                )}
                                {!emailValidation.isValidating && emailValidation.isValid === false && (
                                    <ShieldClose className="w-4 h-4 text-red-400" />
                                )}
                            </div>
                        </div>
                        {/* Email validation message */}
                        {emailValidation.message && !emailValidation.isValidating && (
                            <p className={`text-[10px] font-medium ml-1 ${emailValidation.isValid ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                {emailValidation.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 ml-1 tracking-widest uppercase">Password</label>
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center pointer-events-none">
                                <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors duration-300" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/30 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-slate-800/50 transition-all duration-300 placeholder:text-slate-600 font-medium text-sm"
                                required
                            />
                        </div>

                        {/* Password Strength Indicators */}
                        <div className="mt-4 p-4 bg-white/5 rounded-2xl space-y-3">
                            <div className="flex gap-1 h-1">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-full transition-all duration-500 ${strength.score >= i
                                            ? (strength.score <= 2 ? 'bg-red-500' : strength.score === 3 ? 'bg-yellow-500' : 'bg-emerald-500')
                                            : 'bg-white/10'
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
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all duration-300 shadow-xl shadow-purple-500/25 flex items-center justify-center gap-3 active:scale-[0.97] mt-4 group"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span className="text-base uppercase tracking-widest">Register</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-white/5 pt-8">
                    <p className="text-slate-400 font-medium text-sm mb-6">
                        Already have an account?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-purple-400 font-bold hover:text-purple-300 transition-all hover:underline underline-offset-4"
                        >
                            Login here
                        </button>
                    </p>
                    <div className="pt-6 border-t border-white/5">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">Version {__APP_VERSION__}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
