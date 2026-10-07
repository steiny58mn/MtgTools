import React, { useState, useMemo, useEffect } from 'react';
import type { CommanderDeck, DeckCardItem } from '../Utilities/Interfaces';
import { 
    groupDeckCardsByColor, 
    enrichDeckCardsFromScryfall,
    type GroupedDeckCategory, 
    type DeckCardCategory 
} from '../Utilities/ScryfallService';
import CardHoverImage from './CardHoverImage';
import DeckVisualGalleryModal from './DeckVisualGalleryModal';
import { Search, Plus, Layers, LayoutList, LayoutGrid, Eye } from 'lucide-react';

interface DeckCardsBreakdownProps {
    cards: DeckCardItem[];
    deck?: CommanderDeck;
    deckName?: string;
    onCardClick?: (cardName: string) => void;
    maxHeightClass?: string;
}

const CATEGORY_STYLES: Record<DeckCardCategory, { dot: string; text: string; badge: string }> = {
    'White': { 
        dot: 'bg-amber-200', 
        text: 'text-amber-200', 
        badge: 'bg-amber-200/10 border-amber-200/30 text-amber-200' 
    },
    'Blue': { 
        dot: 'bg-blue-400', 
        text: 'text-blue-300', 
        badge: 'bg-blue-400/10 border-blue-400/30 text-blue-300' 
    },
    'Black': { 
        dot: 'bg-slate-400', 
        text: 'text-slate-300', 
        badge: 'bg-slate-500/20 border-slate-500/30 text-slate-300' 
    },
    'Red': { 
        dot: 'bg-rose-500', 
        text: 'text-rose-300', 
        badge: 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
    },
    'Green': { 
        dot: 'bg-emerald-400', 
        text: 'text-emerald-300', 
        badge: 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300' 
    },
    'Multicolor': { 
        dot: 'bg-amber-400', 
        text: 'text-amber-300', 
        badge: 'bg-amber-400/15 border-amber-400/30 text-amber-300' 
    },
    'Colorless': { 
        dot: 'bg-slate-300', 
        text: 'text-slate-300', 
        badge: 'bg-slate-400/10 border-slate-400/30 text-slate-300' 
    },
    'Lands': { 
        dot: 'bg-teal-400', 
        text: 'text-teal-300', 
        badge: 'bg-teal-500/15 border-teal-500/30 text-teal-300' 
    }
};

