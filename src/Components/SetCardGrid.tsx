import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Plus, 
    RotateCw, 
    Check, 
    Search, 
    Layers,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import type { CommanderDeck, ScryfallCard } from '../Utilities/Interfaces';
import { 
    COLOR_CATEGORIES, 
    groupAndSortCardsByColor, 
    isCardCompatibleWithDeck
} from '../Utilities/ScryfallService';
import type { ColorCategory } from '../Utilities/ScryfallService';
import CardHoverImage from './CardHoverImage';

interface SetCardGridProps {
    cards: ScryfallCard[];
    decks: CommanderDeck[];
    onOpenAddModal: (card: ScryfallCard) => void;
    selectedSetCodes: string[];
}

const COLLAPSED_SECTIONS_STORAGE_KEY = 'mtgtools_collapsed_color_sections';

const COLOR_IDENTITY_THEMES: Record<ColorCategory, {
    label: string;
    border: string;
    bgBadge: string;
    textBadge: string;
    headerBg: string;
    accentDot: string;
}> = {
    'White': {
        label: 'White (W)',
        border: 'border-amber-200/40',
        bgBadge: 'bg-amber-100/15',
        textBadge: 'text-amber-200',
        headerBg: 'from-amber-500/15 to-transparent',
        accentDot: 'bg-amber-200'
    },
    'Blue': {
        label: 'Blue (U)',
        border: 'border-blue-400/40',
        bgBadge: 'bg-blue-500/15',
        textBadge: 'text-blue-300',
        headerBg: 'from-blue-500/15 to-transparent',
        accentDot: 'bg-blue-400'
    },
    'Black': {
        label: 'Black (B)',
        border: 'border-slate-500/40',
        bgBadge: 'bg-slate-700/30',
        textBadge: 'text-slate-300',
        headerBg: 'from-slate-700/20 to-transparent',
        accentDot: 'bg-slate-400'
    },
    'Red': {
        label: 'Red (R)',
        border: 'border-rose-500/40',
        bgBadge: 'bg-rose-500/15',
        textBadge: 'text-rose-300',
        headerBg: 'from-rose-500/15 to-transparent',
        accentDot: 'bg-rose-500'
    },
    'Green': {
        label: 'Green (G)',
        border: 'border-emerald-500/40',
        bgBadge: 'bg-emerald-500/15',
        textBadge: 'text-emerald-300',
        headerBg: 'from-emerald-500/15 to-transparent',
        accentDot: 'bg-emerald-400'
    },
    'Multicolor': {
        label: 'Multicolor (M)',
        border: 'border-amber-400/40',
        bgBadge: 'bg-amber-400/15',
        textBadge: 'text-amber-300',
        headerBg: 'from-amber-500/15 to-transparent',
        accentDot: 'bg-amber-400'
    },
    'Colorless': {
        label: 'Colorless',
        border: 'border-slate-400/40',
        bgBadge: 'bg-slate-600/20',
        textBadge: 'text-slate-300',
        headerBg: 'from-slate-600/15 to-transparent',
        accentDot: 'bg-slate-300'
    },
    'Lands': {
        label: 'Lands',
        border: 'border-amber-700/40',
        bgBadge: 'bg-amber-800/20',
        textBadge: 'text-amber-300',
        headerBg: 'from-amber-800/20 to-transparent',
        accentDot: 'bg-amber-600'
    }
};

const DEFAULT_THEME = {
    label: 'Other',
    border: 'border-slate-500/40',
    bgBadge: 'bg-slate-700/30',
    textBadge: 'text-slate-300',
    headerBg: 'from-slate-700/20 to-transparent',
    accentDot: 'bg-slate-400'
};

const getCategoryTheme = (category: string) => {
    return COLOR_IDENTITY_THEMES[category as ColorCategory] || {
        ...DEFAULT_THEME,
        label: category || 'Other'
    };
};

