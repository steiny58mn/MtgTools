import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    BookOpen, 
    Search, 
    Plus, 
    Trash2, 
    Copy, 
    Check,   
    ChevronDown, 
    ChevronUp, 
    Layers, 
    FileText, 
    RefreshCw,
    Shield,
    RotateCcw,
    ShoppingCart,
    Eye
} from 'lucide-react';
import type { CommanderDeck, DeckCardEvaluation, ScryfallCard, ScryfallSet, DeckCardItem } from '../Utilities/Interfaces';
import { 
    autocompleteCards,
    getCachedAutocomplete,
    searchCommanderCards,
    getCardByName, 
    getScryfallSets,
    getCardsForSets,
    isCardCompatibleWithDeck, 
    getMissingColors, 
    getColorComboNickname,
    enrichDeckCardsFromScryfall
} from '../Utilities/ScryfallService';
import CardTagAutocompleteTextarea from '../Components/CardTagAutocompleteTextarea';
import SetSelector from '../Components/SetSelector';
import SetCardGrid from '../Components/SetCardGrid';
import AddCardToDecksModal from '../Components/AddCardToDecksModal';
import BuyListView from '../Components/BuyListView';
import CardHoverImage from '../Components/CardHoverImage';
import DeckCardsBreakdown from '../Components/DeckCardsBreakdown';
import DeckVisualGalleryModal from '../Components/DeckVisualGalleryModal';
import { apiPaths, ToolTypeCodes } from '../Utilities/Enums';

const STORAGE_KEY = 'mtgtools_commander_decks';
const SETS_STORAGE_KEY = 'mtgtools_selected_set_codes';
const REPRINTS_STORAGE_KEY = 'mtgtools_include_reprints';

const COLOR_OPTIONS: { code: string; label: string; colorClass: string; activeClass: string }[] = [
    { code: 'W', label: 'White', colorClass: 'border-amber-200 text-amber-200', activeClass: 'bg-amber-100 text-slate-900 border-amber-300 font-bold' },
    { code: 'U', label: 'Blue', colorClass: 'border-blue-400 text-blue-400', activeClass: 'bg-blue-500 text-white border-blue-400 font-bold' },
    { code: 'B', label: 'Black', colorClass: 'border-slate-500 text-slate-300', activeClass: 'bg-slate-800 text-white border-slate-400 font-bold' },
    { code: 'R', label: 'Red', colorClass: 'border-rose-400 text-rose-400', activeClass: 'bg-rose-600 text-white border-rose-400 font-bold' },
    { code: 'G', label: 'Green', colorClass: 'border-emerald-400 text-emerald-400', activeClass: 'bg-emerald-600 text-white border-emerald-400 font-bold' },
    { code: 'C', label: 'Colorless', colorClass: 'border-slate-400 text-slate-400', activeClass: 'bg-slate-400 text-slate-950 border-slate-300 font-bold' },
];

// In-memory cache for API BBCode headers by color combination
const apiHeaderCache = new Map<string, Record<string, string>>();

/**
 * Fetch BBCode headers from the existing MTG Tools Set Review API endpoint:
 * /mtgtools/getbbcode?color={color}&bbCodeType=2
 */
async function fetchSetReviewHeadersFromApi(colorCombo: string): Promise<Record<string, string>> {
    if (apiHeaderCache.has(colorCombo)) {
        return apiHeaderCache.get(colorCombo)!;
    }

    const fallback: Record<string, string> = {
        White: '[CENTER][HEADER style=White][SIZE=100]White Cards[/SIZE][/HEADER][/CENTER]',
        Blue: '[CENTER][HEADER style=Blue][SIZE=100]Blue Cards[/SIZE][/HEADER][/CENTER]',
        Black: '[CENTER][HEADER style=Black][SIZE=100]Black Cards[/SIZE][/HEADER][/CENTER]',
        Red: '[CENTER][HEADER style=Red][SIZE=100]Red Cards[/SIZE][/HEADER][/CENTER]',
        Green: '[CENTER][HEADER style=Green][SIZE=100]Green Cards[/SIZE][/HEADER][/CENTER]',
        Multicolor: `[CENTER][HEADER style=${colorCombo}][SIZE=100]Multicolor Cards[/SIZE][/HEADER][/CENTER]`,
        Colorless: '[CENTER][HEADER style=Colorless][SIZE=100]Colorless and Land Cards[/SIZE][/HEADER][/CENTER]'
    };

    try {
        const url = `${apiPaths.GetBbCode}?color=${encodeURIComponent(colorCombo)}&bbCodeType=${ToolTypeCodes.SetReview}`;
        const res = await fetch(url);
        if (res.ok) {
            const raw = await res.text();
            let text = raw;
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === 'string') text = parsed;
            } catch {
                // Keep raw
            }

            const parsedHeaders: Record<string, string> = { ...fallback };
            const matches = text.match(/\[CENTER\]\[HEADER style=[^\]]+\]\[SIZE=\d+\][^\[]+\[\/SIZE\]\[\/HEADER\]\[\/CENTER\]/gi);
            if (matches && matches.length > 0) {
                for (const m of matches) {
                    if (/white cards/i.test(m)) parsedHeaders.White = m;
                    else if (/blue cards/i.test(m)) parsedHeaders.Blue = m;
                    else if (/black cards/i.test(m)) parsedHeaders.Black = m;
                    else if (/red cards/i.test(m)) parsedHeaders.Red = m;
                    else if (/green cards/i.test(m)) parsedHeaders.Green = m;
                    else if (/multicolor cards/i.test(m)) parsedHeaders.Multicolor = m;
                    else if (/colorless/i.test(m)) parsedHeaders.Colorless = m;
                }
            }
            apiHeaderCache.set(colorCombo, parsedHeaders);
            return parsedHeaders;
        }
    } catch (err) {
        console.warn(`Could not fetch BBCode headers for ${colorCombo} from API:`, err);
    }

    apiHeaderCache.set(colorCombo, fallback);
    return fallback;
}

