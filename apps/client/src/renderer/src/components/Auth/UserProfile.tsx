import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Mail, Lock, Camera, X, Check, Loader2, AlertCircle, RefreshCw, Key, Upload } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { getAvatarUrl } from '../../utils/avatarHelper';

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onUpdate: (updatedUser: any) => void;
}

export default function UserProfile({ isOpen, onClose, user, onUpdate }: UserProfileProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'security'>('profile');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Profile State
    const [username, setUsername] = useState(user?.username || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

    // Email state
    const [newEmail, setNewEmail] = useState('');
    const [emailStep, setEmailStep] = useState<'request' | 'verify'>('request');
    const [emailCode, setEmailCode] = useState('');

    // Password state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    useEffect(() => {
        setError(null);
        setSuccess(null);
    }, [activeTab]);

    if (!isOpen) return null;

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.patch(`${API_BASE_URL}/auth/profile`,
                { username, avatarUrl },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            onUpdate(response.data);
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Get pre-signed upload URL from backend
            const urlResponse = await axios.get(
                `${API_BASE_URL}/auth/avatar-upload-url?contentType=${encodeURIComponent(file.type)}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            const { uploadUrl, publicUrl } = urlResponse.data;

            // 2. Upload directly to MinIO using the pre-signed URL
            await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            // 3. Confirm the upload with the backend
            const confirmResponse = await axios.patch(
                `${API_BASE_URL}/auth/avatar-confirm`,
                { publicUrl },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            setAvatarUrl(confirmResponse.data.avatarUrl);
            onUpdate(confirmResponse.data);
            setSuccess('Avatar uploaded successfully!');
        } catch (err: any) {
            console.error('Upload failed:', err);
            setError(err.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    const handleRequestEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.post(`${API_BASE_URL}/auth/request-email-change`,
                { newEmail },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setEmailStep('verify');
            setSuccess('Verification code sent to your new email.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to request email change');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEmailChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.patch(`${API_BASE_URL}/auth/confirm-email-change`,
                { newEmail, code: emailCode },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            onUpdate(response.data);
            setSuccess('Email updated successfully!');
            setEmailStep('request');
            setNewEmail('');
            setEmailCode('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid code or verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await axios.patch(`${API_BASE_URL}/auth/update-password`,
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            setSuccess('Password updated successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                            <User className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">Your Profile</h2>
                            <p className="text-slate-500 text-sm font-medium">Manage your account settings</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-slate-500 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex h-[500px]">
                    {/* Sidebar Tabs */}
                    <div className="w-48 border-r border-white/5 p-4 space-y-2 bg-black/20">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                        >
                            <User className="w-5 h-5" />
                            <span>General</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'email' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                        >
                            <Mail className="w-5 h-5" />
                            <span>Email</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'security' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}
                        >
                            <Lock className="w-5 h-5" />
                            <span>Security</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 font-bold animate-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 font-bold animate-in slide-in-from-top-2">
                                <Check className="w-5 h-5 flex-shrink-0" />
                                <p>{success}</p>
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative group">
                                        <div className="w-24 h-24 bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl flex items-center justify-center border-2 border-white/10 shadow-xl overflow-hidden">
                                            {getAvatarUrl(avatarUrl) ? (
                                                <img src={getAvatarUrl(avatarUrl)!} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white font-black text-3xl">{username?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white leading-tight">{username}</h3>
                                        <p className="text-slate-500 text-sm">{user?.email}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                placeholder="Your username"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Avatar Image</label>
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                <input
                                                    type="url"
                                                    value={avatarUrl}
                                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    placeholder="https://example.com/avatar.png"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all border border-white/5 disabled:opacity-50"
                                                title="Upload from computer"
                                            >
                                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                                <span className="hidden sm:inline">Upload</span>
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                accept="image/*"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                    Save Profile
                                </button>
                            </form>
                        )}

                        {activeTab === 'email' && (
                            <div className="space-y-6 text-center lg:text-left">
                                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-8">
                                    <p className="text-slate-400 font-medium mb-1">Current Email</p>
                                    <p className="text-white text-lg font-black">{user?.email}</p>
                                </div>

                                {emailStep === 'request' ? (
                                    <form onSubmit={handleRequestEmailChange} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">New Email Address</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                <input
                                                    type="email"
                                                    value={newEmail}
                                                    onChange={(e) => setNewEmail(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                    placeholder="new@example.com"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !newEmail || newEmail === user?.email}
                                            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                            Verify New Email
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleConfirmEmailChange} className="space-y-4">
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-500 font-bold mb-4">
                                            <AlertCircle className="w-5 h-5" />
                                            <p>Enter the 6-digit code sent to {newEmail}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Verification Code</label>
                                            <input
                                                type="text"
                                                value={emailCode}
                                                onChange={(e) => setEmailCode(e.target.value)}
                                                maxLength={6}
                                                className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 px-4 text-white font-black text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-all"
                                                placeholder="000000"
                                                required
                                            />
                                        </div>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setEmailStep('request')}
                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading || emailCode.length !== 6}
                                                className="flex-[2] bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3"
                                            >
                                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                                Confirm Change
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 mb-6 flex items-start gap-4">
                                    <Key className="w-6 h-6 text-indigo-400 mt-1" />
                                    <div>
                                        <h4 className="text-white font-bold">Update Password</h4>
                                        <p className="text-slate-500 text-sm">Choose a strong password with letters and numbers.</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Current Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Confirm New Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !newPassword || newPassword !== confirmPassword}
                                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 mt-4"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                                    Update Password
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