export const DeckCardsBreakdown: React.FC<DeckCardsBreakdownProps> = ({
    cards,
    deck,
    deckName,
    onCardClick,
    maxHeightClass = 'max-h-72'
}) => {
    const [searchFilter, setSearchFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedBoard, setSelectedBoard] = useState<'all' | 'commander' | 'main' | 'sideboard'>('all');
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    // Defensively sanitize cards: strictly exclude Maybeboard cards, and ensure Commander is included
    const safeCards = useMemo(() => {
        const filtered = (cards || []).filter(c => {
            const cat = (c.category || '').toLowerCase().trim();
            return !cat.includes('maybe');
        });

        const cmdrName = (deck?.commanderName || '').trim();
        if (cmdrName && !filtered.some(c => 
            c.name.toLowerCase() === cmdrName.toLowerCase() || 
            Boolean(c.isCommander || c.IsCommander) || 
            (c.category || '').toLowerCase().includes('commander')
        )) {
            const commanderCard: DeckCardItem = {
                id: `cmdr_${deck?.id || 'main'}_${cmdrName.replace(/\s+/g, '_')}`,
                name: cmdrName,
                cmc: 0,
                quantity: 1,
                category: 'Commander',
                isCommander: true,
                IsCommander: true,
                imageUrl: deck?.imageUrl || '',
                colorIdentity: deck?.colorIdentity || [],
                colors: deck?.colorIdentity || []
            };
            return [commanderCard, ...filtered];
        }
        return filtered;
    }, [cards, deck]);

    const [enrichedCards, setEnrichedCards] = useState<DeckCardItem[]>(safeCards);

    // Sync cards and enrich in background if any are missing typeLine
    useEffect(() => {
        setEnrichedCards(safeCards);
        const needsEnrichment = safeCards.some(c => !c.typeLine && (c.scryfallId || c.name));
        if (needsEnrichment) {
            let isCancelled = false;
            enrichDeckCardsFromScryfall(safeCards).then(res => {
                if (!isCancelled) {
                    setEnrichedCards(res);
                }
            }).catch(console.error);
            return () => {
                isCancelled = true;
            };
        }
    }, [safeCards]);

    const isCommanderCard = (c: DeckCardItem) => {
        return Boolean(c.isCommander || c.IsCommander) || 
            (c.category || '').toLowerCase().includes('commander') ||
            Boolean(deck?.commanderName && c.name.toLowerCase() === deck.commanderName.toLowerCase());
    };

    const isSideboardCard = (c: DeckCardItem) => {
        return (c.category || '').toLowerCase().includes('side');
    };

    const commanderCount = useMemo(() => {
        return enrichedCards.filter(isCommanderCard).length;
    }, [enrichedCards, deck]);

    const sideboardCount = useMemo(() => {
        return enrichedCards.filter(isSideboardCard).length;
    }, [enrichedCards]);

    const mainboardCount = useMemo(() => {
        return enrichedCards.filter(c => !isCommanderCard(c) && !isSideboardCard(c)).length;
    }, [enrichedCards, deck]);

    // Filter cards by board filter and search filter
    const filteredCards = useMemo(() => {
        let result = enrichedCards;

        if (selectedBoard === 'commander') {
            result = result.filter(isCommanderCard);
        } else if (selectedBoard === 'sideboard') {
            result = result.filter(isSideboardCard);
        } else if (selectedBoard === 'main') {
            result = result.filter(c => !isCommanderCard(c) && !isSideboardCard(c));
        }

        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase().trim();
            result = result.filter(c => c.name.toLowerCase().includes(q));
        }
        return result;
    }, [enrichedCards, selectedBoard, searchFilter, deck]);

    // Group by Color -> Alphabetical, with Lands strictly last and separate
    const groupedCategories: GroupedDeckCategory[] = useMemo(() => {
        return groupDeckCardsByColor(filteredCards);
    }, [filteredCards]);

    const activeDeckName = deck?.name || deckName || '';

    if (!cards || cards.length === 0) {
        return (
            <div className="p-3 text-center text-xs text-slate-500 italic bg-slate-950/60 rounded-xl border border-purple-500/20">
                No cards imported for this deck yet. Click "Import Decks" on the Set Review page to sync cards from MtgDeckbuilder.
            </div>
        );
    }

    return (
        <>
            <div className="bg-slate-950/90 rounded-2xl p-3 border border-indigo-500/30 space-y-3 shadow-inner">
                {/* Header, Quick Search, Board Selector, View Mode Toggle, and Visual Grid Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-500/20">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Layers size={14} className="text-indigo-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">
                            {activeDeckName ? `${activeDeckName} Decklist` : 'Deck Cards'}
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.2 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                            {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
                        </span>
                        {onCardClick && (
                            <span className="text-[10px] text-slate-400 italic hidden md:inline">
                                (hover text for image, click to insert [[CardName]])
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                        {/* Board Filter Tabs */}
                        {(sideboardCount > 0 || commanderCount > 0) && (
                            <div className="flex items-center gap-0.5 bg-slate-900 border border-indigo-500/25 p-0.5 rounded-lg text-[11px] font-mono shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSelectedBoard('all')}
                                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                        selectedBoard === 'all'
                                            ? 'bg-indigo-600/40 text-indigo-200 font-bold shadow-xs'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    title="Show all cards (Commander, Main, Side)"
                                >
                                    All ({enrichedCards.length})
                                </button>
                                {commanderCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBoard('commander')}
                                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                            selectedBoard === 'commander'
                                                ? 'bg-amber-600/40 text-amber-200 font-bold shadow-xs'
                                                : 'text-slate-400 hover:text-amber-300'
                                        }`}
                                        title="Show Commander only"
                                    >
                                        Cmdr ({commanderCount})
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedBoard('main')}
                                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                        selectedBoard === 'main'
                                            ? 'bg-indigo-600/40 text-indigo-200 font-bold shadow-xs'
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    title="Show Mainboard only"
                                >
                                    Main ({mainboardCount})
                                </button>
                                {sideboardCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBoard('sideboard')}
                                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                                            selectedBoard === 'sideboard'
                                                ? 'bg-sky-600/40 text-sky-200 font-bold shadow-xs'
                                                : 'text-slate-400 hover:text-sky-300'
                                        }`}
                                        title="Show Sideboard only"
                                    >
                                        Side ({sideboardCount})
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="relative w-36 sm:w-44">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Filter cards..."
                                className="w-full bg-slate-900 border border-indigo-500/25 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                            />
                        </div>

                        {/* View mode toggle: grid vs list */}
                        <div className="flex items-center rounded-lg border border-indigo-500/25 bg-slate-900 p-0.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={`p-1 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-600/40 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
                                title="Grid view"
                            >
                                <LayoutGrid size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-1 rounded cursor-pointer ${viewMode === 'list' ? 'bg-indigo-600/40 text-indigo-200' : 'text-slate-400 hover:text-slate-200'}`}
                                title="List view"
                            >
                                <LayoutList size={12} />
                            </button>
                        </div>

                        {/* Open Pop-out Visual Gallery Modal */}
                        <button
                            type="button"
                            onClick={() => setIsGalleryOpen(true)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-600/50 hover:text-white transition-all cursor-pointer shadow-sm shrink-0"
                            title="Open full-screen visual card gallery to view and read all cards in a grid"
                        >
                            <Eye size={12} className="text-indigo-400" />
                            <span>Visual Grid</span>
                        </button>
                    </div>
                </div>

                {/* Grouped Categories Container */}
                <div className={`overflow-y-auto ${maxHeightClass} pr-1.5 space-y-3.5 scrollbar-thin`}>
                    {groupedCategories.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                            No cards match "{searchFilter}"
                        </div>
                    ) : (
                        groupedCategories.map(catGroup => {
                            const style = CATEGORY_STYLES[catGroup.category] || CATEGORY_STYLES['Colorless'];
                            return (
                                <div key={catGroup.category} className="space-y-1.5">
                                    {/* Category Header */}
                                    <div className="flex items-center gap-2 sticky top-0 bg-slate-950/95 py-0.5 z-10">
                                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1.5 shadow-sm ${style.badge}`}>
                                            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                            <span>{catGroup.category}</span>
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                            ({catGroup.totalCards} {catGroup.totalCards === 1 ? 'card' : 'cards'})
                                        </span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/20 to-transparent" />
                                    </div>

                                    {/* Cards in this category (Color -> Alphabetical) */}
                                    <div className={
                                        viewMode === 'grid' 
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 pl-1" 
                                            : "flex flex-col gap-1 pl-1"
                                    }>
                                        {catGroup.cards.map((cardItem, itemIdx) => {
                                            const img = cardItem.imageUrl || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardItem.name)}&format=image`;
                                            const largeImg = cardItem.imageUrl ? (cardItem.imageUrl.includes('/normal/') ? cardItem.imageUrl.replace('/normal/', '/large/') : cardItem.imageUrl) : `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardItem.name)}&format=image&version=large`;
                                            return (
                                                <div
                                                    key={cardItem.id ? `${cardItem.id}_${itemIdx}` : `${cardItem.name}_${itemIdx}`}
                                                    onClick={() => onCardClick?.(cardItem.name)}
                                                    className={`flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-900/70 border border-purple-500/10 hover:border-purple-500/40 hover:bg-slate-800/80 transition-all ${
                                                        onCardClick ? 'cursor-pointer group' : ''
                                                    }`}
                                                    title={onCardClick ? `Click to insert [[${cardItem.name}]] into note (hover text for image)` : cardItem.name}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                            {cardItem.quantity || 1}x
                                                        </span>
                                                        
                                                        {/* Card Name Text with Hover Image Popout */}
                                                        <CardHoverImage
                                                            src={img}
                                                            popoutSrc={largeImg}
                                                            alt={cardItem.name}
                                                            delayMs={0}
                                                            popoutWidth={440}
                                                            className="min-w-0"
                                                        >
                                                            <span className="text-[11px] text-slate-200 group-hover:text-purple-200 hover:text-purple-300 hover:underline truncate font-medium block">
                                                                {cardItem.name}
                                                            </span>
                                                        </CardHoverImage>

                                                        {/* Board indicator tag */}
                                                        {isCommanderCard(cardItem) ? (
                                                            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/25 text-amber-300 border border-amber-500/35 shrink-0">
                                                                Cmdr
                                                            </span>
                                                        ) : isSideboardCard(cardItem) ? (
                                                            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-sky-500/25 text-sky-300 border border-sky-500/35 shrink-0">
                                                                Side
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {onCardClick && (
                                                        <Plus size={11} className="text-slate-500 group-hover:text-purple-300 shrink-0 transition-colors" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Pop-out Visual Gallery Modal */}
            <DeckVisualGalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                deck={deck || (activeDeckName ? { id: 'temp', name: activeDeckName, commanderName: '', colorIdentity: [] } : null)}
                cards={enrichedCards}
                onCardClick={onCardClick}
            />
        </>
    );
};

export default DeckCardsBreakdown;
