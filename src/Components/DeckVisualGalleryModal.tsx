import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X,
    Search,
    Shield,
    Plus,
    Check
} from 'lucide-react';
import type { CommanderDeck, DeckCardItem } from '../Utilities/Interfaces';
import CardHoverImage from './CardHoverImage';
import { 
    groupDeckCardsByColor, 
    enrichDeckCardsFromScryfall,
    getColorComboNickname,
    type GroupedDeckCategory, 
    type DeckCardCategory 
} from '../Utilities/ScryfallService';

interface DeckVisualGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    deck: CommanderDeck | null;
    cards?: DeckCardItem[];
    onCardClick?: (cardName: string) => void;
}

type CardSize = 'small' | 'medium' | 'large';

const CATEGORY_PILL_STYLES: Record<DeckCardCategory, { dot: string; text: string; bg: string }> = {
    'White': { dot: 'bg-amber-200', text: 'text-amber-200', bg: 'hover:bg-amber-200/20 border-amber-200/30' },
    'Blue': { dot: 'bg-blue-400', text: 'text-blue-300', bg: 'hover:bg-blue-400/20 border-blue-400/30' },
    'Black': { dot: 'bg-slate-400', text: 'text-slate-300', bg: 'hover:bg-slate-400/20 border-slate-500/30' },
    'Red': { dot: 'bg-rose-500', text: 'text-rose-300', bg: 'hover:bg-rose-500/20 border-rose-500/30' },
    'Green': { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'hover:bg-emerald-400/20 border-emerald-400/30' },
    'Multicolor': { dot: 'bg-amber-400', text: 'text-amber-300', bg: 'hover:bg-amber-400/20 border-amber-400/30' },
    'Colorless': { dot: 'bg-slate-300', text: 'text-slate-300', bg: 'hover:bg-slate-300/20 border-slate-400/30' },
    'Lands': { dot: 'bg-teal-400', text: 'text-teal-300', bg: 'hover:bg-teal-400/20 border-teal-500/30' }
};

