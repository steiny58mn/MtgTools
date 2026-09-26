import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, 
    Plus, 
    Trash2, 
    Shield, 
    AlertCircle, 
    RotateCw, 
    ChevronDown, 
    ChevronUp,
    Layers,
    Eye
} from 'lucide-react';
import type { CommanderDeck, ScryfallCard } from '../Utilities/Interfaces';
import { isCardCompatibleWithDeck, getColorComboNickname, getMissingColors } from '../Utilities/ScryfallService';
import CardTagAutocompleteTextarea from './CardTagAutocompleteTextarea';
import CardHoverImage from './CardHoverImage';
import DeckCardsBreakdown from './DeckCardsBreakdown';
import DeckVisualGalleryModal from './DeckVisualGalleryModal';

interface AddCardToDecksModalProps {
    card: ScryfallCard | null;
    decks: CommanderDeck[];
    isOpen: boolean;
    onClose: () => void;
    onAddCardToDeck: (deckId: string, card: ScryfallCard, comment: string) => void;
    onRemoveCardFromDeck: (deckId: string, cardName: string) => void;
}

export default function AddCardToDecksModal({
    card,
    decks,
    isOpen,
    onClose,
    onAddCardToDeck,
    onRemoveCardFromDeck
}: AddCardToDecksModalProps) {
    const [faceIndex, setFaceIndex] = useState(0);
    const [deckComments, setDeckComments] = useState<Record<string, string>>({});
    const [showIncompatible, setShowIncompatible] = useState(false);
    const [expandedDeckCards, setExpandedDeckCards] = useState<Record<string, boolean>>({});
    const [expandedDecklists, setExpandedDecklists] = useState<Record<string, boolean>>({});
    const [galleryModalDeck, setGalleryModalDeck] = useState<CommanderDeck | null>(null);

    const toggleDecklist = (deckId: string) => {
        setExpandedDecklists(prev => ({
            ...prev,
            [deckId]: !prev[deckId]
        }));
    };

    // Compatible decks ordered strictly in alphabetical order by name
    const compatibleDecks = useMemo(() => {
        if (!card) return [];
        return decks
            .filter(deck => isCardCompatibleWithDeck(card.color_identity, deck.colorIdentity))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [decks, card]);

    // Incompatible decks ordered alphabetically by name
    const incompatibleDecks = useMemo(() => {
        if (!card) return [];
        return decks
            .filter(deck => !isCardCompatibleWithDeck(card.color_identity, deck.colorIdentity))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [decks, card]);

    // Number of decks that currently have review text typed in
    const decksWithNotesCount = useMemo(() => {
        return compatibleDecks.filter(d => (deckComments[d.id] || '').trim().length > 0).length;
    }, [compatibleDecks, deckComments]);

    // Total existing additions across all legal decks
    const totalCardsAddedInCompatibleDecks = useMemo(() => {
        return compatibleDecks.reduce((sum, d) => sum + (d.cardsAdded?.length || 0), 0);
    }, [compatibleDecks]);

    // Check if all decks with cards are expanded
    const allDeckCardsExpanded = useMemo(() => {
        const withCards = compatibleDecks.filter(d => (d.cardsAdded?.length || 0) > 0);
        return withCards.length > 0 && withCards.every(d => expandedDeckCards[d.id]);
    }, [compatibleDecks, expandedDeckCards]);

    const toggleDeckCards = (deckId: string) => {
        setExpandedDeckCards(prev => ({
            ...prev,
            [deckId]: !prev[deckId]
        }));
    };

    const toggleAllDeckCards = () => {
        if (allDeckCardsExpanded) {
            setExpandedDeckCards({});
        } else {
            const next: Record<string, boolean> = {};
            compatibleDecks.forEach(d => {
                if ((d.cardsAdded?.length || 0) > 0) {
                    next[d.id] = true;
                }
            });
            setExpandedDeckCards(next);
        }
    };

    // Reset state when modal opens or card changes (do not re-initialize on decks prop reference change while user is typing)
    const cardId = card?.id;
    useEffect(() => {
        if (isOpen && card) {
            setFaceIndex(0);
            
            // Pre-fill existing comments from decks
            const initialComments: Record<string, string> = {};
            decks.forEach(deck => {
                const evalItem = deck.cardsAdded?.find(c => c.cardName.toLowerCase() === card.name.toLowerCase());
                if (evalItem) {
                    initialComments[deck.id] = evalItem.comments || '';
                }
            });
            setDeckComments(initialComments);
        }
    }, [isOpen, cardId]);

    // Add card only to legal decks that have text in their text boxes, then close modal
    const handleAddAll = useCallback(() => {
        if (!card) return;
        const decksToAdd = compatibleDecks.filter(deck => {
            const comment = deckComments[deck.id];
            return comment && comment.trim().length > 0;
        });

        decksToAdd.forEach(deck => {
            const comment = deckComments[deck.id]!.trim();
            onAddCardToDeck(deck.id, card, comment);
        });

        onClose();
    }, [card, compatibleDecks, deckComments, onAddCardToDeck, onClose]);

    // Handle keyboard shortcuts:
    // - Escape to close
    // - Ctrl+Enter / Cmd+Enter, Ctrl+S / Cmd+S, or Alt+S to save all typed notes and close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            const isCtrlOrCmd = e.ctrlKey || e.metaKey;
            const isSaveKey = 
                (isCtrlOrCmd && e.key === 'Enter') ||
                (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) ||
                (e.altKey && (e.key === 's' || e.key === 'S'));

            if (isSaveKey) {
                e.preventDefault();
                e.stopPropagation();
                handleAddAll();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen, onClose, handleAddAll]);

    // Auto-focus the first deck's comment text box when modal opens
    useEffect(() => {
        if (isOpen && card && compatibleDecks.length > 0) {
            const timer = setTimeout(() => {
                const firstTextarea = document.querySelector<HTMLTextAreaElement>('textarea[tabindex="1"]');
                if (firstTextarea) {
                    firstTextarea.focus();
                }
            }, 80);
            return () => clearTimeout(timer);
        }
    }, [isOpen, card, compatibleDecks.length]);

    // Lock background page scroll while modal is open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        
        // Prevent layout shift from scrollbar disappearing
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [isOpen]);

    if (!isOpen || !card) return null;

    // Only cards where the back has a distinct physical image (transform / modal_dfc) can flip
    const hasDifferentBack = Boolean(
        card.card_faces && 
        card.card_faces.length > 1 && 
        card.card_faces[0]?.image_uris?.normal && 
        card.card_faces[1]?.image_uris?.normal
    );
    const hasFaces = card.card_faces && card.card_faces.length > 1;
    const currentFace = hasDifferentBack ? card.card_faces![faceIndex] : null;

    const displayImageUrl = currentFace?.image_uris?.normal 
        || card.image_uris?.normal 
        || card.card_faces?.[0]?.image_uris?.normal;

    const largeImageUrl = currentFace?.image_uris?.large
        || card.image_uris?.large
        || displayImageUrl;

    // For split cards without a different back, display all parts
    const splitOracleText = !hasDifferentBack && hasFaces
        ? card.card_faces!.map(f => `[${f.name} - ${f.mana_cost || ''}]\n${f.oracle_text || ''}`).join('\n\n')
        : undefined;

    const currentName = hasDifferentBack ? currentFace?.name : card.name;
    const currentManaCost = hasDifferentBack ? currentFace?.mana_cost : card.mana_cost;
    const currentTypeLine = hasDifferentBack ? currentFace?.type_line : card.type_line;
    const currentOracleText = hasDifferentBack ? currentFace?.oracle_text : (card.oracle_text || splitOracleText);
    const currentFlavorText = hasDifferentBack ? currentFace?.flavor_text : card.flavor_text;
    const currentPower = hasDifferentBack ? currentFace?.power : card.power;
    const currentToughness = hasDifferentBack ? currentFace?.toughness : card.toughness;
    const currentLoyalty = hasDifferentBack ? currentFace?.loyalty : card.loyalty;

    const colorComboNickname = getColorComboNickname(card.color_identity);

    const handleToggleFace = () => {
        if (!hasDifferentBack) return;
        setFaceIndex(prev => (prev === 0 ? 1 : 0));
    };

    const handleRemoveCardFromDeck = (deckId: string, cardNameToRemove: string) => {
        onRemoveCardFromDeck(deckId, cardNameToRemove);
    };

    const handleCommentChange = (deckId: string, val: string) => {
        setDeckComments(prev => ({ ...prev, [deckId]: val }));
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden my-auto"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-slate-950/60 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                                <Plus size={20} />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                                    <span>Add Card to Decks</span>
                                    <span className="text-purple-300 font-mono text-sm font-semibold">
                                        ({card.name})
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Type notes in legal decks to add them to your review tracker
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            tabIndex={compatibleDecks.length + 3}
                            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
                            title="Close modal (Esc)"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        {/* Expanded Card Preview Section */}
                        <div className="glass bg-slate-950/40 p-4 sm:p-5 rounded-2xl border border-purple-500/20">
                            <div className="flex flex-col sm:flex-row gap-5 items-start">
                                {/* Card image preview with hover popout */}
                                <div className="shrink-0 relative mx-auto sm:mx-0">
                                    {displayImageUrl ? (
                                        <CardHoverImage
                                            alt={currentName || card.name}
                                            src={displayImageUrl}
                                            popoutSrc={largeImageUrl}
                                            className="w-36 sm:w-44 rounded-xl shadow-xl border border-purple-500/30"
                                            popoutWidth={380}
                                        />
                                    ) : (
                                        <div className="w-36 h-48 sm:w-44 sm:h-60 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center">
                                            <Shield size={36} className="text-purple-400" />
                                        </div>
                                    )}

                                    {hasDifferentBack && (
                                        <button
                                            type="button"
                                            onClick={handleToggleFace}
                                            tabIndex={-1}
                                            className="mt-2 w-full px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-lg text-[11px] text-purple-200 font-mono flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <RotateCw size={12} />
                                            <span>Face {faceIndex + 1}/2 ({faceIndex === 0 ? 'Front' : 'Back'})</span>
                                        </button>
                                    )}
                                </div>

                                {/* Full Card Details & Oracle Text */}
                                <div className="flex-1 min-w-0 space-y-3 w-full">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2.5">
                                        <div>
                                            <h4 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 flex-wrap">
                                                <span>{currentName || card.name}</span>
                                                {currentManaCost && (
                                                    <span className="text-xs sm:text-sm font-mono text-purple-300 font-normal">
                                                        {currentManaCost}
                                                    </span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {currentTypeLine || card.type_line}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                {colorComboNickname} ({card.color_identity.length > 0 ? card.color_identity.join(', ') : 'Colorless'})
                                            </span>
                                            {(currentPower !== undefined || currentToughness !== undefined) && (
                                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                                                    {currentPower}/{currentToughness}
                                                </span>
                                            )}
                                            {currentLoyalty !== undefined && (
                                                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    Loyalty: {currentLoyalty}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Oracle text without scrollbars */}
                                    <div className="bg-slate-950/70 p-3.5 rounded-xl border border-purple-500/15">
                                        <p className="text-xs sm:text-sm text-slate-200 font-serif whitespace-pre-line leading-relaxed">
                                            {currentOracleText || 'No text.'}
                                        </p>
                                        {currentFlavorText && (
                                            <p className="text-xs text-slate-400 font-serif italic pt-2.5 border-t border-purple-500/10 mt-2 leading-relaxed">
                                                "{currentFlavorText}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legal Decks Section */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/50 border border-purple-500/20 rounded-2xl">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                        Legal Commander Decks (Alphabetical Order)
                                    </h4>
                                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                                        {compatibleDecks.length} of {decks.length} Legal
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {totalCardsAddedInCompatibleDecks > 0 && (
                                        <button
                                            type="button"
                                            onClick={toggleAllDeckCards}
                                            tabIndex={-1}
                                            className="text-xs font-mono text-purple-300 hover:text-white px-2.5 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                            title={allDeckCardsExpanded ? 'Hide all deck additions' : 'Show all deck additions'}
                                        >
                                            {allDeckCardsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            <span>{allDeckCardsExpanded ? 'Hide' : 'Show'} all added cards ({totalCardsAddedInCompatibleDecks})</span>
                                        </button>
                                    )}
                                    <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
                                        Only decks with notes will be added
                                    </span>
                                </div>
                            </div>

                            {decks.length === 0 ? (
                                <div className="p-8 text-center glass rounded-2xl border border-purple-500/20 space-y-3">
                                    <AlertCircle className="mx-auto text-purple-400" size={32} />
                                    <p className="text-sm text-slate-300 font-medium">
                                        No Commander decks found in your tracker.
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Go to the "My Decks" tab to add your commander decks first.
                                    </p>
                                </div>
                            ) : compatibleDecks.length === 0 ? (
                                <div className="p-8 text-center glass rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-2">
                                    <p className="text-sm font-bold text-rose-300">No Legal Decks by Color Identity</p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        None of your {decks.length} Commander decks include all colors required by <strong className="text-white">{card.name}</strong> ({colorComboNickname}).
                                    </p>
                                </div>
                            ) : (
                                /* 2 decks per row grid to save space */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                                    {compatibleDecks.map((deck, idx) => {
                                        const isAlreadyAdded = deck.cardsAdded?.some(
                                            c => c.cardName.toLowerCase() === card.name.toLowerCase()
                                        );
                                        const cardsAlreadyInDeck = deck.cardsAdded || [];
                                        const isCardsExpanded = Boolean(expandedDeckCards[deck.id]);
                                        const isDecklistExpanded = Boolean(expandedDecklists[deck.id]);

                                        return (
                                            <div
                                                key={deck.id || `comp_deck_${idx}`}
                                                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                                                    isAlreadyAdded
                                                        ? 'bg-purple-950/25 border-purple-500/40 shadow-md'
                                                        : 'bg-slate-950/50 border-purple-500/15 hover:border-purple-500/30'
                                                }`}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {(() => {
                                                                const commanderFullImg = deck.imageUrl?.includes('scryfall.io') && deck.imageUrl?.includes('/art_crop/')
                                                                    ? deck.imageUrl.replace('/art_crop/', '/normal/')
                                                                    : (deck.imageUrl || (deck.commanderName ? `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(deck.commanderName)}&format=image` : ''));

                                                                const thumbSrc = deck.imageUrl || commanderFullImg;

                                                                if (thumbSrc) {
                                                                    return (
                                                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-purple-500/20 shrink-0 relative">
                                                                            <CardHoverImage
                                                                                src={thumbSrc}
                                                                                popoutSrc={commanderFullImg}
                                                                                alt={deck.commanderName || deck.name}
                                                                                className="w-full h-full object-cover rounded-lg cursor-zoom-in"
                                                                                popoutWidth={340}
                                                                                delayMs={250}
                                                                            />
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <div className="w-10 h-10 rounded-lg bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                                        <Shield size={18} className="text-purple-400" />
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <h5 className="text-xs font-bold text-white truncate" title={deck.name}>
                                                                        {deck.name}
                                                                    </h5>
                                                                    {isAlreadyAdded && (
                                                                        <span className="px-1.5 py-0.2 text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                                                            In Deck
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] text-purple-300 font-mono truncate" title={`${deck.commanderName} (${getColorComboNickname(deck.colorIdentity)})`}>
                                                                    {deck.commanderName} <span className="text-slate-400">({getColorComboNickname(deck.colorIdentity)})</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Right-side controls: added cards pill button + decklist button + trash button */}
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {cardsAlreadyInDeck.length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleDeckCards(deck.id)}
                                                                    tabIndex={-1}
                                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium flex items-center gap-1 transition-all border cursor-pointer ${
                                                                        isCardsExpanded
                                                                            ? 'bg-purple-600/30 text-purple-200 border-purple-500/40 shadow-sm'
                                                                            : 'bg-slate-900/80 text-slate-300 hover:text-white border-purple-500/20 hover:border-purple-500/40 hover:bg-slate-800'
                                                                    }`}
                                                                    title={isCardsExpanded ? `Hide ${cardsAlreadyInDeck.length} cards in review for ${deck.name}` : `View ${cardsAlreadyInDeck.length} cards in review for ${deck.name}`}
                                                                >
                                                                    <span>{cardsAlreadyInDeck.length} added</span>
                                                                    {isCardsExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                                </button>
                                                            )}

                                                            {deck.deckCards && deck.deckCards.length > 0 && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleDecklist(deck.id)}
                                                                        tabIndex={-1}
                                                                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium flex items-center gap-1 transition-all border cursor-pointer ${
                                                                            isDecklistExpanded
                                                                                ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40 shadow-sm'
                                                                                : 'bg-slate-900/80 text-slate-300 hover:text-white border-indigo-500/20 hover:border-indigo-500/40 hover:bg-slate-800'
                                                                        }`}
                                                                        title={isDecklistExpanded ? `Hide deck cards for ${deck.name}` : `View ${deck.deckCards.length} deck cards for ${deck.name}`}
                                                                    >
                                                                        <Layers size={11} className="text-indigo-400" />
                                                                        <span>{deck.deckCards.length} in deck</span>
                                                                        {isDecklistExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setGalleryModalDeck(deck)}
                                                                        tabIndex={-1}
                                                                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 border border-indigo-500/20 transition-all cursor-pointer"
                                                                        title={`Open visual card gallery for ${deck.name} to view and read all cards in a grid`}
                                                                    >
                                                                        <Eye size={12} />
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {isAlreadyAdded && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCardFromDeck(deck.id, card.name)}
                                                                    tabIndex={-1}
                                                                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 transition-colors text-xs"
                                                                    title={`Remove ${card.name} from ${deck.name}`}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Expanded drawer of cards already added to this deck */}
                                                    {cardsAlreadyInDeck.length > 0 && (
                                                        <AnimatePresence>
                                                            {isCardsExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="overflow-hidden bg-slate-950/80 rounded-xl p-2.5 border border-purple-500/20 space-y-2 max-h-48 overflow-y-auto"
                                                                >
                                                                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                                                                            <span>Cards Added to {deck.name}:</span>
                                                                            <span className="font-mono text-purple-300">({cardsAlreadyInDeck.length})</span>
                                                                        </div>
                                                                        <div className="space-y-2 divide-y divide-purple-500/10">
                                                                            {cardsAlreadyInDeck.map((item, cIdx) => {
                                                                                const itemFullImg = item.imageUrl || `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(item.cardName)}&format=image`;
                                                                                return (
                                                                                    <div key={cIdx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2 text-xs">
                                                                                        <div className="min-w-0 flex items-start gap-2">
                                                                                            <div className="w-5 h-7 shrink-0 rounded overflow-hidden border border-purple-500/20 bg-slate-950 mt-0.5 relative">
                                                                                                <CardHoverImage
                                                                                                    src={itemFullImg}
                                                                                                    popoutSrc={itemFullImg}
                                                                                                    alt={item.cardName}
                                                                                                    className="w-full h-full object-cover cursor-zoom-in"
                                                                                                    popoutWidth={320}
                                                                                                    delayMs={200}
                                                                                                />
                                                                                            </div>
                                                                                            <div className="min-w-0">
                                                                                                <span className="font-bold text-white block truncate" title={item.cardName}>
                                                                                                    {item.cardName}
                                                                                                </span>
                                                                                                {item.comments ? (
                                                                                                    <p className="text-[11px] text-slate-300 font-mono italic break-words line-clamp-2">
                                                                                                        "{item.comments}"
                                                                                                    </p>
                                                                                                ) : (
                                                                                                    <span className="text-[10px] text-slate-500 italic">No notes</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleRemoveCardFromDeck(deck.id, item.cardName)}
                                                                                            tabIndex={-1}
                                                                                            className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition-colors"
                                                                                            title={`Remove ${item.cardName} from ${deck.name}`}
                                                                                        >
                                                                                            <Trash2 size={11} />
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                    )}

                                                    {/* Deck Comment Box */}
                                                    <div>
                                                        <CardTagAutocompleteTextarea
                                                            value={deckComments[deck.id] || ''}
                                                            onChange={(val) => handleCommentChange(deck.id, val)}
                                                            placeholder={`Note for ${deck.name} (e.g. Cuts [[Cultivate]] for this)...`}
                                                            rows={2}
                                                            tabIndex={idx + 1}
                                                        />
                                                    </div>

                                                    {/* Collapsible panel of full decklist cards from MtgDeckbuilder */}
                                                    {deck.deckCards && deck.deckCards.length > 0 && (
                                                        <AnimatePresence>
                                                            {isDecklistExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="overflow-hidden pt-1"
                                                                >
                                                                    <DeckCardsBreakdown
                                                                        cards={deck.deckCards}
                                                                        deck={deck}
                                                                        deckName={deck.name}
                                                                        maxHeightClass="max-h-60"
                                                                        onCardClick={(cardName) => {
                                                                            const currentText = deckComments[deck.id] || '';
                                                                            const toInsert = `[[${cardName}]]`;
                                                                            const newText = currentText ? `${currentText} ${toInsert}` : toInsert;
                                                                            handleCommentChange(deck.id, newText);
                                                                        }}
                                                                    />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Bottom: Incompatible Decks Drawer */}
                        {incompatibleDecks.length > 0 && (
                            <div className="pt-2 border-t border-purple-500/10">
                                <button
                                    type="button"
                                    onClick={() => setShowIncompatible(!showIncompatible)}
                                    className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
                                >
                                    <span>Incompatible Decks ({incompatibleDecks.length})</span>
                                    {showIncompatible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>

                                <AnimatePresence>
                                    {showIncompatible && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 overflow-hidden text-xs"
                                        >
                                            {incompatibleDecks.map((deck, idx) => {
                                                const missing = getMissingColors(card.color_identity, deck.colorIdentity);
                                                return (
                                                    <div
                                                        key={deck.id || `incomp_deck_${idx}`}
                                                        className="p-3 bg-slate-950/30 rounded-xl border border-rose-500/10 flex items-center justify-between"
                                                    >
                                                        <div className="truncate">
                                                            <p className="font-bold text-slate-300 truncate">{deck.name}</p>
                                                            <p className="text-[11px] text-slate-500 truncate">{deck.commanderName}</p>
                                                        </div>
                                                        <span className="text-[11px] font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
                                                            Lacks: {missing.join(', ')}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Footer with Add to All button and keyboard shortcut indicators */}
                    <div className="p-4 border-t border-purple-500/20 bg-slate-950/80 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs text-slate-400 font-mono">
                                Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Esc</kbd> to close
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-xs text-slate-400 font-mono">
                                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-bold">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-purple-300 font-bold">Enter</kbd> to save & close
                            </span>
                            {decksWithNotesCount > 0 && (
                                <span className="text-xs font-mono text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                                    {decksWithNotesCount} deck{decksWithNotesCount === 1 ? '' : 's'} ready to add
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                tabIndex={compatibleDecks.length + 2}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleAddAll}
                                tabIndex={compatibleDecks.length + 1}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md shadow-purple-600/30 flex items-center gap-2 focus:ring-2 focus:ring-purple-400 cursor-pointer"
                                title="Save all typed notes and close modal (Ctrl+Enter or Ctrl+S)"
                            >
                                <Plus size={14} />
                                <span>Add to All</span>
                                <span className="text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded bg-purple-800/80 border border-purple-400/30 ml-1">
                                    Ctrl+Enter
                                </span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Pop-out Visual Card Gallery Modal */}
            <DeckVisualGalleryModal
                isOpen={Boolean(galleryModalDeck)}
                onClose={() => setGalleryModalDeck(null)}
                deck={galleryModalDeck}
                onCardClick={(cardName) => {
                    if (!galleryModalDeck) return;
                    const currentText = deckComments[galleryModalDeck.id] || '';
                    const toInsert = `[[${cardName}]]`;
                    const newText = currentText ? `${currentText} ${toInsert}` : toInsert;
                    handleCommentChange(galleryModalDeck.id, newText);
                }}
            />
        </AnimatePresence>
    );
}
