import { useEffect, useState } from 'react';
import { apiPaths } from './Enums';

export const STORAGE_AUTH_SESSION_KEY = 'mtg_auth_session';
export const STORAGE_DECKBUILDER_USER_KEY = 'mtgtools_deckbuilder_username';
export const GOOGLE_CLIENT_ID = 
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ||
    '1089822964667-in9l289hmrmggelf028l3oqugsltroos.apps.googleusercontent.com';

export interface UserDto {
    userId: string;
    username: string;
    email?: string;
    isActive?: boolean;
    createdAt?: number;
    lastLoginAt?: number;
}

export interface AuthSession {
    user: UserDto;
    token: string;
    app?: string;
    hasAppAccess?: boolean;
    savedAt: number;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    user?: UserDto;
    token?: string;
    app?: string;
    hasAppAccess?: boolean;
}

type AuthListener = (user: UserDto | null) => void;

class AuthServiceClass {
    private currentSession: AuthSession | null = null;
    private listeners: Set<AuthListener> = new Set();
    private hasValidated = false;

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem(STORAGE_AUTH_SESSION_KEY);
            if (raw) {
                this.currentSession = JSON.parse(raw);
            }
        } catch (e) {
            console.error('[AuthService] Error reading auth session from storage:', e);
            this.currentSession = null;
        }
    }

    private saveToStorage(session: AuthSession | null): void {
        this.currentSession = session;
        if (typeof window !== 'undefined') {
            try {
                if (session) {
                    localStorage.setItem(STORAGE_AUTH_SESSION_KEY, JSON.stringify(session));
                    // Keep the deckbuilder user key in sync for quick lookup
                    if (session.user?.username) {
                        localStorage.setItem(STORAGE_DECKBUILDER_USER_KEY, session.user.username);
                    }
                } else {
                    localStorage.removeItem(STORAGE_AUTH_SESSION_KEY);
                }
            } catch (e) {
                console.error('[AuthService] Error saving auth session:', e);
            }
        }
        this.notifyListeners();
    }

    public subscribe(listener: AuthListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notifyListeners(): void {
        const user = this.getCurrentUser();
        this.listeners.forEach((listener) => {
            try {
                listener(user);
            } catch (e) {
                console.error('[AuthService] Error notifying listener:', e);
            }
        });
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mtgtools_auth_change', { detail: user }));
        }
    }

    public getCurrentSession(): AuthSession | null {
        return this.currentSession;
    }

    public getCurrentUser(): UserDto | null {
        return this.currentSession?.user || null;
    }

    public getToken(): string | null {
        return this.currentSession?.token || null;
    }

    public isLoggedIn(): boolean {
        return !!this.currentSession?.token && !!this.currentSession?.user;
    }

    public getSavedUsername(): string {
        if (typeof window === 'undefined') return '';
        if (this.currentSession?.user?.username) {
            return this.currentSession.user.username;
        }
        return localStorage.getItem(STORAGE_DECKBUILDER_USER_KEY) || '';
    }

    public setSavedUsername(username: string): void {
        if (typeof window === 'undefined') return;
        const clean = username.trim();
        if (clean) {
            localStorage.setItem(STORAGE_DECKBUILDER_USER_KEY, clean);
        } else {
            localStorage.removeItem(STORAGE_DECKBUILDER_USER_KEY);
        }
        window.dispatchEvent(new CustomEvent('mtgtools_saved_user_change', { detail: clean }));
    }

    public getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            Accept: 'application/json',
            ...customHeaders,
        };

        if (this.currentSession?.token) {
            headers['Authorization'] = `Bearer ${this.currentSession.token}`;
        }
        if (this.currentSession?.user?.username) {
            headers['X-Username'] = this.currentSession.user.username;
        }
        if (this.currentSession?.user?.email) {
            headers['X-Email'] = this.currentSession.user.email;
        }
        if (this.currentSession?.user?.userId) {
            headers['X-User-Id'] = this.currentSession.user.userId;
        }

        return headers;
    }

    /**
     * Authenticate with username and password
     */
    public async login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
        const clean = usernameOrEmail.trim();
        if (!clean || !password) {
            return { success: false, message: 'Username/Email and password are required.' };
        }

        try {
            const res = await fetch(apiPaths.SecurityLogin, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: clean,
                    password,
                    app: 'deckbuilder',
                }),
            });

            const data: LoginResponse = await res.json().catch(() => ({
                success: false,
                message: `HTTP ${res.status}: ${res.statusText}`,
            }));

            if (res.ok && data.success && data.user && data.token) {
                const session: AuthSession = {
                    user: data.user,
                    token: data.token,
                    app: data.app || 'deckbuilder',
                    hasAppAccess: data.hasAppAccess ?? true,
                    savedAt: Date.now(),
                };
                this.saveToStorage(session);
                return data;
            }

            return data;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Network error during login.';
            return { success: false, message };
        }
    }

    /**
     * Authenticate or auto-register with Google OAuth ID Token
     */
    public async loginWithGoogle(idToken: string): Promise<LoginResponse> {
        if (!idToken) {
            return { success: false, message: 'Google ID token is required.' };
        }

        try {
            const res = await fetch(apiPaths.SecurityGoogleLogin, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    app: 'deckbuilder',
                }),
            });

            const data: LoginResponse = await res.json().catch(() => ({
                success: false,
                message: `HTTP ${res.status}: ${res.statusText}`,
            }));

            if (res.ok && data.success && data.user && data.token) {
                const session: AuthSession = {
                    user: data.user,
                    token: data.token,
                    app: data.app || 'deckbuilder',
                    hasAppAccess: data.hasAppAccess ?? true,
                    savedAt: Date.now(),
                };
                this.saveToStorage(session);
                return data;
            }

            return data;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Network error during Google login.';
            return { success: false, message };
        }
    }

    /**
     * Register a new user account and log in automatically
     */
    public async register(
        username: string,
        password: string,
        email?: string
    ): Promise<{ success: boolean; message: string; user?: UserDto }> {
        const cleanUsername = username.trim();
        const cleanEmail = email?.trim() || undefined;

        if (!cleanUsername) {
            return { success: false, message: 'Username is required.' };
        }
        if (!password || password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters long.' };
        }

        try {
            const res = await fetch(apiPaths.SecurityRegister, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: cleanUsername,
                    password,
                    email: cleanEmail,
                    allowedApps: ['*'],
                }),
            });

            const data = await res.json().catch(() => ({
                success: false,
                message: `HTTP ${res.status}: ${res.statusText}`,
            }));

            if (res.ok && data.success) {
                const loginRes = await this.login(cleanUsername, password);
                return {
                    success: true,
                    message: data.message || 'Account registered successfully!',
                    user: loginRes.user || data.user,
                };
            }

            return {
                success: false,
                message: data.message || 'Registration failed.',
            };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Network error during registration.';
            return { success: false, message };
        }
    }

    /**
     * Validate current session with backend
     */
    public async validateSession(): Promise<boolean> {
        if (this.hasValidated) return this.isLoggedIn();
        this.hasValidated = true;

        if (!this.currentSession?.token) return false;

        try {
            const res = await fetch(apiPaths.SecurityValidate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: this.currentSession.token,
                    app: 'deckbuilder',
                }),
            });

            if (!res.ok) {
                this.logout();
                return false;
            }

            const data = await res.json();
            if (data.isValid && data.hasAppAccess) {
                if (data.user) {
                    this.currentSession.user = data.user;
                    localStorage.setItem(STORAGE_AUTH_SESSION_KEY, JSON.stringify(this.currentSession));
                    this.notifyListeners();
                }
                return true;
            }

            this.logout();
            return false;
        } catch {
            // Keep local session if offline or temporary network issue
            return true;
        }
    }

    public logout(): void {
        this.saveToStorage(null);
    }
}

export const AuthService = new AuthServiceClass();

/**
 * React hook to observe authentication and saved username state
 */
export function useAuth() {
    const [user, setUser] = useState<UserDto | null>(() => AuthService.getCurrentUser());
    const [savedUsername, setSavedUsernameState] = useState<string>(() => AuthService.getSavedUsername());

    useEffect(() => {
        const unsubscribe = AuthService.subscribe((updatedUser) => {
            setUser(updatedUser);
            setSavedUsernameState(AuthService.getSavedUsername());
        });

        const handleSavedUserChange = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            setSavedUsernameState(customEvent.detail || AuthService.getSavedUsername());
        };

        window.addEventListener('mtgtools_saved_user_change', handleSavedUserChange);

        return () => {
            unsubscribe();
            window.removeEventListener('mtgtools_saved_user_change', handleSavedUserChange);
        };
    }, []);

    const setSavedUsername = (username: string) => {
        AuthService.setSavedUsername(username);
        setSavedUsernameState(username);
    };

    const logout = () => {
        AuthService.logout();
    };

    return {
        user,
        isLoggedIn: !!user,
        savedUsername,
        setSavedUsername,
        logout,
    };
}