export const DeckVisualGalleryModal: React.FC<DeckVisualGalleryModalProps> = ({
    isOpen,
    onClose,
    deck,
    cards: customCards,
    onCardClick
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [cardSize, setCardSize] = useState<CardSize>('medium');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [recentlyAddedCard, setRecentlyAddedCard] = useState<string | null>(null);

    const initialCards = useMemo(() => {
        return customCards || deck?.deckCards || [];
    }, [customCards, deck]);

    const [enrichedCards, setEnrichedCards] = useState<DeckCardItem[]>(initialCards);

    // Sync cards and enrich in background if any are missing typeLine
    useEffect(() => {
        setEnrichedCards(initialCards);
        if (initialCards.length > 0 && initialCards.some(c => !c.typeLine && (c.scryfallId || c.name))) {
            let isCancelled = false;
            enrichDeckCardsFromScryfall(initialCards).then(res => {
                if (!isCancelled) {
                    setEnrichedCards(res);
                }
            }).catch(console.error);
            return () => {
                isCancelled = true;
            };
        }
    }, [initialCards]);

    // Background scroll lock & Escape key listener
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Reset temporary states on modal open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSelectedCategory('all');
        }
    }, [isOpen]);

    // Filter cards by name search
    const filteredCards = useMemo(() => {
        if (!searchQuery.trim()) return enrichedCards;
        const q = searchQuery.toLowerCase().trim();
        return enrichedCards.filter(c => c.name.toLowerCase().includes(q));
    }, [enrichedCards, searchQuery]);

    // Group by Color -> Alphabetical, Lands strictly last and separate
    const groupedCategories: GroupedDeckCategory[] = useMemo(() => {
        const groups = groupDeckCardsByColor(filteredCards);
        if (selectedCategory === 'all') return groups;
        return groups.filter(g => g.category.toLowerCase() === selectedCategory.toLowerCase());
    }, [filteredCards, selectedCategory]);

    const totalDeckCards = enrichedCards.length;

    // Grid sizing classes
    const gridColsClass = useMemo(() => {
        switch (cardSize) {
            case 'small':
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3';
            case 'large':
                return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5';
            case 'medium':
            default:
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3.5';
        }
    }, [cardSize]);

    const handleCardClicked = (cardName: string) => {
        if (onCardClick) {
            onCardClick(cardName);
            setRecentlyAddedCard(cardName);
            setTimeout(() => {
                setRecentlyAddedCard(prev => prev === cardName ? null : prev);
            }, 2000);
        }
    };

    if (!isOpen) return null;

    const deckName = deck?.name || 'Deck Visual Gallery';
    const commanderName = deck?.commanderName || '';
    const colorIdentity = deck?.colorIdentity || [];
    const colorCombo = getColorComboNickname(colorIdentity);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[99990] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
                {/* Backdrop Click */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-[97vw] 2xl:max-w-[1800px] h-[94vh] bg-slate-950/95 border border-indigo-500/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Bar: Deck Info, Controls, & Close */}
                    <div className="p-4 sm:px-6 py-4 bg-slate-900/90 border-b border-indigo-500/25 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
                        {/* Left: Deck Header Info */}
                        <div className="flex items-center gap-3 min-w-0">
                            {deck?.imageUrl ? (
                                <img
                                    src={deck.imageUrl}
                                    alt={commanderName}
                                    className="w-12 h-12 rounded-xl object-cover border border-indigo-500/40 shrink-0 shadow-md"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
                                    <Shield size={22} />
                                </div>
                            )}

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-bold text-white text-lg sm:text-xl truncate leading-tight">
                                        {deckName}
                                    </h3>
                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        {totalDeckCards} {totalDeckCards === 1 ? 'card' : 'cards'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 flex-wrap">
                                    {commanderName && (
                                        <span className="text-purple-300 font-mono font-medium truncate max-w-xs">
                                            {commanderName}
                                        </span>
                                    )}
                                    {colorIdentity.length > 0 && (
                                        <span className="font-mono text-[11px] px-2 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                            {colorCombo} [{colorIdentity.join('')}]
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Middle & Right: Search, Size Toggles, Close */}
                        <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
                            {/* Real-time search */}
                            <div className="relative w-full sm:w-52">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search cards in deck..."
                                    className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-colors"
                                />
                            </div>

                            {/* Card Size Selector */}
                            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-indigo-500/25">
                                <span className="text-[10px] uppercase font-mono text-slate-400 px-1 hidden lg:inline">Size:</span>
                                <button
                                    type="button"
                                    onClick={() => setCardSize('small')}
                                    className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                                        cardSize === 'small' 
                                            ? 'bg-indigo-600 text-white font-bold shadow' 
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Compact cards view"
                                >
                                    S
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCardSize('medium')}
                                    className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                                        cardSize === 'medium' 
                                            ? 'bg-indigo-600 text-white font-bold shadow' 
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Balanced cards view"
                                >
                                    M
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCardSize('large')}
                                    className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                                        cardSize === 'large' 
                                            ? 'bg-indigo-600 text-white font-bold shadow' 
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                    title="Large readable cards view"
                                >
                                    L
                                </button>
                            </div>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700"
                                title="Close gallery (Esc)"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Category Filter Chips Bar */}
                    <div className="px-4 sm:px-6 py-2 bg-slate-950/90 border-b border-indigo-500/15 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                            Jump to:
                        </span>

                        <button
                            type="button"
                            onClick={() => setSelectedCategory('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono shrink-0 transition-all border ${
                                selectedCategory === 'all'
                                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                                    : 'bg-slate-900/80 text-slate-300 border-indigo-500/20 hover:bg-slate-800 hover:text-white'
                            }`}
                        >
                            All ({filteredCards.length})
                        </button>

                        {(['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless', 'Lands'] as DeckCardCategory[]).map(cat => {
                            const count = filteredCards.filter(c => {
                                const isLand = Boolean(c.typeLine && /\bland\b/i.test(c.typeLine));
                                if (cat === 'Lands') return isLand;
                                if (isLand) return false;
                                const cols = c.colors || [];
                                if (cols.length === 0) return cat === 'Colorless';
                                if (cols.length > 1) return cat === 'Multicolor';
                                const code = cols[0].toUpperCase();
                                if (code === 'W') return cat === 'White';
                                if (code === 'U') return cat === 'Blue';
                                if (code === 'B') return cat === 'Black';
                                if (code === 'R') return cat === 'Red';
                                if (code === 'G') return cat === 'Green';
                                return cat === 'Colorless';
                            }).length;

                            if (count === 0) return null;
                            const style = CATEGORY_PILL_STYLES[cat];

                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(prev => prev === cat ? 'all' : cat)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono shrink-0 transition-all border flex items-center gap-1.5 ${
                                        selectedCategory === cat
                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                                            : `bg-slate-900/80 text-slate-300 border-indigo-500/20 ${style.bg} hover:text-white`
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                    <span>{cat}</span>
                                    <span className="text-[10px] text-slate-400">({count})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Recently added note banner */}
                    {recentlyAddedCard && (
                        <div className="bg-emerald-950/80 border-b border-emerald-500/30 px-6 py-1.5 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
                            <span className="flex items-center gap-1.5">
                                <Check size={13} className="text-emerald-400" />
                                Inserted <strong className="text-white">[[{recentlyAddedCard}]]</strong> into deck note!
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">Added</span>
                        </div>
                    )}

                    {/* Scrollable Gallery Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 scrollbar-thin">
                        {groupedCategories.length === 0 ? (
                            <div className="py-20 text-center space-y-3">
                                <Search size={36} className="mx-auto text-slate-600" />
                                <p className="text-slate-400 font-medium">No cards found matching "{searchQuery}"</p>
                                <button
                                    type="button"
                                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs hover:bg-indigo-600/50"
                                >
                                    Clear search filter
                                </button>
                            </div>
                        ) : (
                            groupedCategories.map(group => {
                                const style = CATEGORY_PILL_STYLES[group.category] || CATEGORY_PILL_STYLES['Colorless'];

                                return (
                                    <div key={group.category} className="space-y-4">
                                        {/* Category Section Header */}
                                        <div className="flex items-center gap-3 sticky top-0 bg-slate-950/95 py-2 z-10 border-b border-indigo-500/20">
                                            <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-2 shadow-sm ${style.bg} ${style.text}`}>
                                                <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                                                <span>{group.category}</span>
                                            </span>
                                            <span className="text-xs font-mono text-slate-400">
                                                {group.totalCards} {group.totalCards === 1 ? 'card' : 'cards'}
                                            </span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/20 to-transparent" />
                                        </div>

                                        {/* Grid of Card Images */}
                                        <div className={`grid ${gridColsClass}`}>
                                            {group.cards.map((card, cardIdx) => {
                                                const fallbackImg = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image`;
                                                const imgSrc = card.imageUrl || fallbackImg;
                                                const largeImgSrc = card.imageUrl 
                                                    ? (card.imageUrl.includes('/normal/') ? card.imageUrl.replace('/normal/', '/large/') : card.imageUrl)
                                                    : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.name)}&format=image&version=large`;

                                                return (
                                                    <motion.div
                                                        key={card.id ? `${card.id}_${cardIdx}` : `${card.name}_${cardIdx}`}
                                                        layout
                                                        className={`group relative rounded-2xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-500/60 p-1.5 flex flex-col justify-between transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:bg-slate-900 ${
                                                            onCardClick ? 'cursor-pointer' : ''
                                                        }`}
                                                        onClick={() => handleCardClicked(card.name)}
                                                    >
                                                        {/* Card Image Container with 0-delay Hover Pop-up */}
                                                        <div className="relative rounded-xl overflow-hidden aspect-[63/88] bg-slate-950">
                                                            <CardHoverImage
                                                                src={imgSrc}
                                                                popoutSrc={largeImgSrc}
                                                                alt={card.name}
                                                                delayMs={0}
                                                                popoutWidth={440}
                                                                className="w-full h-full block"
                                                            >
                                                                <img
                                                                    src={imgSrc}
                                                                    alt={card.name}
                                                                    loading="lazy"
                                                                    className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        if (target.src !== fallbackImg) {
                                                                            target.src = fallbackImg;
                                                                        }
                                                                    }}
                                                                />
                                                            </CardHoverImage>

                                                            {/* Quantity Badge on Top-Right */}
                                                            {(card.quantity && card.quantity > 1) && (
                                                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/20 shadow pointer-events-none">
                                                                    {card.quantity}x
                                                                </span>
                                                            )}

                                                            {/* Click to add overlay hint if onCardClick is enabled */}
                                                            {onCardClick && (
                                                                <div className="absolute inset-0 bg-indigo-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center pointer-events-none">
                                                                    <div className="bg-slate-950/90 rounded-xl px-3 py-1.5 border border-indigo-400 text-xs font-semibold text-indigo-200 flex items-center gap-1.5 shadow-xl">
                                                                        <Plus size={14} className="text-indigo-400" />
                                                                        <span>Add to note</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Card Caption Below Image */}
                                                        <div className="mt-2 px-1 flex items-center justify-between gap-1 min-w-0">
                                                            <span className="text-xs font-semibold text-slate-200 group-hover:text-indigo-200 truncate" title={card.name}>
                                                                {card.name}
                                                            </span>

                                                            {onCardClick && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleCardClicked(card.name);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition-colors shrink-0"
                                                                    title={`Insert [[${card.name}]] into note`}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Bottom status bar */}
                    <div className="px-6 py-2.5 bg-slate-900/90 border-t border-indigo-500/20 flex items-center justify-between text-xs text-slate-400 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px]">
                                Showing {filteredCards.length} of {totalDeckCards} cards
                            </span>
                            {onCardClick && (
                                <span className="text-[11px] text-slate-500 italic hidden sm:inline">
                                    • Click any card to insert [[CardName]] into your deck note
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-xs font-medium transition-colors cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DeckVisualGalleryModal;
