import { useState, useRef, useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface CardHoverImageProps {
    src: string;
    alt: string;
    className?: string;
    popoutSrc?: string;
    popoutWidth?: number;
    delayMs?: number;
    loading?: 'lazy' | 'eager';
    onClick?: (e: MouseEvent<HTMLElement>) => void;
    children?: ReactNode;
}

export default function CardHoverImage({
    src,
    alt,
    className = '',
    popoutSrc,
    popoutWidth = 380,
    delayMs = 1000,
    loading = 'lazy',
    onClick,
    children
}: CardHoverImageProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLSpanElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const updatePosition = (clientX: number, clientY: number) => {
        const width = Math.min(popoutWidth, window.innerWidth - 32);
        const height = Math.round(width * 1.396); // Standard MTG card ratio 63x88mm ~ 1.396
        const margin = 16;

        // Default: display to the right of the cursor
        let x = clientX + 24;
        let y = clientY - height / 2;

        // If overflowing viewport right edge, flip to left of cursor
        if (x + width + margin > window.innerWidth) {
            x = clientX - width - 24;
        }

        // Left boundary clamp
        if (x < margin) {
            x = margin;
        }

        // Vertical boundary clamp
        if (y < margin) {
            y = margin;
        } else if (y + height + margin > window.innerHeight) {
            y = Math.max(margin, window.innerHeight - height - margin);
        }

        setPos({ x, y });
    };

    const handleMouseEnter = (e: MouseEvent<HTMLElement>) => {
        lastCoordsRef.current = { x: e.clientX, y: e.clientY };
        updatePosition(e.clientX, e.clientY);
        clearTimer();
        if (delayMs <= 0) {
            setIsHovered(true);
        } else {
            timerRef.current = setTimeout(() => {
                updatePosition(lastCoordsRef.current.x, lastCoordsRef.current.y);
                setIsHovered(true);
            }, delayMs);
        }
    };

    const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
        lastCoordsRef.current = { x: e.clientX, y: e.clientY };
        if (isHovered) {
            updatePosition(e.clientX, e.clientY);
        }
    };

    const handleMouseLeave = () => {
        clearTimer();
        setIsHovered(false);
    };

    // Hide if window scrolls or user presses Esc
    useEffect(() => {
        const handleScroll = () => {
            clearTimer();
            setIsHovered(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearTimer();
                setIsHovered(false);
            }
        };

        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimer();
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const largeImage = popoutSrc || src;

    const portalPopup = isHovered && typeof document !== 'undefined' && createPortal(
        <div
            className="fixed z-[99999] pointer-events-none transition-opacity duration-100 animate-in fade-in"
            style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: `${popoutWidth}px`,
            }}
        >
            <div className="rounded-2xl p-1 bg-slate-950/95 border-2 border-purple-500/70 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-md">
                <img
                    src={largeImage}
                    alt={alt}
                    className="w-full h-auto rounded-xl object-contain block shadow-2xl"
                />
            </div>
        </div>,
        document.body
    );

    if (children) {
        return (
            <>
                <span
                    ref={containerRef}
                    className={`inline-block transition-colors cursor-pointer ${className}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={onClick}
                >
                    {children}
                </span>
                {portalPopup}
            </>
        );
    }

    return (
        <>
            <img
                ref={imageRef}
                src={src}
                alt={alt}
                loading={loading}
                className={`cursor-zoom-in transition-transform duration-200 hover:brightness-105 ${className}`}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            />
            {portalPopup}
        </>
    );
}
