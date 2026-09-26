import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { autocompleteCards, getCachedAutocomplete } from '../Utilities/ScryfallService';
import { X } from 'lucide-react';

interface CardTagAutocompleteTextareaProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
    disabled?: boolean;
    tabIndex?: number;
    autoFocus?: boolean;
}

export const CardTagAutocompleteTextarea: React.FC<CardTagAutocompleteTextareaProps> = ({
    value,
    onChange,
    placeholder = 'Type comments here... Type [[ to insert an MTGNexus card tag',
    className = '',
    rows = 3,
    disabled = false,
    tabIndex,
    autoFocus
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [activeMatch, setActiveMatch] = useState<{ query: string; startIndex: number; endIndex: number } | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ 
        left: number; 
        width: number; 
        maxHeight: number;
        placeAbove: boolean;
        top?: number;
        bottom?: number;
    }>({
        left: 0,
        width: 300,
        maxHeight: 240,
        placeAbove: false,
        top: 0
    });
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastQueryRef = useRef<string>('');
    const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

    // Calculate fixed screen coordinates for portal dropdown so it floats above modals without clipping
    // When placing above, anchor to 'bottom' so short filtered lists (1-2 cards) stay pinned right above textarea
    const updateDropdownPosition = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const rect = textarea.getBoundingClientRect();
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // If tight on bottom (< 180px) and more space above, position above textarea
        const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
        const maxHeight = Math.min(240, Math.max(120, placeAbove ? spaceAbove - 20 : spaceBelow - 20));
        
        if (placeAbove) {
            // Anchor to JUST ABOVE the textarea using 'bottom'
            // This ensures that when the list filters to 1 or 2 cards, it stays pinned right against the top of the textarea!
            const bottom = window.innerHeight - rect.top + 6;
            setDropdownPos({
                left: Math.max(10, rect.left),
                width: Math.min(rect.width, window.innerWidth - 20),
                maxHeight,
                placeAbove: true,
                bottom
            });
        } else {
            // Anchor to JUST BELOW the textarea using 'top'
            const top = rect.bottom + 6;
            setDropdownPos({
                left: Math.max(10, rect.left),
                width: Math.min(rect.width, window.innerWidth - 20),
                maxHeight,
                placeAbove: false,
                top
            });
        }
    }, []);

    // Automatically scroll the highlighted suggestion into view
    useEffect(() => {
        if (isOpen && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, isOpen]);

    // Keep portal position pinned to textarea on resize or scroll
    useEffect(() => {
        if (!isOpen) return;

        updateDropdownPosition();

        const handleUpdate = () => {
            updateDropdownPosition();
        };

        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);

        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen, updateDropdownPosition]);

    // Re-calculate position whenever suggestions count changes to maintain tight layout
    useEffect(() => {
        if (isOpen) {
            updateDropdownPosition();
        }
    }, [suggestions.length, isOpen, updateDropdownPosition]);

    // Close autocomplete on outside click
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                textareaRef.current && 
                !textareaRef.current.contains(target) &&
                dropdownRef.current && 
                !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isOpen]);

    // Check caret position and detect if user is typing a card tag like [[CardName
    const checkCaretForTag = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);

        // Find the last occurrence of '[[' before cursor
        const lastOpen = textBeforeCursor.lastIndexOf('[[');
        const lastClose = textBeforeCursor.lastIndexOf(']]');

        // Check if there is an unclosed '[[' before cursor and no newlines in between
        if (lastOpen !== -1 && lastOpen > lastClose) {
            const query = textBeforeCursor.slice(lastOpen + 2);
            if (!query.includes('\n')) {
                setActiveMatch({
                    query,
                    startIndex: lastOpen,
                    endIndex: cursorPos
                });

                const cleanQuery = query.trim().toLowerCase();

                // If the query text hasn't changed, keep current suggestions and selection
                if (cleanQuery === lastQueryRef.current && isOpen) {
                    return;
                }

                lastQueryRef.current = cleanQuery;

                if (cleanQuery.length >= 1) {
                    // Check client memory cache first for instant 0ms pop-up
                    const cached = getCachedAutocomplete(cleanQuery);
                    if (cached) {
                        setSuggestions(cached.slice(0, 8));
                        setSelectedIndex(0);
                        setIsOpen(cached.length > 0);
                        updateDropdownPosition();
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        return;
                    }

                    // Rapid 60ms debounce for remote Scryfall autocomplete
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    debounceTimerRef.current = setTimeout(async () => {
                        const results = await autocompleteCards(cleanQuery);
                        // Prevent race condition if query moved on
                        if (lastQueryRef.current === cleanQuery) {
                            setSuggestions(results.slice(0, 8));
                            setSelectedIndex(0);
                            setIsOpen(results.length > 0);
                            updateDropdownPosition();
                        }
                    }, 60);
                } else {
                    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                    setSuggestions([]);
                    setIsOpen(false);
                }
                return;
            }
        }

        // Not inside a tag
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        lastQueryRef.current = '';
        setActiveMatch(null);
        setIsOpen(false);
        setSuggestions([]);
    }, [value, isOpen, updateDropdownPosition]);

    useEffect(() => {
        checkCaretForTag();
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [value, checkCaretForTag]);

    // Insert selected card tag
    const selectCard = (cardName: string) => {
        const textarea = textareaRef.current;
        if (!textarea || !activeMatch) return;

        const before = value.slice(0, activeMatch.startIndex);
        const after = value.slice(activeMatch.endIndex);
        const replacement = `[[${cardName}]] `;
        const newValue = `${before}${replacement}${after}`;

        onChange(newValue);
        setIsOpen(false);
        setSuggestions([]);
        setActiveMatch(null);
        lastQueryRef.current = '';

        // Restore focus and cursor position right after '[[Card Name]] '
        requestAnimationFrame(() => {
            textarea.focus();
            const newPos = before.length + replacement.length;
            textarea.setSelectionRange(newPos, newPos);
        });
    };

    // Keyboard navigation in suggestions dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!isOpen || suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex((prev) => (prev + 1) % suggestions.length);
            return;
        } 
        
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
            return;
        } 
        
        if (!e.ctrlKey && !e.metaKey && (e.key === 'Enter' || e.key === 'Tab')) {
            e.preventDefault();
            e.stopPropagation();
            if (suggestions[selectedIndex]) {
                selectCard(suggestions[selectedIndex]);
            }
            return;
        } 
        
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
            return;
        }
    };

    // Caret check on navigation keys (arrows, home, end) that don't trigger onChange
    const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
            checkCaretForTag();
        }
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onKeyUp={handleKeyUp}
                    onClick={checkCaretForTag}
                    rows={rows}
                    disabled={disabled}
                    placeholder={placeholder}
                    tabIndex={tabIndex}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-gramm="false"
                    data-enable-grammarly="false"
                    style={{ fontVariantLigatures: 'none' }}
                    className={`w-full bg-slate-950/70 border border-purple-500/20 rounded-xl p-3 text-slate-200 font-mono text-sm focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/60 outline-none transition-all resize-y leading-relaxed ${className}`}
                />
            </div>

            {/* Suggestions Dropdown Portal - Rendered directly into document.body to break out of modal overflow clipping */}
            {isOpen && suggestions.length > 0 && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        left: `${dropdownPos.left}px`,
                        ...(dropdownPos.placeAbove 
                            ? { bottom: `${dropdownPos.bottom}px` } 
                            : { top: `${dropdownPos.top}px` }),
                        width: `${dropdownPos.width}px`,
                        maxHeight: `${dropdownPos.maxHeight}px`,
                        zIndex: 99999,
                    }}
                    className="glass bg-slate-900/98 border border-purple-500/50 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-md overflow-y-auto flex flex-col pointer-events-auto"
                >
                    <div className="px-3 py-1.5 border-b border-purple-500/20 flex items-center justify-between text-[11px] text-purple-300 font-mono uppercase tracking-wider bg-purple-950/70 sticky top-0 z-10 backdrop-blur-sm shrink-0">
                        <span>Scryfall Autofill (Enter / Tab to select)</span>
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setIsOpen(false)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                    </div>
                    <ul className="py-1 m-0 list-none overflow-y-auto flex-1">
                        {suggestions.map((card, idx) => (
                            <li
                                key={card || `sugg_${idx}`}
                                ref={(el) => { itemRefs.current[idx] = el; }}
                                onMouseMove={() => {
                                    if (selectedIndex !== idx) {
                                        setSelectedIndex(idx);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Keep focus inside textarea
                                    selectCard(card);
                                }}
                                className={`px-3 py-2 text-sm font-medium cursor-pointer transition-colors flex items-center justify-between ${
                                    idx === selectedIndex
                                        ? 'bg-purple-600/30 text-purple-200 border-l-2 border-purple-400 pl-2.5 font-bold'
                                        : 'text-slate-300 hover:bg-white/5'
                                }`}
                            >
                                <span className="truncate">{card}</span>
                                <span className="text-[11px] text-slate-500 font-mono">[[{card}]]</span>
                            </li>
                        ))}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CardTagAutocompleteTextarea;