export default function SetReview() {
    const [activeTab, setActiveTab] = useState<'sets' | 'lookup' | 'decks' | 'summary' | 'buylist'>('sets');

    // Decks State - always kept in alphabetical order
    const [decks, setDecks] = useState<CommanderDeck[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: CommanderDeck[] = JSON.parse(saved);
                return parsed.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            }
        } catch (e) {
            console.error('Failed reading decks from localStorage:', e);
        }
        return [];
    });

    // Guaranteed alphabetical order of decks
    const sortedDecks = useMemo(() => {
        return [...decks].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [decks]);

    // New Deck Form State
    const [newDeckName, setNewDeckName] = useState('');
    const [newCommanderName, setNewCommanderName] = useState('');
    const [newColorIdentity, setNewColorIdentity] = useState<string[]>([]);
    const [newDeckImage, setNewDeckImage] = useState<string>('');
    const [isSearchingCommander, setIsSearchingCommander] = useState(false);
    const [commanderCardSuggestions, setCommanderCardSuggestions] = useState<ScryfallCard[]>([]);
    const [isImportingFromApi, setIsImportingFromApi] = useState(false);
    const [apiImportMessage, setApiImportMessage] = useState<string | null>(null);
    const [expandedCommanderDecklistId, setExpandedCommanderDecklistId] = useState<string | null>(null);
    const [galleryModalDeck, setGalleryModalDeck] = useState<CommanderDeck | null>(null);

    // Set Browsing State - persists across page refreshes
    const [sets, setSets] = useState<ScryfallSet[]>([]);
    const [selectedSetCodes, setSelectedSetCodes] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(SETS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to parse saved selected set codes:', e);
        }
        return [];
    });
    const [includeReprints, setIncludeReprints] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem(REPRINTS_STORAGE_KEY);
            if (saved !== null) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to parse saved includeReprints setting:', e);
        }
        return false;
    });
    const [isLoadingSets, setIsLoadingSets] = useState(false);
    const [isLoadingCards, setIsLoadingCards] = useState(false);
    const [cardsForSets, setCardsForSets] = useState<ScryfallCard[]>([]);
    const [cardLoadProgress, setCardLoadProgress] = useState<{ loaded: number; total: number } | null>(null);

    // Modal Add Card State
    const [modalCard, setModalCard] = useState<ScryfallCard | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Single Card Lookup State
    const [cardSearchQuery, setCardSearchQuery] = useState('');
    const [cardSuggestions, setCardSuggestions] = useState<string[]>([]);
    const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null);
    const [isLoadingCard, setIsLoadingCard] = useState(false);
    const [showIncompatible, setShowIncompatible] = useState(false);

    // Card comments per deck when adding from single lookup
    const [deckComments, setDeckComments] = useState<Record<string, string>>({});

    // Summary / BBCode State
    const [selectedDeckIdForBbCode, setSelectedDeckIdForBbCode] = useState<string>('');
    const [generatedBbCode, setGeneratedBbCode] = useState('');
    const [isGeneratingBbCode, setIsGeneratingBbCode] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [globalReviewIntro, setGlobalReviewIntro] = useState<string>(() => {
        try {
            return localStorage.getItem('mtg_set_review_global_intro') || '';
        } catch {
            return '';
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('mtg_set_review_global_intro', globalReviewIntro);
        } catch (e) {
            console.error('Failed saving globalReviewIntro to localStorage:', e);
        }
    }, [globalReviewIntro]);

    const commanderDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const cardDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const setCardsCacheRef = useRef<Map<string, ScryfallCard[]>>(new Map());
    const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Persist decks to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedDecks));
        } catch (e) {
            console.error('Failed saving decks to localStorage:', e);
        }
    }, [sortedDecks]);

    // Save selected set codes to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(SETS_STORAGE_KEY, JSON.stringify(selectedSetCodes));
        } catch (e) {
            console.error('Failed saving selected set codes to localStorage:', e);
        }
    }, [selectedSetCodes]);

    // Save includeReprints setting to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(REPRINTS_STORAGE_KEY, JSON.stringify(includeReprints));
        } catch (e) {
            console.error('Failed saving includeReprints setting to localStorage:', e);
        }
    }, [includeReprints]);

    // Fetch available Scryfall sets on mount
    useEffect(() => {
        let isMounted = true;
        async function fetchSets() {
            setIsLoadingSets(true);
            try {
                const data = await getScryfallSets();
                if (isMounted) {
                    setSets(data);
                }
            } catch (err) {
                console.error('Failed to load Scryfall sets:', err);
            } finally {
                if (isMounted) {
                    setIsLoadingSets(false);
                }
            }
        }
        fetchSets();
        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch cards for selected sets with caching and debouncing for ultra-responsive selection
    useEffect(() => {
        if (selectedSetCodes.length === 0) {
            if (fetchDebounceTimerRef.current) {
                clearTimeout(fetchDebounceTimerRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            setCardsForSets([]);
            setCardLoadProgress(null);
            setIsLoadingCards(false);
            return;
        }

        const reprintSuffix = includeReprints ? 'all' : 'no_reprints';
        const uncachedCodes: string[] = [];
        const cachedCardsMap = new Map<string, ScryfallCard[]>();

        selectedSetCodes.forEach(code => {
            const cacheKey = `${code.toLowerCase()}_${reprintSuffix}`;
            if (setCardsCacheRef.current.has(cacheKey)) {
                cachedCardsMap.set(code, setCardsCacheRef.current.get(cacheKey)!);
            } else {
                uncachedCodes.push(code);
            }
        });

        // If all selected sets are already in memory, assemble and display immediately with 0 delay
        if (uncachedCodes.length === 0) {
            if (fetchDebounceTimerRef.current) {
                clearTimeout(fetchDebounceTimerRef.current);
            }
            const allSelectedCards: ScryfallCard[] = [];
            selectedSetCodes.forEach(code => {
                const list = cachedCardsMap.get(code) || [];
                allSelectedCards.push(...list);
            });
            setCardsForSets(allSelectedCards);
            setIsLoadingCards(false);
            setCardLoadProgress(null);
            return;
        }

        // Immediately display any already cached sets to keep UI responsive
        if (cachedCardsMap.size > 0) {
            const partialCards: ScryfallCard[] = [];
            selectedSetCodes.forEach(code => {
                if (cachedCardsMap.has(code)) {
                    partialCards.push(...cachedCardsMap.get(code)!);
                }
            });
            setCardsForSets(partialCards);
        }

        // Debounce fetching uncached sets so rapid clicking does not stutter
        if (fetchDebounceTimerRef.current) {
            clearTimeout(fetchDebounceTimerRef.current);
        }

        setIsLoadingCards(true);

        fetchDebounceTimerRef.current = setTimeout(() => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const controller = new AbortController();
            abortControllerRef.current = controller;

            getCardsForSets(
                uncachedCodes,
                includeReprints,
                (loaded, total) => {
                    setCardLoadProgress({ loaded, total });
                },
                controller.signal
            )
                .then(newlyFetchedCards => {
                    if (controller.signal.aborted) return;

                    // Group newly fetched cards by set and save to cache
                    uncachedCodes.forEach(code => {
                        const setCards = newlyFetchedCards.filter(
                            c => (c.set || '').toLowerCase() === code.toLowerCase()
                        );
                        setCardsCacheRef.current.set(`${code.toLowerCase()}_${reprintSuffix}`, setCards);
                    });

                    // Reassemble all selected sets in user-selected order
                    const finalCards: ScryfallCard[] = [];
                    selectedSetCodes.forEach(code => {
                        const key = `${code.toLowerCase()}_${reprintSuffix}`;
                        const setCards = setCardsCacheRef.current.get(key) || [];
                        finalCards.push(...setCards);
                    });

                    setCardsForSets(finalCards);
                    setIsLoadingCards(false);
                    setCardLoadProgress(null);
                })
                .catch(err => {
                    if (!controller.signal.aborted) {
                        console.error('Error loading cards for sets:', err);
                        setIsLoadingCards(false);
                        setCardLoadProgress(null);
                    }
                });
        }, 200);

        return () => {
            if (fetchDebounceTimerRef.current) {
                clearTimeout(fetchDebounceTimerRef.current);
            }
        };
    }, [selectedSetCodes, includeReprints]);

    // Commander search autocomplete - verifies IsCommander: true via Scryfall is:commander
    const handleCommanderInputChange = (value: string) => {
        setNewCommanderName(value);
        if (commanderDebounceRef.current) clearTimeout(commanderDebounceRef.current);

        if (value.trim().length >= 2) {
            setIsSearchingCommander(true);
            commanderDebounceRef.current = setTimeout(async () => {
                const results = await searchCommanderCards(value.trim());
                setCommanderCardSuggestions(results.slice(0, 8));
                setIsSearchingCommander(false);
            }, 200);
        } else {
            setCommanderCardSuggestions([]);
            setIsSearchingCommander(false);
        }
    };

    const handleSelectCommanderCard = (card: ScryfallCard) => {
        setNewCommanderName(card.name);
        setCommanderCardSuggestions([]);
        if (!newDeckName) {
            setNewDeckName(`${card.name} Deck`);
        }
        setNewColorIdentity(card.color_identity || []);
        setNewDeckImage(card.image_uris?.art_crop || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.art_crop || '');
    };

    const handleSelectCommander = async (commanderName: string) => {
        setNewCommanderName(commanderName);
        setCommanderCardSuggestions([]);
        setIsSearchingCommander(true);

        const card = await getCardByName(commanderName, true);
        if (card) {
            if (!newDeckName) {
                setNewDeckName(`${commanderName} Deck`);
            }
            setNewColorIdentity(card.color_identity || []);
            setNewDeckImage(card.image_uris?.art_crop || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.art_crop || '');
        }
        setIsSearchingCommander(false);
    };

    const toggleColor = (colorCode: string) => {
        if (colorCode === 'C') {
            setNewColorIdentity([]);
            return;
        }
        setNewColorIdentity(prev => {
            const filtered = prev.filter(c => c !== 'C');
            if (filtered.includes(colorCode)) {
                return filtered.filter(c => c !== colorCode);
            } else {
                return [...filtered, colorCode];
            }
        });
    };

    // Add new deck with IsCommander: true and alphabetical ordering
    const handleAddDeck = () => {
        if (!newCommanderName.trim()) return;

        const deckName = newDeckName.trim() || `${newCommanderName} Deck`;
        const newDeck: CommanderDeck = {
            id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: deckName,
            commanderName: newCommanderName.trim(),
            colorIdentity: newColorIdentity,
            imageUrl: newDeckImage,
            isCommander: true,
            IsCommander: true,
            cardsAdded: []
        };

        setDecks(prev => {
            const updated = [...prev, newDeck];
            return updated.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        });
        setNewDeckName('');
        setNewCommanderName('');
        setNewColorIdentity([]);
        setNewDeckImage('');
        setCommanderCardSuggestions([]);
    };

    // Delete deck
    const handleDeleteDeck = (deckId: string) => {
        setDecks(prev => prev.filter(d => d.id !== deckId));
    };

    // Delete all existing data for decks (clear back to empty)
    const handleDeleteAllDecks = () => {
        if (window.confirm('Are you sure you want to delete all decks and evaluations? This will clear all data back to empty.')) {
            setDecks([]);
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {
                console.error('Failed clearing localStorage:', e);
            }
            setSelectedDeckIdForBbCode('');
            setGeneratedBbCode('');
        }
    };

    // Import decks from remote API and sort alphabetically
    const handleImportFromApi = async () => {
        setIsImportingFromApi(true);
        setApiImportMessage(null);
        try {
            const res = await fetch('https://api.frostpointlabs.com/deckbuilder/decks');
            if (!res.ok) throw new Error(`API returned status ${res.status}`);
            const apiDecks: any[] = await res.json();

            if (!Array.isArray(apiDecks) || apiDecks.length === 0) {
                setApiImportMessage('No decks found at API endpoint.');
                return;
            }

            let addedCount = 0;
            let updatedCount = 0;
            const updated = [...decks];

            for (const item of apiDecks) {
                const deckName = item.name || item.deckName || 'Imported Deck';
                const commander = item.commander || item.commanderName || '';
                
                const mappedCards: DeckCardItem[] = (item.cards || []).map((c: any) => ({
                    id: c.cardId || c.id || `card_${Math.random().toString(36).substr(2, 6)}`,
                    name: c.name || c.cardName || '',
                    cmc: typeof c.cmc === 'number' ? c.cmc : (c.cmc ? parseFloat(c.cmc) : 0),
                    manaCost: c.manaCost || '',
                    colors: Array.isArray(c.colors) ? c.colors : [],
                    colorIdentity: Array.isArray(c.colorIdentity) ? c.colorIdentity : [],
                    typeLine: c.typeLine || '',
                    imageUrl: c.imageUrl || '',
                    quantity: typeof c.quantity === 'number' ? c.quantity : 1,
                    category: c.category || 'main',
                    scryfallId: c.scryfallId || ''
                }));

                const enrichedMappedCards = await enrichDeckCardsFromScryfall(mappedCards);

                const existingIndex = updated.findIndex(d => 
                    d.name.toLowerCase() === deckName.toLowerCase() ||
                    (commander && d.commanderName.toLowerCase() === commander.toLowerCase())
                );

                if (existingIndex !== -1) {
                    const existing = updated[existingIndex];
                    updated[existingIndex] = {
                        ...existing,
                        deckCards: enrichedMappedCards,
                        imageUrl: existing.imageUrl || item.commanderArtUrl || item.coverCardUrl || ''
                    };
                    updatedCount++;
                } else {
                    let colors: string[] = Array.isArray(item.commanderColorIdentity) ? item.commanderColorIdentity : [];
                    let img = item.commanderArtUrl || item.coverCardUrl || '';
                    if (commander && (colors.length === 0 || !img)) {
                        const card = await getCardByName(commander);
                        if (card) {
                            if (colors.length === 0) colors = card.color_identity;
                            if (!img) img = card.image_uris?.art_crop || card.image_uris?.normal || '';
                        }
                    }

                    updated.push({
                        id: item.deckId || item.id || `deck_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: deckName,
                        commanderName: commander || deckName,
                        colorIdentity: colors,
                        imageUrl: img,
                        isCommander: true,
                        IsCommander: true,
                        cardsAdded: [],
                        deckCards: enrichedMappedCards
                    });
                    addedCount++;
                }
            }

            updated.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            setDecks(updated);
            setApiImportMessage(`Successfully imported ${addedCount} new deck(s) and synced ${updatedCount} existing deck(s) with cards!`);
            setTimeout(() => setApiImportMessage(null), 4000);
        } catch (err) {
            console.error('Import from API failed:', err);
            setApiImportMessage('Failed to import decks from API.');
            setTimeout(() => setApiImportMessage(null), 4000);
        } finally {
            setIsImportingFromApi(false);
        }
    };

    // Card search autocomplete
    const handleCardSearchChange = (value: string) => {
        setCardSearchQuery(value);
        if (cardDebounceRef.current) clearTimeout(cardDebounceRef.current);

        const cleanVal = value.trim();
        if (cleanVal.length >= 1) {
            const cached = getCachedAutocomplete(cleanVal);
            if (cached) {
                setCardSuggestions(cached.slice(0, 8));
                return;
            }

            cardDebounceRef.current = setTimeout(async () => {
                const results = await autocompleteCards(cleanVal);
                setCardSuggestions(results.slice(0, 8));
            }, 80);
        } else {
            setCardSuggestions([]);
        }
    };

    // Select card from suggestions or Enter
    const handleSelectCard = async (cardName: string) => {
        setCardSearchQuery(cardName);
        setCardSuggestions([]);
        setIsLoadingCard(true);

        const card = await getCardByName(cardName, false);
        setSelectedCard(card);
        setIsLoadingCard(false);

        if (card) {
            const initialComments: Record<string, string> = {};
            sortedDecks.forEach(d => {
                const existingEval = (d.cardsAdded || []).find(c => c.cardName.toLowerCase() === card.name.toLowerCase());
                if (existingEval) {
                    initialComments[d.id] = existingEval.comments;
                }
            });
            setDeckComments(initialComments);
        }
    };

    // Set toggling handlers
    const handleToggleSet = (code: string) => {
        setSelectedSetCodes(prev => 
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        );
    };

    const handleClearAllSets = () => {
        setSelectedSetCodes([]);
    };

    const handleToggleReprints = (include: boolean) => {
        setIncludeReprints(include);
    };

    const handleOpenAddModal = (card: ScryfallCard) => {
        setModalCard(card);
        setIsAddModalOpen(true);
    };

    // Modal card add/remove handlers
    const handleModalAddCardToDeck = (deckId: string, card: ScryfallCard, commentText: string) => {
        const newEvaluation: DeckCardEvaluation = {
            id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            cardName: card.name,
            comments: commentText,
            colorIdentity: card.color_identity,
            manaCost: card.mana_cost,
            typeLine: card.type_line,
            imageUrl: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal,
            dateAdded: new Date().toLocaleDateString(),
            isCommander: card.isCommander ?? false,
            IsCommander: card.IsCommander ?? false
        };

        setDecks(prev => prev.map(deck => {
            if (deck.id !== deckId) return deck;
            const filtered = (deck.cardsAdded || []).filter(c => c.cardName.toLowerCase() !== card.name.toLowerCase());
            return {
                ...deck,
                cardsAdded: [...filtered, newEvaluation]
            };
        }));
    };

    const handleModalRemoveCardFromDeck = (deckId: string, cardName: string) => {
        setDecks(prev => prev.map(deck => {
            if (deck.id !== deckId) return deck;
            return {
                ...deck,
                cardsAdded: (deck.cardsAdded || []).filter(c => c.cardName.toLowerCase() !== cardName.toLowerCase())
            };
        }));
    };

    // Add card evaluation to a deck from single card lookup tab
    const handleAddCardToDeck = (deckId: string) => {
        if (!selectedCard) return;

        const comment = deckComments[deckId] || '';
        const newEvaluation: DeckCardEvaluation = {
            id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            cardName: selectedCard.name,
            comments: comment,
            colorIdentity: selectedCard.color_identity,
            manaCost: selectedCard.mana_cost,
            typeLine: selectedCard.type_line,
            imageUrl: selectedCard.image_uris?.normal || selectedCard.card_faces?.[0]?.image_uris?.normal,
            dateAdded: new Date().toLocaleDateString(),
            isCommander: selectedCard.isCommander ?? false,
            IsCommander: selectedCard.IsCommander ?? false
        };

        setDecks(prev => prev.map(deck => {
            if (deck.id !== deckId) return deck;
            const filtered = (deck.cardsAdded || []).filter(c => c.cardName.toLowerCase() !== selectedCard.name.toLowerCase());
            return {
                ...deck,
                cardsAdded: [...filtered, newEvaluation]
            };
        }));
    };

    // Remove card evaluation from a deck
    const handleRemoveCardFromDeck = (deckId: string, cardName: string) => {
        setDecks(prev => prev.map(deck => {
            if (deck.id !== deckId) return deck;
            return {
                ...deck,
                cardsAdded: (deck.cardsAdded || []).filter(c => c.cardName.toLowerCase() !== cardName.toLowerCase())
            };
        }));
    };

    // Clear all card evaluations across all decks
    const handleClearAllEvaluations = () => {
        if (window.confirm('Are you sure you want to clear all added cards across all decks?')) {
            setDecks(prev => prev.map(d => ({ ...d, cardsAdded: [] })));
        }
    };

    /**
     * Builds BBCode for a single deck with its specific color headers (derived from the API).
     * Only emits color headers where cards were actually added for this commander.
     */
    const generateSingleDeckBbCode = async (deck: CommanderDeck): Promise<string> => {
        if (!deck.cardsAdded || deck.cardsAdded.length === 0) return '';

        const colorCombo = getColorComboNickname(deck.colorIdentity);
        const headers = await fetchSetReviewHeadersFromApi(colorCombo);

        // Group cards for this deck by color
        const colorGroups: Record<string, DeckCardEvaluation[]> = {
            White: [],
            Blue: [],
            Black: [],
            Red: [],
            Green: [],
            Multicolor: [],
            Colorless: []
        };

        for (const card of deck.cardsAdded) {
            const cid = card.colorIdentity || [];
            if (cid.length === 0) {
                colorGroups.Colorless.push(card);
            } else if (cid.length === 1) {
                const map: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };
                const group = map[cid[0].toUpperCase()] || 'Colorless';
                colorGroups[group].push(card);
            } else {
                colorGroups.Multicolor.push(card);
            }
        }

        const colorSections: string[] = [];
        const orderedCategories = ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'];

        for (const cat of orderedCategories) {
            const cardsInCat = colorGroups[cat];
            if (!cardsInCat || cardsInCat.length === 0) {
                // Do not output header if no cards were added for this color!
                continue;
            }

            // Sort alphabetically by card name
            const sortedCards = [...cardsInCat].sort((a, b) => a.cardName.localeCompare(b.cardName));
            const header = headers[cat] || `[CENTER][HEADER style=${cat === 'Multicolor' ? colorCombo : cat}][SIZE=100]${cat === 'Colorless' ? 'Colorless and Land Cards' : `${cat} Cards`}[/SIZE][/HEADER][/CENTER]`;

            const cardLines = sortedCards.map(c => {
                const commentPart = c.comments?.trim() ? ` - ${c.comments.trim()}` : '';
                return `[[${c.cardName}]]${commentPart}`;
            }).join('\n\n');

            colorSections.push(`${header}\n${cardLines}`);
        }

        if (colorSections.length === 0) return '';
        const deckBbCode = colorSections.join('\n');

        const intro = globalReviewIntro.trim();
        if (intro) {
            return `${intro}\n\n${deckBbCode}`;
        }
        return deckBbCode;
    };

    // Generate BBCode for the currently selected deck
    const handleGenerateBbCode = async (targetDeckId?: string) => {
        setIsGeneratingBbCode(true);

        try {
            const deckId = targetDeckId || selectedDeckIdForBbCode;
            const targetDeck = sortedDecks.find(d => d.id === deckId);

            if (!targetDeck) {
                setGeneratedBbCode('; Please select a Commander deck above to view its BBCode.');
                setIsGeneratingBbCode(false);
                return;
            }

            if (!targetDeck.cardsAdded || targetDeck.cardsAdded.length === 0) {
                setGeneratedBbCode(`; No cards evaluated yet for ${targetDeck.name} (${targetDeck.commanderName}).`);
                setIsGeneratingBbCode(false);
                return;
            }

            const bbCode = await generateSingleDeckBbCode(targetDeck);
            setGeneratedBbCode(bbCode);
        } catch (err) {
            console.error('Error generating BBCode:', err);
            setGeneratedBbCode('; Error generating BBCode.');
        } finally {
            setIsGeneratingBbCode(false);
        }
    };

    // Default to first deck with evaluations, or first deck overall
    useEffect(() => {
        if (!selectedDeckIdForBbCode && sortedDecks.length > 0) {
            const firstWithCards = sortedDecks.find(d => (d.cardsAdded || []).length > 0);
            const initialId = firstWithCards ? firstWithCards.id : sortedDecks[0].id;
            setSelectedDeckIdForBbCode(initialId);
        }
    }, [sortedDecks, selectedDeckIdForBbCode]);

    // Auto-generate BBCode when tab or active deck changes
    useEffect(() => {
        if (activeTab === 'summary' && selectedDeckIdForBbCode) {
            handleGenerateBbCode(selectedDeckIdForBbCode);
        }
    }, [activeTab, selectedDeckIdForBbCode, sortedDecks, globalReviewIntro]);

    // Copy to clipboard
    const handleCopy = () => {
        if (!generatedBbCode) return;
        navigator.clipboard.writeText(generatedBbCode);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    // Total cards evaluated
    const totalAddedCardsCount = sortedDecks.reduce((acc, d) => acc + (d.cardsAdded ? d.cardsAdded.length : 0), 0);

    // Total unique cards in Buy List
    const uniqueBuyListCount = useMemo(() => {
        const set = new Set<string>();
        for (const deck of sortedDecks) {
            if (deck.cardsAdded) {
                for (const c of deck.cardsAdded) {
                    set.add(c.cardName.trim().toLowerCase());
                }
            }
        }
        return set.size;
    }, [sortedDecks]);

    // Filter compatible & incompatible decks for the selected single card lookup in alphabetical order
    const compatibleDecks = selectedCard 
        ? sortedDecks.filter(deck => isCardCompatibleWithDeck(selectedCard.color_identity, deck.colorIdentity))
        : [];

    const incompatibleDecks = selectedCard 
        ? sortedDecks.filter(deck => !isCardCompatibleWithDeck(selectedCard.color_identity, deck.colorIdentity))
        : [];

    return (
        <div className="space-y-8 p-4">
            {/* Page Header */}
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-purple-500/20"
                >
                    <BookOpen className="text-purple-400" size={40} />
                </motion.div>
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white uppercase">
                        Set Review
                    </h2>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto italic">
                        "Browse new sets, evaluate cards for your commanders, and generate MTGNexus BBCode."
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center border-b border-purple-500/20 pb-4 gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setActiveTab('sets')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'sets'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                >
                    <Layers size={16} />
                    <span>Browse Sets & Add Cards</span>
                    {selectedSetCodes.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-400/20 text-purple-300 font-mono">
                            {selectedSetCodes.length} Set{selectedSetCodes.length === 1 ? '' : 's'}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('decks')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'decks'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                >
                    <Shield size={16} />
                    <span>My Decks ({sortedDecks.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'summary'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                >
                    <FileText size={16} />
                    <span>Set Review BBCode</span>
                    {totalAddedCardsCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-400/20 text-purple-300 font-mono">
                            {totalAddedCardsCount}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('buylist')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
                        activeTab === 'buylist'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                >
                    <ShoppingCart size={16} />
                    <span>Buy List</span>
                    {uniqueBuyListCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                            {uniqueBuyListCount}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: BROWSE SETS & ADD CARDS */}
            {activeTab === 'sets' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Set Selector Component */}
                    <SetSelector
                        sets={sets}
                        selectedSetCodes={selectedSetCodes}
                        onToggleSet={handleToggleSet}
                        onClearAll={handleClearAllSets}
                        includeReprints={includeReprints}
                        onToggleReprints={handleToggleReprints}
                        isLoadingSets={isLoadingSets}
                        isLoadingCards={isLoadingCards}
                        totalCardsCount={cardsForSets.length}
                        loadProgress={cardLoadProgress}
                    />

                    {/* Cards Display Grid */}
                    <SetCardGrid
                        cards={cardsForSets}
                        decks={sortedDecks}
                        onOpenAddModal={handleOpenAddModal}
                        selectedSetCodes={selectedSetCodes}
                    />
                </motion.div>
            )}

            {/* TAB 2: SINGLE CARD SEARCH & MATCH */}
            {activeTab === 'lookup' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Search Bar */}
                    <div className="glass rounded-[2rem] p-6 border border-purple-500/20 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-3.5 text-purple-400" size={20} />
                            <input
                                type="text"
                                value={cardSearchQuery}
                                onChange={(e) => handleCardSearchChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && cardSearchQuery.trim()) {
                                        handleSelectCard(cardSearchQuery.trim());
                                    }
                                }}
                                placeholder="Type any MTG card name to evaluate against your decks (e.g. Cyclonic Rift, Esper Sentinel)..."
                                className="w-full bg-slate-950/70 border border-purple-500/20 rounded-2xl pl-12 pr-4 py-3.5 text-white text-base focus:ring-2 focus:ring-purple-500/40 outline-none transition-all placeholder:text-slate-500"
                            />
                            {isLoadingCard && (
                                <RefreshCw className="absolute right-4 top-3.5 text-purple-400 animate-spin" size={20} />
                            )}
                        </div>

                        {/* Autocomplete Suggestions */}
                        {cardSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {cardSuggestions.map((suggestion, sIdx) => (
                                    <button
                                        key={suggestion || `sugg_${sIdx}`}
                                        type="button"
                                        onClick={() => handleSelectCard(suggestion)}
                                        className="px-3.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 text-xs border border-purple-500/20 transition-colors flex items-center gap-1.5"
                                    >
                                        <Plus size={12} />
                                        <span>{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Card Evaluation & Deck Matching */}
                    {selectedCard && (
                        <div className="space-y-6">
                            {/* Card Details Card */}
                            <div className="glass rounded-[2rem] p-6 border border-purple-500/20 flex flex-col md:flex-row gap-6 items-start">
                                {selectedCard.image_uris?.normal ? (
                                    <CardHoverImage
                                        src={selectedCard.image_uris.normal}
                                        popoutSrc={selectedCard.image_uris.large || selectedCard.image_uris.normal}
                                        alt={selectedCard.name}
                                        className="w-56 sm:w-64 rounded-2xl shadow-2xl border border-purple-500/30 mx-auto md:mx-0 shrink-0"
                                        popoutWidth={380}
                                    />
                                ) : (
                                    <div className="w-48 h-64 rounded-2xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center mx-auto md:mx-0 shrink-0">
                                        <Shield size={48} className="text-purple-400" />
                                    </div>
                                )}

                                <div className="space-y-4 flex-1 w-full">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-purple-500/20 pb-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                                <span>{selectedCard.name}</span>
                                                <span className="font-mono text-sm text-purple-300 font-normal">
                                                    {selectedCard.mana_cost}
                                                </span>
                                            </h3>
                                            <p className="text-slate-400 text-sm font-medium">
                                                {selectedCard.type_line}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                Color Identity: {selectedCard.color_identity.length > 0 ? selectedCard.color_identity.join(', ') : 'Colorless'}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedCard.oracle_text && (
                                        <p className="text-sm text-slate-300 font-serif whitespace-pre-line leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-purple-500/10">
                                            {selectedCard.oracle_text}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Compatible Decks Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                        <span>Compatible Decks (Alphabetical)</span>
                                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            {compatibleDecks.length} Match{compatibleDecks.length === 1 ? '' : 'es'}
                                        </span>
                                    </h4>
                                    <span className="text-xs text-slate-400">
                                        Only decks containing {selectedCard.color_identity.length > 0 ? selectedCard.color_identity.join(', ') : 'any color'}
                                    </span>
                                </div>

                                {sortedDecks.length === 0 ? (
                                    <div className="p-8 text-center glass rounded-2xl border border-purple-500/20 space-y-2">
                                        <p className="text-sm text-slate-300">You haven't created any Commander decks yet!</p>
                                        <p className="text-xs text-slate-500">Go to the "My Decks" tab to add your decks.</p>
                                    </div>
                                ) : compatibleDecks.length === 0 ? (
                                    <div className="p-8 text-center glass rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-2">
                                        <p className="text-sm font-bold text-rose-300">No compatible decks found</p>
                                        <p className="text-xs text-slate-400">
                                            None of your commander decks include all the colors required by {selectedCard.name}.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {compatibleDecks.map((deck, dIdx) => {
                                            const isAlreadyAdded = (deck.cardsAdded || []).some(
                                                c => c.cardName.toLowerCase() === selectedCard.name.toLowerCase()
                                            );
                                            const colorCombo = getColorComboNickname(deck.colorIdentity);

                                            return (
                                                <motion.div
                                                    key={deck.id || `deck_compat_${dIdx}`}
                                                    layout
                                                    className={`p-5 rounded-2xl border transition-all ${
                                                        isAlreadyAdded
                                                            ? 'bg-purple-950/30 border-purple-500/40 shadow-lg'
                                                            : 'bg-slate-900/60 border-purple-500/15 hover:border-purple-500/30'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex items-center gap-3">
                                                            {deck.imageUrl ? (
                                                                <img
                                                                    src={deck.imageUrl}
                                                                    alt={deck.commanderName}
                                                                    className="w-12 h-12 rounded-xl object-cover border border-purple-500/20 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                                    <Shield size={20} className="text-purple-400" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h5 className="font-bold text-white text-base leading-snug">
                                                                        {deck.name}
                                                                    </h5>
                                                                    {isAlreadyAdded && (
                                                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                                                                            Added
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-purple-300 font-mono">
                                                                    {deck.commanderName} ({colorCombo})
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {isAlreadyAdded && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveCardFromDeck(deck.id, selectedCard.name)}
                                                                    className="p-2 text-rose-400 hover:text-rose-300 rounded-xl hover:bg-rose-500/10 transition-colors text-xs flex items-center gap-1"
                                                                    title="Remove from deck"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddCardToDeck(deck.id)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                                    isAlreadyAdded
                                                                        ? 'bg-purple-700/50 hover:bg-purple-700 text-purple-200'
                                                                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                                                }`}
                                                            >
                                                                {isAlreadyAdded ? <Check size={14} /> : <Plus size={14} />}
                                                                <span>{isAlreadyAdded ? 'Update Note' : 'Add to Deck'}</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Deck Comments input with autocomplete */}
                                                    <div className="space-y-1">
                                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                                            <span>Deck Review Notes</span>
                                                            <span className="text-[10px] text-purple-400 font-mono lowercase">Type [[ for card links</span>
                                                        </label>
                                                        <CardTagAutocompleteTextarea
                                                            value={deckComments[deck.id] || ''}
                                                            onChange={(val) => setDeckComments(prev => ({ ...prev, [deck.id]: val }))}
                                                            placeholder={`e.g. Cuts [[Cultivate]] for this, or upgrades the draw engine...`}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Collapsible Incompatible Decks */}
                                {incompatibleDecks.length > 0 && (
                                    <div className="pt-4 border-t border-purple-500/10">
                                        <button
                                            type="button"
                                            onClick={() => setShowIncompatible(!showIncompatible)}
                                            className="text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 flex items-center gap-2 transition-colors"
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
                                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3 overflow-hidden text-xs"
                                                >
                                                    {incompatibleDecks.map((deck, dIdx) => {
                                                        const missing = getMissingColors(selectedCard.color_identity, deck.colorIdentity);
                                                        return (
                                                            <div
                                                                key={deck.id || `deck_incompat_${dIdx}`}
                                                                className="p-3 bg-slate-950/30 rounded-xl border border-rose-500/10 flex items-center justify-between"
                                                            >
                                                                <div className="truncate mr-2">
                                                                    <p className="font-bold text-slate-300 truncate">{deck.name}</p>
                                                                    <p className="text-[11px] text-slate-500 truncate">{deck.commanderName}</p>
                                                                </div>
                                                                <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 shrink-0">
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
                        </div>
                    )}
                </motion.div>
            )}

            {/* TAB 3: MY DECKS (CRUD & MANAGEMENT) */}
            {activeTab === 'decks' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Add / Import Section */}
                    <div className="glass rounded-[2rem] p-6 border border-purple-500/20 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase text-white">Create or Import Commander Deck</h3>
                                <p className="text-xs text-slate-400">
                                    Commander search enforces <strong className="text-purple-300 font-mono">IsCommander: true</strong>. Add your decks or sync with your deckbuilder.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleImportFromApi}
                                disabled={isImportingFromApi}
                                className="px-4 py-2 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
                            >
                                <RefreshCw size={14} className={isImportingFromApi ? 'animate-spin' : ''} />
                                <span>{isImportingFromApi ? 'Importing Decks...' : 'Import Decks'}</span>
                            </button>
                        </div>

                        {apiImportMessage && (
                            <p className="text-xs text-emerald-300 bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/20 font-medium">
                                {apiImportMessage}
                            </p>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Commander Name Input with Autocomplete restricted to IsCommander: true */}
                            <div className="relative space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Commander Name</label>
                                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-500/20">
                                        is:commander verified
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    value={newCommanderName}
                                    onChange={(e) => handleCommanderInputChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCommanderName.trim()) {
                                            if (commanderCardSuggestions.length > 0) {
                                                handleSelectCommanderCard(commanderCardSuggestions[0]);
                                            } else {
                                                handleSelectCommander(newCommanderName.trim());
                                            }
                                        }
                                    }}
                                    placeholder="Type commander name (e.g. Atraxa, Niv-Mizzet, Solphim)..."
                                    className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                                />
                                {isSearchingCommander && (
                                    <span className="absolute right-3 top-9 text-xs text-purple-400 animate-spin">⟳</span>
                                )}

                                {/* Suggestions Dropdown with IsCommander: true badge */}
                                {commanderCardSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-purple-500/30 rounded-xl overflow-hidden shadow-2xl z-30 divide-y divide-purple-500/10 max-h-72 overflow-y-auto">
                                        {commanderCardSuggestions.map((cardItem, cIdx) => (
                                            <button
                                                key={cardItem.id || cardItem.name || `cmd_sugg_${cIdx}`}
                                                type="button"
                                                onClick={() => handleSelectCommanderCard(cardItem)}
                                                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-purple-600/20 transition-colors flex items-center justify-between gap-3 group"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {cardItem.image_uris?.art_crop || cardItem.card_faces?.[0]?.image_uris?.art_crop ? (
                                                        <img 
                                                            src={cardItem.image_uris?.art_crop || cardItem.card_faces?.[0]?.image_uris?.art_crop}
                                                            alt={cardItem.name}
                                                            className="w-8 h-8 rounded-lg object-cover border border-purple-500/30 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                            <Shield size={14} className="text-purple-400" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                                                                {cardItem.name}
                                                            </span>
                                                            <span className="font-mono text-[10px] text-purple-300">
                                                                {cardItem.mana_cost}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 truncate">
                                                            {cardItem.type_line}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-mono">
                                                        IsCommander: true
                                                    </span>
                                                    <span className="text-[11px] font-mono text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                        {cardItem.color_identity.length > 0 ? cardItem.color_identity.join('') : 'C'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Deck Name Input */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Deck Name / Theme</label>
                                <input
                                    type="text"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    placeholder="e.g. Atraxa Superfriends (or leave blank to use commander name)"
                                    className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-purple-500/40 outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Color Identity Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Commander Color Identity ({newColorIdentity.length > 0 ? newColorIdentity.join(', ') : 'Colorless'} - {getColorComboNickname(newColorIdentity)})
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map(c => {
                                    const isSelected = c.code === 'C' 
                                        ? newColorIdentity.length === 0 
                                        : newColorIdentity.includes(c.code);

                                    return (
                                        <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => toggleColor(c.code)}
                                            className={`px-4 py-2 rounded-xl text-xs border transition-all ${
                                                isSelected ? c.activeClass : `bg-slate-950/40 ${c.colorClass} hover:bg-white/5`
                                            }`}
                                        >
                                            {c.label} ({c.code})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={handleAddDeck}
                                disabled={!newCommanderName.trim()}
                                className={`px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                    newCommanderName.trim()
                                        ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                <Plus size={16} />
                                <span>Save Commander Deck</span>
                            </button>
                        </div>
                    </div>

                    {/* Decks Grid - strictly in alphabetical order */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold uppercase tracking-wider text-white">
                                Tracked Decks (Alphabetical: {sortedDecks.length})
                            </h4>
                            {sortedDecks.length > 0 && (
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={handleClearAllEvaluations}
                                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
                                        title="Clear all cards added to all decks while keeping the deck roster"
                                    >
                                        <RotateCcw size={13} />
                                        <span>Clear Added Cards</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteAllDecks}
                                        className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 font-mono px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20"
                                        title="Delete all decks and card evaluations back to empty"
                                    >
                                        <Trash2 size={13} />
                                        <span>Delete All</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {sortedDecks.length === 0 ? (
                            <div className="glass rounded-[2rem] p-12 text-center border border-purple-500/20 space-y-3">
                                <Shield className="mx-auto text-purple-400" size={36} />
                                <p className="text-slate-300 font-semibold">No decks created yet.</p>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Create a deck using the form above or click "Import Decks" to load your existing decks.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedDecks.map((deck, dIdx) => (
                                    <motion.div
                                        key={deck.id || `deck_card_${dIdx}`}
                                        layout
                                        className="glass rounded-2xl p-5 border border-purple-500/20 flex flex-col justify-between space-y-4 group hover:border-purple-500/40 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            {deck.imageUrl ? (
                                                <img
                                                    src={deck.imageUrl}
                                                    alt={deck.commanderName}
                                                    className="w-14 h-14 rounded-xl object-cover border border-purple-500/30 shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl bg-purple-900/30 border border-purple-500/20 flex items-center justify-center shrink-0">
                                                    <Shield size={24} className="text-purple-400" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h5 className="font-bold text-white text-base leading-snug truncate" title={deck.name}>
                                                    {deck.name}
                                                </h5>
                                                <p className="text-xs text-purple-300 font-mono truncate" title={deck.commanderName}>
                                                    {deck.commanderName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                        {getColorComboNickname(deck.colorIdentity)}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        {deck.colorIdentity.length > 0 ? `[${deck.colorIdentity.join('')}]` : '[C]'}
                                                    </span>
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                        IsCommander: true
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cards Added in Deck */}
                                        <div className="space-y-2 pt-2 border-t border-purple-500/10">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">Evaluated Cards:</span>
                                                <span className="font-mono font-bold text-purple-300">{deck.cardsAdded?.length || 0}</span>
                                            </div>

                                            {deck.cardsAdded && deck.cardsAdded.length > 0 ? (
                                                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                                    {deck.cardsAdded.map((card, cIdx) => (
                                                        <div
                                                            key={card.id || `${card.cardName}_${cIdx}`}
                                                            className="flex items-center justify-between text-xs bg-slate-950/50 p-2 rounded-lg border border-purple-500/10 group/item"
                                                        >
                                                            <div className="truncate mr-2">
                                                                <span className="font-medium text-slate-200">[[{card.cardName}]]</span>
                                                                {card.comments && (
                                                                    <span className="text-slate-400 text-[11px] block truncate">
                                                                        {card.comments}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveCardFromDeck(deck.id, card.cardName)}
                                                                className="opacity-0 group-hover/item:opacity-100 text-rose-400 hover:text-rose-300 p-1 transition-opacity"
                                                                title="Remove card"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">No cards added yet.</p>
                                            )}
                                        </div>

                                        {/* Imported Deck Cards (MtgDeckbuilder) */}
                                        {deck.deckCards && deck.deckCards.length > 0 && (
                                            <div className="space-y-2 pt-2 border-t border-purple-500/10">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpandedCommanderDecklistId(prev => prev === deck.id ? null : deck.id)}
                                                        className="flex-1 flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 transition-colors cursor-pointer"
                                                    >
                                                        <span className="flex items-center gap-1.5 font-medium">
                                                            <Layers size={13} className="text-indigo-400" />
                                                            <span>Deck Cards</span>
                                                        </span>
                                                        <span className="font-mono text-[11px] font-bold text-indigo-300">
                                                            {deck.deckCards.length} cards {expandedCommanderDecklistId === deck.id ? '▲' : '▼'}
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setGalleryModalDeck(deck)}
                                                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/35 text-indigo-200 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
                                                        title={`Open full visual card gallery for ${deck.name} to view and read all cards in a grid`}
                                                    >
                                                        <Eye size={12} className="text-indigo-400" />
                                                        <span>Visual Grid</span>
                                                    </button>
                                                </div>

                                                {expandedCommanderDecklistId === deck.id && (
                                                    <DeckCardsBreakdown
                                                        cards={deck.deckCards}
                                                        deck={deck}
                                                        deckName={deck.name}
                                                        maxHeightClass="max-h-64"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom Action */}
                                        <div className="pt-2 border-t border-purple-500/10 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDeck(deck.id)}
                                                className="text-xs text-rose-400/80 hover:text-rose-400 transition-colors flex items-center gap-1"
                                            >
                                                <Trash2 size={13} />
                                                <span>Delete Deck</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* TAB 4: SET REVIEW BBCODE GENERATION */}
            {activeTab === 'summary' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Controls Bar: Deck Switcher Badges */}
                    <div className="glass rounded-[2rem] p-6 border border-purple-500/20 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase text-white">MTGNexus Set Review BBCode</h3>
                                <p className="text-xs text-slate-400">
                                    Click on a Commander deck below to view and copy its specific Set Review BBCode with API color headers.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveTab('buylist')}
                                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                            >
                                <ShoppingCart size={14} />
                                <span>Generate Buy List ({uniqueBuyListCount})</span>
                            </button>
                        </div>

                        {/* Global Review Intro Textbox */}
                        <div className="pt-3 border-t border-purple-500/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="global-review-intro" className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                    <FileText size={14} className="text-purple-400" />
                                    <span>Review Header / Introduction (Applies to all decks)</span>
                                </label>
                                {globalReviewIntro && (
                                    <button
                                        type="button"
                                        onClick={() => setGlobalReviewIntro('')}
                                        className="text-[11px] text-rose-400 hover:text-rose-300 font-mono transition-colors"
                                    >
                                        Clear Text
                                    </button>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Any text or BBCode entered here will precede the start of the color headers in every deck's review BBCode (separated by a blank line).
                            </p>
                            <textarea
                                id="global-review-intro"
                                value={globalReviewIntro}
                                onChange={(e) => setGlobalReviewIntro(e.target.value)}
                                placeholder="Add custom introduction text to precede all reviews, e.g. [CENTER][SIZE=120][B]Duskmourn Commander Set Review[/B][/SIZE][/CENTER]"
                                rows={3}
                                className="w-full bg-slate-950/70 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500/40 outline-none transition-all resize-y font-mono"
                            />
                        </div>

                        {/* Deck Switcher Badges */}
                        <div className="pt-3 border-t border-purple-500/10 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Commander Decks:
                                </span>
                                <span className="text-[11px] text-purple-300 font-mono">
                                    {`Active Deck: ${sortedDecks.find(d => d.id === selectedDeckIdForBbCode)?.name || 'None'}`}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {sortedDecks.map((deck, dIdx) => {
                                    const isSelected = selectedDeckIdForBbCode === deck.id;
                                    const cardCount = (deck.cardsAdded || []).length;
                                    return (
                                        <button
                                            key={deck.id || `bbcode_deck_${dIdx}`}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDeckIdForBbCode(deck.id);
                                                handleGenerateBbCode(deck.id);
                                            }}
                                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                isSelected
                                                    ? 'bg-purple-600 text-white border border-purple-400 shadow-md shadow-purple-600/30'
                                                    : 'bg-slate-900/80 text-slate-300 hover:text-white border border-purple-500/20 hover:bg-slate-800'
                                            }`}
                                        >
                                            <Shield size={13} className={isSelected ? 'text-white' : 'text-purple-400'} />
                                            <span className="truncate max-w-[200px]">{deck.name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                                                isSelected
                                                    ? 'bg-purple-800 text-white'
                                                    : cardCount > 0
                                                    ? 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                                                    : 'bg-slate-800 text-slate-500'
                                            }`}>
                                                {cardCount}
                                            </span>
                                        </button>
                                    );
                                })}

                                {sortedDecks.length === 0 && (
                                    <span className="text-xs text-slate-500 italic py-1">
                                        No commander decks found. Add your decks in the "My Decks" tab.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Code Output Textarea & Actions */}
                    <div className="glass rounded-[2rem] p-6 border border-purple-500/20 space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Generated BBCode ({generatedBbCode ? generatedBbCode.split('\n').length : 0} lines)
                                </span>
                                {isGeneratingBbCode && (
                                    <RefreshCw className="text-purple-400 animate-spin" size={14} />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    disabled={!generatedBbCode.trim()}
                                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                        hasCopied
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30'
                                    }`}
                                >
                                    {hasCopied ? <Check size={14} /> : <Copy size={14} />}
                                    <span>{hasCopied ? 'Copied!' : 'Copy BBCode'}</span>
                                </button>
                            </div>
                        </div>

                        <textarea
                            value={generatedBbCode}
                            onChange={(e) => setGeneratedBbCode(e.target.value)}
                            rows={18}
                            className="w-full bg-slate-950 border border-purple-500/20 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-purple-500/40 outline-none transition-all resize-y leading-relaxed"
                            placeholder="Select a commander above to view its BBCode..."
                        />
                    </div>
                </motion.div>
            )}

            {/* TAB 5: BUY LIST */}
            {activeTab === 'buylist' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <BuyListView
                        decks={sortedDecks}
                        onNavigateToBrowse={() => setActiveTab('sets')}
                    />
                </motion.div>
            )}

            {/* Add Card to Decks Modal */}
            <AddCardToDecksModal
                card={modalCard}
                decks={sortedDecks}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddCardToDeck={handleModalAddCardToDeck}
                onRemoveCardFromDeck={handleModalRemoveCardFromDeck}
            />

            {/* Pop-out Visual Card Gallery Modal */}
            <DeckVisualGalleryModal
                isOpen={Boolean(galleryModalDeck)}
                onClose={() => setGalleryModalDeck(null)}
                deck={galleryModalDeck}
            />
        </div>
    );
}