export default function SetCardGrid({
    cards,
    decks,
    onOpenAddModal,
    selectedSetCodes
}: SetCardGridProps) {
    const [cardFilterQuery, setCardFilterQuery] = useState('');
    const [activeColorFilter, setActiveColorFilter] = useState<'All' | ColorCategory>('All');
    const [flippedCards, setFlippedCards] = useState<Record<string, number>>({});
    const [collapsedCategories, setCollapsedCategories] = useState<Set<ColorCategory>>(() => {
        try {
            const saved = localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return new Set<ColorCategory>(parsed);
                }
            }
        } catch (e) {
            console.error('Failed reading collapsed sections from localStorage:', e);
        }
        return new Set<ColorCategory>();
    });

    // Retain collapsed sections across navigation and page refreshes
    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSED_SECTIONS_STORAGE_KEY, JSON.stringify(Array.from(collapsedCategories)));
        } catch (e) {
            console.error('Failed saving collapsed sections to localStorage:', e);
        }
    }, [collapsedCategories]);

    // Filter cards by name/type search query
    const filteredCards = useMemo(() => {
        const query = cardFilterQuery.trim().toLowerCase();
        if (!query) return cards;
        return cards.filter(card => 
            card.name.toLowerCase().includes(query) ||
            (card.type_line && card.type_line.toLowerCase().includes(query)) ||
            (card.oracle_text && card.oracle_text.toLowerCase().includes(query))
        );
    }, [cards, cardFilterQuery]);

    // Group and sort by Color
    const groupedCards = useMemo(() => {
        return groupAndSortCardsByColor(filteredCards);
    }, [filteredCards]);

    const handleFlipCard = (cardId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFlippedCards(prev => ({
            ...prev,
            [cardId]: prev[cardId] === 1 ? 0 : 1
        }));
    };

    // Calculate how many decks a card is currently added to
    const getDecksWithCardCount = (cardName: string) => {
        const lower = cardName.toLowerCase();
        return decks.filter(deck => 
            deck.cardsAdded?.some(c => c.cardName.toLowerCase() === lower)
        ).length;
    };

    // Calculate how many decks can legally run this card
    const getLegalDecksCount = (card: ScryfallCard) => {
        return decks.filter(deck => 
            isCardCompatibleWithDeck(card.color_identity, deck.colorIdentity)
        ).length;
    };

    // Toggle collapsing a specific color section
    const toggleCollapseCategory = (category: ColorCategory) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(category)) {
                next.delete(category);
            } else {
                next.add(category);
            }
            return next;
        });
    };

    // Fluid anchor collapse: jump to section header instantly like a native anchor link, and collapse
    const handleAnchorCollapse = (e: React.MouseEvent<HTMLAnchorElement>, category: ColorCategory) => {
        e.preventDefault();

        // 1. Collapse the section
        toggleCollapseCategory(category);

        // 2. Fluidly jump to the section header like a native anchor link, respecting navbar offset (scroll-mt-24)
        const headerEl = document.getElementById(`section-header-${category}`);
        if (headerEl) {
            headerEl.scrollIntoView({ behavior: 'auto', block: 'start' });
            window.history.replaceState(null, '', `#section-header-${category}`);
        }
    };

    const handleExpandAll = () => {
        setCollapsedCategories(new Set());
    };

    const handleCollapseAll = () => {
        setCollapsedCategories(new Set(COLOR_CATEGORIES));
    };

    if (cards.length === 0) {
        return (
            <div className="glass rounded-[2rem] p-12 text-center border border-purple-500/20 space-y-4 shadow-xl">
                <Layers className="mx-auto text-purple-400" size={40} />
                <h4 className="text-xl font-bold text-white">No Cards to Display</h4>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                    {selectedSetCodes.length === 0
                        ? 'Select one or more sets from the list above to browse cards.'
                        : 'No cards matched your current set selection and reprints filter.'}
                </p>
            </div>
        );
    }

    const allSectionsCollapsed = collapsedCategories.size === COLOR_CATEGORIES.length;

    return (
        <div className="space-y-8">
            {/* Controls Bar: Search, Quick Color Identity Badges, and Expand/Collapse All */}
            <div className="glass rounded-2xl p-4 border border-purple-500/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-xl bg-slate-950/80">
                {/* Search in loaded cards */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        value={cardFilterQuery}
                        onChange={(e) => setCardFilterQuery(e.target.value)}
                        placeholder="Filter displayed cards..."
                        className="w-full bg-slate-900 border border-purple-500/20 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    />
                </div>

                {/* Color Identity Badges Filter & Global Expand/Collapse Toggle */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5 w-full md:w-auto py-1">
                    <button
                        type="button"
                        onClick={() => setActiveColorFilter('All')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            activeColorFilter === 'All'
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        All ({filteredCards.length})
                    </button>

                    {COLOR_CATEGORIES.map(category => {
                        const count = groupedCards[category]?.length || 0;
                        const theme = getCategoryTheme(category);
                        const isActive = activeColorFilter === category;

                        return (
                            <button
                                key={category}
                                type="button"
                                onClick={() => setActiveColorFilter(category)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                                title={`Filter by ${theme.label}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${theme.accentDot}`} />
                                <span>{theme.label}</span>
                                <span className="text-[10px] font-mono opacity-80">({count})</span>
                            </button>
                        );
                    })}

                    {/* Expand/Collapse All Sections button */}
                    <button
                        type="button"
                        onClick={allSectionsCollapsed ? handleExpandAll : handleCollapseAll}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-slate-900 border border-purple-500/20 hover:border-purple-500/40 transition-colors flex items-center gap-1.5 ml-1"
                        title={allSectionsCollapsed ? 'Expand all color sections' : 'Collapse all color sections'}
                    >
                        {allSectionsCollapsed ? (
                            <>
                                <ChevronDown size={14} className="text-purple-400" />
                                <span>Expand All</span>
                            </>
                        ) : (
                            <>
                                <ChevronUp size={14} className="text-purple-400" />
                                <span>Collapse All</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Color Identity Sections (Ordered: White, Blue, Black, Red, Green, Multicolor, Colorless) */}
            {COLOR_CATEGORIES.map(category => {
                const categoryCards = groupedCards[category] || [];
                if (activeColorFilter !== 'All' && activeColorFilter !== category) {
                    return null;
                }
                if (categoryCards.length === 0) {
                    return null;
                }

                const theme = getCategoryTheme(category);
                const isCollapsed = collapsedCategories.has(category);

                return (
                    <div key={category} className="space-y-4">
                        {/* Collapsible Color Category Header */}
                        <div
                            id={`section-header-${category}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleCollapseCategory(category)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleCollapseCategory(category);
                                }
                            }}
                            className={`scroll-mt-24 p-4 rounded-2xl bg-gradient-to-r ${theme.headerBg} border ${theme.border} flex items-center justify-between cursor-pointer select-none hover:brightness-110 transition-all shadow-md group`}
                            title={isCollapsed ? `Click to expand ${category} cards` : `Click to collapse ${category} cards`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`w-3.5 h-3.5 rounded-full ${theme.accentDot} shadow-sm`} />
                                <h3 className="text-xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
                                    <span>{category === 'Colorless' ? 'Colorless & Lands' : `${category} Cards`}</span>
                                </h3>
                                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${theme.bgBadge} ${theme.textBadge} border border-current`}>
                                    {categoryCards.length} {categoryCards.length === 1 ? 'Card' : 'Cards'}
                                </span>
                                {isCollapsed && (
                                    <span className="text-xs text-slate-400 font-mono italic hidden sm:inline">
                                        (Hidden � click to expand)
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-300">
                                <span className="text-xs font-mono hidden sm:inline text-slate-400 group-hover:text-slate-200 transition-colors">
                                    {isCollapsed ? 'Expand Section' : 'Collapse Section'}
                                </span>
                                <div className="p-1 rounded-lg bg-slate-900/60 border border-white/10 text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                    {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                                </div>
                            </div>
                        </div>

                        {/* Cards Grid - Collapsible with Smooth Animation */}
                        <AnimatePresence>
                            {!isCollapsed && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4 pt-1">
                                        {categoryCards.map((card, cardIdx) => {
                                            // Only true DFCs (transform / modal_dfc) have separate physical back images
                                            const hasDifferentBack = Boolean(
                                                card.card_faces && 
                                                card.card_faces.length > 1 && 
                                                card.card_faces[0]?.image_uris?.normal && 
                                                card.card_faces[1]?.image_uris?.normal
                                            );
                                            const faceIdx = flippedCards[card.id] || 0;
                                            const currentFace = hasDifferentBack ? card.card_faces![faceIdx] : null;

                                            const displayImageUrl = currentFace?.image_uris?.normal 
                                                || card.image_uris?.normal 
                                                || card.card_faces?.[0]?.image_uris?.normal;

                                            const largeImageUrl = currentFace?.image_uris?.large
                                                || card.image_uris?.large
                                                || displayImageUrl;

                                            const decksWithCard = getDecksWithCardCount(card.name);
                                            const legalDecksCount = getLegalDecksCount(card);

                                            return (
                                                <div
                                                    key={card.id ? `${card.id}_${cardIdx}` : `${card.name}_${cardIdx}`}
                                                    className="glass rounded-2xl p-3 border border-purple-500/20 hover:border-purple-500/50 transition-all flex flex-col justify-between group space-y-2.5 bg-slate-900/60 shadow-lg"
                                                >
                                                    {/* Card Visual / Image with Hover Popout */}
                                                    <div className="relative overflow-hidden rounded-xl bg-slate-950 aspect-[5/7] flex items-center justify-center border border-purple-500/10">
                                                        {displayImageUrl ? (
                                                            <CardHoverImage
                                                                src={displayImageUrl}
                                                                popoutSrc={largeImageUrl}
                                                                alt={card.name}
                                                                className="w-full h-full object-cover rounded-xl"
                                                                popoutWidth={440}
                                                                delayMs={0}
                                                            />
                                                        ) : (
                                                            <div className="p-4 text-center space-y-2">
                                                                <span className="text-xs font-bold text-slate-300 block">{card.name}</span>
                                                                <span className="text-[11px] text-slate-500 font-mono block">{card.mana_cost}</span>
                                                            </div>
                                                        )}

                                                        {/* Flip Face Button - only for cards with a distinct physical back */}
                                                        {hasDifferentBack && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleFlipCard(card.id, e)}
                                                                className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-purple-600 text-white rounded-lg text-xs shadow-lg transition-colors border border-purple-500/30 flex items-center gap-1 font-mono z-10"
                                                                title="Transform card"
                                                            >
                                                                <RotateCw size={12} />
                                                                <span>{faceIdx === 0 ? 'Back' : 'Front'}</span>
                                                            </button>
                                                        )}

                                                        {/* Reprint Tag */}
                                                        {card.reprint && (
                                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-slate-950/85 text-[10px] font-mono text-amber-300 rounded border border-amber-500/30 shadow">
                                                                Reprint
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Card Metadata */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-start justify-between gap-1">
                                                            <h4 className="text-sm font-bold text-white leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors" title={card.name}>
                                                                {card.name}
                                                            </h4>
                                                            {card.mana_cost && (
                                                                <span className="text-xs font-mono text-purple-300 shrink-0">
                                                                    {card.mana_cost}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <p className="text-[11px] text-slate-400 uppercase tracking-wide truncate">
                                                            {card.type_line}
                                                        </p>

                                                        <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-slate-500">
                                                            <span className="uppercase">
                                                                {card.set} {card.collector_number ? `#${card.collector_number}` : ''}
                                                            </span>

                                                            <span className="text-slate-400">
                                                                {legalDecksCount > 0 ? (
                                                                    <span className="text-emerald-400">{legalDecksCount} legal</span>
                                                                ) : (
                                                                    <span className="text-slate-500">0 legal</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Action Bar: In Deck Status + Add Button */}
                                                    <div className="pt-2 border-t border-purple-500/10 flex items-center justify-between gap-2">
                                                        <div>
                                                            {decksWithCard > 0 ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                                                                    <Check size={11} />
                                                                    <span>In {decksWithCard} {decksWithCard === 1 ? 'deck' : 'decks'}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-500 font-mono">
                                                                    Not in review
                                                                </span>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => onOpenAddModal(card)}
                                                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5 shrink-0"
                                                        >
                                                            <Plus size={13} />
                                                            <span>Add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Bottom Collapse Section Link / Anchor */}
                                    <div className="flex justify-center pt-5 pb-2">
                                        <a
                                            href={`#section-header-${category}`}
                                            onClick={(e) => handleAnchorCollapse(e, category)}
                                            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-purple-500/20 hover:border-purple-500/40 transition-all flex items-center gap-2 group shadow-sm cursor-pointer"
                                            title={`Collapse ${category === 'Colorless' ? 'Colorless' : category === 'Lands' ? 'Lands' : `${category} cards`} and view next section`}
                                        >
                                            <ChevronUp size={14} className="text-purple-400 group-hover:-translate-y-0.5 transition-transform" />
                                            <span>Collapse {category === 'Colorless' ? 'Colorless' : category} section</span>
                                        </a>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
