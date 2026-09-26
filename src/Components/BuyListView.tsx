import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    ShoppingCart, 
    Copy, 
    Check, 
    Search, 
    ChevronDown, 
    ChevronUp, 
    Shield, 
    Layers, 
    FileText,
    ArrowDownAZ,
    ListOrdered,
    Download
} from 'lucide-react';
import type { CommanderDeck } from '../Utilities/Interfaces';
import { getColorComboNickname } from '../Utilities/ScryfallService';
import CardHoverImage from './CardHoverImage';

export interface BuyListDeckNote {
    deckId: string;
    deckName: string;
    commanderName: string;
    deckImageUrl?: string;
    deckColorIdentity: string[];
    comments: string;
}

export interface BuyListItem {
    cardName: string;
    quantity: number;
    colorIdentity?: string[];
    imageUrl?: string;
    manaCost?: string;
    typeLine?: string;
    decks: BuyListDeckNote[];
}

interface BuyListViewProps {
    decks: CommanderDeck[];
    onNavigateToBrowse?: () => void;
}

export const BuyListView: React.FC<BuyListViewProps> = ({ decks, onNavigateToBrowse }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCardNames, setExpandedCardNames] = useState<Set<string>>(new Set());
    const [hasCopied, setHasCopied] = useState(false);
    const [copyFormat, setCopyFormat] = useState<'standard' | 'massEntry' | 'detailed'>('standard');
    const [sortBy, setSortBy] = useState<'alphabetical' | 'quantity'>('alphabetical');

    // Aggregate cards across all decks
    const buyListAll = useMemo(() => {
        const cardMap = new Map<string, BuyListItem>();

        for (const deck of decks) {
            if (!deck.cardsAdded) continue;

            for (const card of deck.cardsAdded) {
                const key = card.cardName.trim().toLowerCase();
                const existing = cardMap.get(key);

                const deckNote: BuyListDeckNote = {
                    deckId: deck.id,
                    deckName: deck.name,
                    commanderName: deck.commanderName,
                    deckImageUrl: deck.imageUrl,
                    deckColorIdentity: deck.colorIdentity || [],
                    comments: card.comments || ''
                };

                if (existing) {
                    existing.quantity += 1;
                    existing.decks.push(deckNote);
                    if (!existing.imageUrl && card.imageUrl) existing.imageUrl = card.imageUrl;
                    if (!existing.manaCost && card.manaCost) existing.manaCost = card.manaCost;
                    if (!existing.typeLine && card.typeLine) existing.typeLine = card.typeLine;
                    if ((!existing.colorIdentity || existing.colorIdentity.length === 0) && card.colorIdentity) {
                        existing.colorIdentity = card.colorIdentity;
                    }
                } else {
                    cardMap.set(key, {
                        cardName: card.cardName.trim(),
                        quantity: 1,
                        colorIdentity: card.colorIdentity,
                        imageUrl: card.imageUrl,
                        manaCost: card.manaCost,
                        typeLine: card.typeLine,
                        decks: [deckNote]
                    });
                }
            }
        }

        const items = Array.from(cardMap.values());

        // Default sorting: Alphabetical (A to Z)
        if (sortBy === 'alphabetical') {
            items.sort((a, b) => a.cardName.localeCompare(b.cardName, undefined, { sensitivity: 'base' }));
        } else {
            // Sort by quantity descending, then alphabetical
            items.sort((a, b) => b.quantity - a.quantity || a.cardName.localeCompare(b.cardName));
        }

        return items;
    }, [decks, sortBy]);

    // Filter by search query
    const filteredBuyList = useMemo(() => {
        if (!searchQuery.trim()) return buyListAll;
        const q = searchQuery.toLowerCase().trim();
        return buyListAll.filter(item => 
            item.cardName.toLowerCase().includes(q) ||
            item.decks.some(d => 
                d.deckName.toLowerCase().includes(q) || 
                d.commanderName.toLowerCase().includes(q) ||
                d.comments.toLowerCase().includes(q)
            )
        );
    }, [buyListAll, searchQuery]);

    const totalCopies = useMemo(() => {
        return buyListAll.reduce((sum, item) => sum + item.quantity, 0);
    }, [buyListAll]);

    // Toggle expanding a card
    const toggleExpandCard = (cardName: string) => {
        setExpandedCardNames(prev => {
            const next = new Set(prev);
            if (next.has(cardName)) {
                next.delete(cardName);
            } else {
                next.add(cardName);
            }
            return next;
        });
    };

    // Expand all or collapse all
    const handleExpandAll = () => {
        if (expandedCardNames.size === filteredBuyList.length) {
            setExpandedCardNames(new Set());
        } else {
            setExpandedCardNames(new Set(filteredBuyList.map(c => c.cardName)));
        }
    };

    const [hasDownloadedTxt, setHasDownloadedTxt] = useState(false);

    // Download .txt deck file for GoatBots.com (qty cardname format, always 1 copy per unique card)
    const handleDownloadGoatBotsTxt = () => {
        const targetList = filteredBuyList.length > 0 ? filteredBuyList : buyListAll;
        if (targetList.length === 0) return;

        // Sort alphabetically
        const sortedUnique = [...targetList].sort((a, b) => 
            a.cardName.localeCompare(b.cardName, undefined, { sensitivity: 'base' })
        );

        // Format: "1 CardName" per line (quantity is always 1)
        const txtString = sortedUnique.map(item => `1 ${item.cardName.trim()}`).join('\r\n') + '\r\n';

        const blob = new Blob([txtString], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStamp = new Date().toISOString().slice(0, 10);
        link.download = `BuyList_GoatBots_${dateStamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setHasDownloadedTxt(true);
        setTimeout(() => setHasDownloadedTxt(false), 2000);
    };

    // Copy to clipboard formatted
    const handleCopyBuyList = () => {
        let text = '';

        if (copyFormat === 'standard') {
            // e.g. Sol Ring (x2)
            text = filteredBuyList.map(c => `${c.cardName} (x${c.quantity})`).join('\n');
        } else if (copyFormat === 'massEntry') {
            // e.g. 2 Sol Ring (TCGplayer / Cardmarket / Moxfield format)
            text = filteredBuyList.map(c => `${c.quantity} ${c.cardName}`).join('\n');
        } else {
            // Detailed format with deck comments
            text = filteredBuyList.map(c => {
                const header = `== ${c.cardName} (x${c.quantity}) ==`;
                const notes = c.decks.map(d => {
                    const note = d.comments.trim() ? d.comments.trim() : '(No note)';
                    return `  * ${d.deckName} (${d.commanderName}): ${note}`;
                }).join('\n');
                return `${header}\n${notes}`;
            }).join('\n\n');
        }

        navigator.clipboard.writeText(text);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls Card */}
            <div className="glass bg-slate-900/90 border border-purple-500/30 rounded-3xl p-5 md:p-6 shadow-xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shadow-inner">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                                <span>Commander Decks Buy List</span>
                            </h3>
                            <p className="text-xs md:text-sm text-slate-400">
                                All evaluated cards across your decks organized alphabetically with quantities and review notes
                            </p>
                        </div>
                    </div>

                    {/* Stats badges */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold">
                            {buyListAll.length} Unique Cards
                        </span>
                        <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold">
                            {totalCopies} Total Copies
                        </span>
                    </div>
                </div>

                {/* Filter and Actions Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-purple-500/15">
                    {/* Search filter input */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter buy list by card name or notes..."
                            className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-200 font-mono focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Sort options */}
                        <div className="flex items-center bg-slate-950/60 border border-purple-500/20 rounded-xl p-0.5 text-xs font-mono">
                            <button
                                type="button"
                                onClick={() => setSortBy('alphabetical')}
                                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                                    sortBy === 'alphabetical'
                                        ? 'bg-purple-600 text-white font-bold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Sort Alphabetically (A to Z)"
                            >
                                <ArrowDownAZ size={14} />
                                <span>A-Z</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSortBy('quantity')}
                                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                                    sortBy === 'quantity'
                                        ? 'bg-purple-600 text-white font-bold'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Sort by Quantity"
                            >
                                <ListOrdered size={14} />
                                <span>Qty</span>
                            </button>
                        </div>

                        {/* Expand / Collapse All */}
                        {filteredBuyList.length > 0 && (
                            <button
                                type="button"
                                onClick={handleExpandAll}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-colors flex items-center gap-1"
                            >
                                {expandedCardNames.size === filteredBuyList.length ? (
                                    <>
                                        <ChevronUp size={14} />
                                        <span>Collapse All</span>
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown size={14} />
                                        <span>Expand All</span>
                                    </>
                                )}
                            </button>
                        )}

                        {/* Copy format selector & Copy button */}
                        <div className="flex items-center gap-1">
                            <select
                                value={copyFormat}
                                onChange={(e) => setCopyFormat(e.target.value as any)}
                                className="bg-slate-950 border border-purple-500/30 text-purple-200 text-xs rounded-xl px-2.5 py-2 font-mono outline-none cursor-pointer"
                                title="Export Format"
                            >
                                <option value="standard">Card (xQty)</option>
                                <option value="massEntry">Qty Card (TCG/Mass)</option>
                                <option value="detailed">With Deck Notes</option>
                            </select>

                            <button
                                type="button"
                                onClick={handleCopyBuyList}
                                disabled={filteredBuyList.length === 0}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                                    hasCopied
                                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 disabled:opacity-50'
                                }`}
                            >
                                {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                                <span>{hasCopied ? 'Copied!' : 'Copy List'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleDownloadGoatBotsTxt}
                                disabled={filteredBuyList.length === 0}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
                                    hasDownloadedTxt
                                        ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                                        : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-700/30 disabled:opacity-50'
                                }`}
                                title="Download .txt deck file for GoatBots.com (1 CardName per line, 1 copy per unique card)"
                            >
                                {hasDownloadedTxt ? <Check size={14} /> : <Download size={14} />}
                                <span>{hasDownloadedTxt ? 'TXT Saved!' : 'GoatBots .TXT'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {buyListAll.length === 0 ? (
                <div className="p-12 text-center glass rounded-3xl border border-purple-500/20 bg-slate-900/60 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400">
                        <ShoppingCart size={32} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-white">Your Buy List is Empty</h4>
                        <p className="text-sm text-slate-400 max-w-md mx-auto">
                            Add cards with comments to your Commander decks in the Browse Sets tab to build your purchase list.
                        </p>
                    </div>
                    {onNavigateToBrowse && (
                        <button
                            type="button"
                            onClick={onNavigateToBrowse}
                            className="mt-3 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 inline-flex items-center gap-2"
                        >
                            <Layers size={14} />
                            <span>Browse Sets & Add Cards</span>
                        </button>
                    )}
                </div>
            ) : filteredBuyList.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border border-purple-500/20 bg-slate-900/50">
                    <p className="text-slate-400 text-sm">
                        No cards matched your filter "<strong className="text-white">{searchQuery}</strong>".
                    </p>
                </div>
            ) : (
                /* Alphabetical Cards List */
                <div className="space-y-3">
                    {filteredBuyList.map((item, idx) => {
                        const isExpanded = expandedCardNames.has(item.cardName);

                        return (
                            <div
                                key={item.cardName || `buy_${idx}`}
                                className="glass bg-slate-900/80 border border-purple-500/20 hover:border-purple-500/40 rounded-2xl transition-all shadow-md overflow-hidden"
                            >
                                {/* Card Title Row (Clickable) */}
                                <div
                                    onClick={() => toggleExpandCard(item.cardName)}
                                    className="p-3.5 sm:p-4 cursor-pointer flex items-center justify-between gap-3 select-none hover:bg-white/[0.03] transition-colors"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Card Image hover thumbnail */}
                                        {item.imageUrl ? (
                                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <CardHoverImage
                                                    alt={item.cardName}
                                                    src={item.imageUrl}
                                                    className="w-9 h-12 rounded object-cover border border-purple-500/30 shadow-sm"
                                                    popoutWidth={340}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-9 h-12 rounded bg-purple-950/40 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                <FileText size={16} className="text-purple-400" />
                                            </div>
                                        )}

                                        {/* Card Title and Quantity */}
                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h4 className="text-base sm:text-lg font-black text-white hover:text-purple-300 transition-colors">
                                                    {item.cardName}
                                                </h4>
                                                {/* Quantity right after title */}
                                                <span className="text-emerald-400 font-mono font-black text-sm sm:text-base px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    (x{item.quantity})
                                                </span>
                                            </div>

                                            {/* Decks preview pill tags */}
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="text-[11px] text-slate-500 font-mono">
                                                    In {item.decks.length} deck{item.decks.length === 1 ? '' : 's'}:
                                                </span>
                                                {item.decks.map((d, dIdx) => (
                                                    <span
                                                        key={d.deckId || `${d.deckName}_${dIdx}`}
                                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/20 truncate max-w-[150px]"
                                                        title={`${d.deckName} (${d.commanderName})`}
                                                    >
                                                        {d.deckName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expand indicator button */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                                            {isExpanded ? 'Hide Notes' : 'View Notes'}
                                        </span>
                                        <button
                                            type="button"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60"
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Deck Comments Drawer */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="border-t border-purple-500/15 bg-slate-950/70 p-4 sm:p-5 space-y-3"
                                        >
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                                                Deck Comments for {item.cardName}:
                                            </p>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {item.decks.map((deckNote, noteIdx) => {
                                                    const colorCombo = getColorComboNickname(deckNote.deckColorIdentity);

                                                    return (
                                                        <div
                                                            key={deckNote.deckId || `${deckNote.deckName}_${noteIdx}`}
                                                            className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/20 flex flex-col justify-between space-y-2.5 shadow-sm"
                                                        >
                                                            {/* Deck Header */}
                                                            <div className="flex items-center gap-2.5">
                                                                {deckNote.deckImageUrl ? (
                                                                    <img
                                                                        src={deckNote.deckImageUrl}
                                                                        alt={deckNote.commanderName}
                                                                        className="w-8 h-8 rounded-lg object-cover border border-purple-500/20 shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-lg bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                                        <Shield size={14} className="text-purple-400" />
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-white truncate">
                                                                        {deckNote.deckName}
                                                                    </p>
                                                                    <p className="text-[11px] text-purple-300 font-mono truncate">
                                                                        {deckNote.commanderName} <span className="text-slate-500">({colorCombo})</span>
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Comment Box */}
                                                            <div className="bg-slate-950/90 rounded-lg p-2.5 border border-purple-500/15">
                                                                {deckNote.comments && deckNote.comments.trim().length > 0 ? (
                                                                    <p className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                                                                        {deckNote.comments}
                                                                    </p>
                                                                ) : (
                                                                    <p className="text-xs text-slate-500 italic font-mono">
                                                                        (No specific note added for this deck)
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BuyListView;
