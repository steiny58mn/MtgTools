import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, 
    LogIn, 
    UserPlus, 
    Lock, 
    User as UserIcon, 
    Mail, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { AuthService, type UserDto } from '../Utilities/AuthService';
import GoogleSignInButton from './GoogleSignInButton';

export type AuthMode = 'login' | 'register';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: AuthMode;
    onSuccess?: (user: UserDto) => void;
}

export function AuthModal({
    isOpen,
    onClose,
    initialMode = 'login',
    onSuccess,
}: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);

    // Form inputs
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');

    // Status & loading
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Sync initial mode
    useEffect(() => {
        setMode(initialMode);
        setErrorMessage(null);
        setSuccessMessage(null);
    }, [initialMode, isOpen]);

    // Handle Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const resetMessages = () => {
        setErrorMessage(null);
        setSuccessMessage(null);
    };

    const handleSwitchMode = (newMode: AuthMode) => {
        resetMessages();
        setMode(newMode);
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!loginUsername.trim() || !loginPassword) {
            setErrorMessage('Please enter your username/email and password.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await AuthService.login(loginUsername.trim(), loginPassword);
            if (res.success && res.user) {
                setSuccessMessage('Logged in successfully!');
                setTimeout(() => {
                    onSuccess?.(res.user!);
                    onClose();
                }, 600);
            } else {
                setErrorMessage(res.message || 'Invalid username or password.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to connect to authentication server.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        resetMessages();

        if (!regUsername.trim()) {
            setErrorMessage('Username is required.');
            return;
        }
        if (!regPassword || regPassword.length < 6) {
            setErrorMessage('Password must be at least 6 characters long.');
            return;
        }
        if (regPassword !== regConfirmPassword) {
            setErrorMessage('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await AuthService.register(
                regUsername.trim(),
                regPassword,
                regEmail.trim() || undefined
            );

            if (res.success && res.user) {
                setSuccessMessage(res.message || 'Account created successfully!');
                setTimeout(() => {
                    onSuccess?.(res.user!);
                    onClose();
                }, 600);
            } else {
                setErrorMessage(res.message || 'Registration failed.');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create account.';
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSuccess = (user: UserDto) => {
        setSuccessMessage(`Welcome, ${user.username}!`);
        setTimeout(() => {
            onSuccess?.(user);
            onClose();
        }, 500);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/75 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.1 }}
                    className="relative w-full max-w-md bg-slate-900/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl text-slate-100 z-10 my-8"
                >
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <ShieldCheck className="text-purple-400" size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Sign in to sync your custom decks across MTG Tools and the Deck Builder.
                        </p>
                    </div>

                    {/* Mode Tabs */}
                    <div className="flex bg-slate-950/60 p-1 rounded-2xl border border-white/5 mb-6">
                        <button
                            type="button"
                            onClick={() => handleSwitchMode('login')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'login'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <LogIn size={14} />
                            <span>Sign In</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSwitchMode('register')}
                            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'register'
                                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <UserPlus size={14} />
                            <span>Register</span>
                        </button>
                    </div>

                    {/* Google SSO Button */}
                    <div className="mb-5 space-y-2">
                        <GoogleSignInButton
                            onSuccess={handleGoogleSuccess}
                            onError={(err) => setErrorMessage(err)}
                            text={mode === 'login' ? 'continue_with' : 'signup_with'}
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center mb-5">
                        <div className="border-t border-purple-500/20 w-full" />
                        <span className="bg-slate-900 px-3 text-[11px] font-medium uppercase tracking-wider text-slate-500 shrink-0">
                            or with credentials
                        </span>
                        <div className="border-t border-purple-500/20 w-full" />
                    </div>

                    {/* Error and Success Alerts */}
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle size={16} className="shrink-0 text-rose-400" />
                            <span>{errorMessage}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    {mode === 'login' && (
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Username or Email
                                </label>
                                <div className="relative">
                                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        required
                                        value={loginUsername}
                                        onChange={(e) => setLoginUsername(e.target.value)}
                                        placeholder="Enter username or email"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    <>
                                        <LogIn size={16} />
                                        <span>Sign In</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Register Form */}
                    {mode === 'register' && (
                        <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Username
                                </label>
                                <div className="relative">
                                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        required
                                        value={regUsername}
                                        onChange={(e) => setRegUsername(e.target.value)}
                                        placeholder="Choose a username"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Email (Optional)
                                </label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        placeholder="At least 6 characters"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="password"
                                        required
                                        value={regConfirmPassword}
                                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                                        placeholder="Confirm your password"
                                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Creating Account...</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={16} />
                                        <span>Create Account</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

export default AuthModal;
