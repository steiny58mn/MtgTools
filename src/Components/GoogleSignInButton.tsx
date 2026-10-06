import { useEffect, useRef, useState } from 'react';
import { AuthService, GOOGLE_CLIENT_ID, type UserDto } from '../Utilities/AuthService';

interface GoogleSignInButtonProps {
    onSuccess: (user: UserDto) => void;
    onError?: (errorMsg: string) => void;
    text?: 'signin_with' | 'signup_with' | 'continue_with';
    theme?: 'outline' | 'filled_black' | 'filled_blue';
    width?: string | number;
}

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: {
                        client_id: string;
                        callback: (response: { credential?: string }) => void;
                        auto_select?: boolean;
                        cancel_on_tap_outside?: boolean;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            type?: string;
                            theme?: string;
                            size?: string;
                            text?: string;
                            shape?: string;
                            logo_alignment?: string;
                            width?: number;
                        }
                    ) => void;
                    prompt: () => void;
                };
            };
        };
    }
}

export function GoogleSignInButton({
    onSuccess,
    onError,
    text = 'continue_with',
    theme = 'filled_black',
    width = '100%',
}: GoogleSignInButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [scriptLoaded, setScriptLoaded] = useState(
        () => typeof window !== 'undefined' && !!window.google?.accounts?.id
    );

    const clientId = GOOGLE_CLIENT_ID;

    // Ensure Google Identity Services script is available
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (window.google?.accounts?.id) {
            setScriptLoaded(true);
            return;
        }

        // Dynamically inject script if missing
        if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => setScriptLoaded(true);
            document.head.appendChild(script);
        }

        const checkInterval = setInterval(() => {
            if (window.google?.accounts?.id) {
                setScriptLoaded(true);
                clearInterval(checkInterval);
            }
        }, 150);

        const timer = setTimeout(() => {
            clearInterval(checkInterval);
        }, 5000);

        return () => {
            clearInterval(checkInterval);
            clearTimeout(timer);
        };
    }, []);

    // Initialize and render Google button
    useEffect(() => {
        if (!scriptLoaded || !containerRef.current || !clientId) return;

        try {
            window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: async (response: { credential?: string }) => {
                    if (!response?.credential) {
                        onError?.('No credential returned by Google.');
                        return;
                    }

                    setIsLoading(true);
                    try {
                        const result = await AuthService.loginWithGoogle(response.credential);
                        if (result.success && result.user) {
                            onSuccess(result.user);
                        } else {
                            onError?.(result.message || 'Google authentication failed.');
                        }
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : 'Could not communicate with authentication server.';
                        onError?.(message);
                    } finally {
                        setIsLoading(false);
                    }
                },
                auto_select: false,
                cancel_on_tap_outside: true,
            });

            // Clear previous button child nodes if re-rendering
            containerRef.current.innerHTML = '';

            window.google?.accounts.id.renderButton(containerRef.current, {
                type: 'standard',
                theme: theme,
                size: 'large',
                text: text,
                shape: 'rectangular',
                logo_alignment: 'left',
                width: typeof width === 'number' ? width : undefined,
            });
        } catch (e: unknown) {
            console.error('[GoogleSignInButton] Failed to render Google button:', e);
        }
    }, [scriptLoaded, clientId, text, theme, width, onSuccess, onError]);

    if (!clientId) {
        return (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs text-center">
                <span className="font-semibold">Google Sign-In:</span> Client ID is not configured.
            </div>
        );
    }

    return (
        <div className="relative w-full flex flex-col items-center">
            <div
                ref={containerRef}
                className="w-full flex justify-center [&>div]:!w-full [&>div>iframe]:!w-full min-h-[44px]"
            />
            {isLoading && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center rounded-xl z-10">
                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                    <span className="text-xs text-purple-300 font-medium">Verifying Google account...</span>
                </div>
            )}
        </div>
    );
}

export default GoogleSignInButton;
