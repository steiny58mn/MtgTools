import { useState, useMemo } from 'react';
import { 
    Search, 
    X, 
    Calendar, 
    Layers, 
    CheckSquare, 
    Square, 
    Filter, 
    RefreshCw, 
    RotateCcw 
} from 'lucide-react';
import type { ScryfallSet } from '../Utilities/Interfaces';

interface SetSelectorProps {
    sets: ScryfallSet[];
    selectedSetCodes: string[];
    onToggleSet: (code: string) => void;
    onClearAll: () => void;
    includeReprints: boolean;
    onToggleReprints: (include: boolean) => void;
    isLoadingSets: boolean;
    isLoadingCards: boolean;
    totalCardsCount?: number;
    loadProgress?: { loaded: number; total: number } | null;
}

export default function SetSelector({
    sets,
    selectedSetCodes,
    onToggleSet,
    onClearAll,
    includeReprints,
    onToggleReprints,
    isLoadingSets,
    isLoadingCards,
    totalCardsCount,
    loadProgress
}: SetSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

    // Filter sets by search query and set type while maintaining release date order (most recent on top)
    const filteredSets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return sets.filter(set => {
            const matchesQuery = !query || 
                set.name.toLowerCase().includes(query) || 
                set.code.toLowerCase().includes(query) ||
                (set.released_at && set.released_at.includes(query));

            const matchesType = selectedTypeFilter === 'all' || set.set_type === selectedTypeFilter;
            return matchesQuery && matchesType;
        });
    }, [sets, searchQuery, selectedTypeFilter]);

    // Available set types for optional filtering
    const setTypes = useMemo(() => {
        const types = new Set(sets.map(s => s.set_type).filter(Boolean));
        return Array.from(types).sort();
    }, [sets]);

    // Fast Set for O(1) membership checks to keep set selection buttery smooth
    const selectedSetCodesSet = useMemo(() => new Set(selectedSetCodes), [selectedSetCodes]);

    // Lookup map for fast access to selected set details
    const selectedSetsMap = useMemo(() => {
        const map = new Map<string, ScryfallSet>();
        sets.forEach(s => {
            if (selectedSetCodesSet.has(s.code)) {
                map.set(s.code, s);
            }
        });
        return map;
    }, [sets, selectedSetCodesSet]);

    return (
        <div className="glass rounded-[2rem] p-6 md:p-8 border border-purple-500/20 shadow-2xl space-y-6">
            {/* Header / Title */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase flex items-center gap-2">
                        <Layers className="text-purple-400" size={22} />
                        <span>Select Magic Sets</span>
                        {selectedSetCodes.length > 0 && (
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {selectedSetCodes.length} Selected
                            </span>
                        )}
                    </h3>
                    <p className="text-xs text-slate-400">
                        Choose one or more sets (ordered by release date, most recent on top) to browse and evaluate cards for your commander decks.
                    </p>
                </div>

                {/* Right Header: Reprints Checkbox & Loading */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Reprints Checkbox */}
                    <label className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-950/60 border border-purple-500/20 hover:border-purple-500/40 cursor-pointer transition-colors select-none">
                        <input
                            type="checkbox"
                            checked={includeReprints}
                            onChange={(e) => onToggleReprints(e.target.checked)}
                            className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-200">Include Reprints</span>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                            {includeReprints ? 'all prints' : 'not:reprint'}
                        </span>
                    </label>

                    {selectedSetCodes.length > 0 && (
                        <button
                            type="button"
                            onClick={onClearAll}
                            className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                        >
                            <RotateCcw size={12} />
                            <span>Clear Selection</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Selected Sets Badges (Removable Pills) */}
            {selectedSetCodes.length > 0 && (
                <div className="p-3 bg-purple-950/20 rounded-2xl border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                        <span>Active Sets for Review:</span>
                        {totalCardsCount !== undefined && totalCardsCount > 0 && (
                            <span className="font-mono text-purple-300">
                                {totalCardsCount} card{totalCardsCount !== 1 ? 's' : ''} loaded
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedSetCodes.filter(Boolean).map((code, idx) => {
                            const setObj = selectedSetsMap.get(code);
                            return (
                                <span
                                    key={code || `selected_set_${idx}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-medium shadow-sm"
                                >
                                    {setObj?.icon_svg_uri && (
                                        <img
                                            src={setObj.icon_svg_uri}
                                            alt={code}
                                            className="w-3.5 h-3.5 object-contain invert brightness-200"
                                        />
                                    )}
                                    <span className="font-bold">{setObj ? setObj.name : code.toUpperCase()}</span>
                                    <span className="text-[10px] font-mono opacity-75">({code.toUpperCase()})</span>
                                    <button
                                        type="button"
                                        onClick={() => onToggleSet(code)}
                                        className="p-0.5 hover:bg-purple-500/40 rounded text-purple-300 hover:text-white transition-colors"
                                        title={`Remove ${code.toUpperCase()}`}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Sets Input */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sets by name, code (e.g. DFT, FDN, Duskmourn), or year..."
                        className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 outline-none transition-all placeholder:text-slate-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Optional Set Type Filter Dropdown */}
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-purple-400 hidden sm:block" />
                    <select
                        value={selectedTypeFilter}
                        onChange={(e) => setSelectedTypeFilter(e.target.value)}
                        className="bg-slate-950/70 border border-purple-500/20 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:ring-2 focus:ring-purple-500/40 outline-none cursor-pointer"
                    >
                        <option value="all">All Set Types ({sets.length})</option>
                        {setTypes.map((type, idx) => (
                            <option key={type || `type_${idx}`} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Loading sets state */}
            {isLoadingSets && (
                <div className="py-8 text-center text-purple-400 flex items-center justify-center gap-2 font-mono text-sm animate-pulse">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Loading available Magic sets from Scryfall...</span>
                </div>
            )}

            {/* Sets Selection Scrollable List (Order of release, most recent on top) */}
            {!isLoadingSets && (
                <div className="border border-purple-500/20 rounded-2xl bg-slate-950/40 overflow-hidden">
                    <div className="p-2.5 bg-slate-950/70 border-b border-purple-500/15 flex items-center justify-between text-[11px] font-mono text-slate-400 px-4">
                        <span>Showing {filteredSets.length} sets (Ordered by release date, newest on top)</span>
                        <span>Click any set to select/deselect</span>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-purple-500/10 p-1">
                        {filteredSets.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 text-xs">
                                No sets matched your search query "{searchQuery}".
                            </div>
                        ) : (
                            filteredSets.map((set, setIdx) => {
                                const isSelected = selectedSetCodesSet.has(set.code);
                                return (
                                    <div
                                        key={set.id || set.code || `set_${setIdx}`}
                                        onClick={() => onToggleSet(set.code)}
                                        style={{ contentVisibility: 'auto', containIntrinsicSize: '0 48px' }}
                                        className={`px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors rounded-xl mx-1 my-0.5 ${
                                            isSelected
                                                ? 'bg-purple-600/25 hover:bg-purple-600/35 text-white'
                                                : 'hover:bg-purple-500/10 text-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Checkbox */}
                                            <div className="shrink-0 text-purple-400">
                                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-500" />}
                                            </div>

                                            {/* Set Icon */}
                                            {set.icon_svg_uri ? (
                                                <img
                                                    src={set.icon_svg_uri}
                                                    alt={set.code}
                                                    className={`w-5 h-5 object-contain shrink-0 ${
                                                        isSelected ? 'invert brightness-200' : 'opacity-70'
                                                    }`}
                                                />
                                            ) : (
                                                <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[9px] font-bold text-purple-300 shrink-0">
                                                    {set.code.slice(0, 3).toUpperCase()}
                                                </div>
                                            )}

                                            {/* Set Name & Code */}
                                            <div className="truncate">
                                                <span className="font-bold text-sm truncate mr-2">
                                                    {set.name}
                                                </span>
                                                <span className="text-[11px] font-mono text-purple-300 uppercase px-1.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/20">
                                                    {set.code}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right Side: Release Date & Cards Count */}
                                        <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-slate-400">
                                            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-purple-500/10">
                                                <Calendar size={11} className="text-purple-400" />
                                                {set.released_at || 'Unknown Date'}
                                            </span>

                                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900/60 border border-purple-500/10">
                                                {set.card_count} cards
                                            </span>

                                            <span className="text-[10px] uppercase font-semibold text-purple-300/80 bg-purple-900/30 px-1.5 py-0.5 rounded hidden sm:inline-block">
                                                {set.set_type}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Card Loading / Progress Feedback */}
            {isLoadingCards && (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-purple-300 text-sm font-medium">
                        <RefreshCw size={16} className="animate-spin text-purple-400" />
                        <span>
                            {loadProgress 
                                ? `Fetching cards from Scryfall (${loadProgress.loaded} of ${loadProgress.total} cards)...` 
                                : 'Fetching cards from Scryfall...'}
                        </span>
                    </div>

                    {loadProgress && loadProgress.total > 0 && (
                        <div className="w-32 bg-slate-950 rounded-full h-2 overflow-hidden border border-purple-500/30">
                            <div 
                                className="bg-purple-500 h-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.round((loadProgress.loaded / loadProgress.total) * 100))}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
