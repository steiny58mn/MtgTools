import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
    BookOpen, 
    Plus, 
    Trash2, 
    Copy, 
    Check,   
    Layers, 
    FileText, 
    RefreshCw,
    Shield,
    RotateCcw,
    Eye,
    User
} from 'lucide-react';
import { useAuth, AuthService } from '../Utilities/AuthService';
import AuthModal from '../Components/AuthModal';
import type { CommanderDeck, DeckCardEvaluation, ScryfallCard, ScryfallSet, DeckCardItem } from '../Utilities/Interfaces';
import { 
    searchCommanderCards,
    getCardByName, 
    getScryfallSets,
    getCardsForSets,
    getColorComboNickname,
    enrichDeckCardsFromScryfall
} from '../Utilities/ScryfallService';
import SetSelector from '../Components/SetSelector';
import SetCardGrid from '../Components/SetCardGrid';
import AddCardToDecksModal from '../Components/AddCardToDecksModal';
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
    const [activeTab, setActiveTab] = useState<'sets' | 'decks' | 'summary'>('sets');

    // Authentication & Deckbuilder User State
    const { user, isLoggedIn, savedUsername, setSavedUsername } = useAuth();
    const [importUsername, setImportUsername] = useState(() => user?.username || savedUsername || '');
    const [isSetReviewAuthModalOpen, setIsSetReviewAuthModalOpen] = useState(false);
    const [showUserOverride, setShowUserOverride] = useState(false);

    useEffect(() => {
        if (user?.username) {
            setImportUsername(user.username);
        } else if (savedUsername) {
            setImportUsername(savedUsername);
        }
    }, [user, savedUsername]);

    // Decks State - always kept in alphabetical order
    const [decks, setDecks] = useState<CommanderDeck[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: CommanderDeck[] = JSON.parse(saved);
                const sanitized = parsed.map(deck => {
                    if (!deck.deckCards) return deck;
                    const cleanedCards = deck.deckCards.filter(c => {
                        const cat = (c.category || '').toLowerCase().trim();
                        return !cat.includes('maybe');
                    });
                    return { ...deck, deckCards: cleanedCards };
                });
                return sanitized.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            }
        } catch (e) {
            console.error('Failed reading decks from localStorage:', e);
        }
        return [];
    });

    // Form inputs for creating a deck manually
    const [newCommanderName, setNewCommanderName] = useState('');
    const [newDeckName, setNewDeckName] = useState('');
    const [newColorIdentity, setNewColorIdentity] = useState<string[]>([]);
    const [commanderCardSuggestions, setCommanderCardSuggestions] = useState<ScryfallCard[]>([]);
    const [isSearchingCommander, setIsSearchingCommander] = useState(false);
    const [selectedCommanderCard, setSelectedCommanderCard] = useState<ScryfallCard | null>(null);

    // Collapsed decklist view id state
    const [expandedCommanderDecklistId, setExpandedCommanderDecklistId] = useState<string | null>(null);
    const [galleryModalDeck, setGalleryModalDeck] = useState<CommanderDeck | null>(null);

    // Sets & Grid State
    const [sets, setSets] = useState<ScryfallSet[]>([]);
    const [selectedSetCodes, setSelectedSetCodes] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(SETS_STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed reading selected set codes from localStorage:', e);
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
            console.error('Failed reading includeReprints setting from localStorage:', e);
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

    // Auto-heal existing decks whose commander was set but colorIdentity/image wasn't updated
    useEffect(() => {
        let isCancelled = false;
        const decksNeedingHealing = decks.filter(d => 
            d.commanderName && 
            (!d.colorIdentity || d.colorIdentity.length === 0 || !d.imageUrl)
        );

        if (decksNeedingHealing.length === 0) return;

        (async () => {
            let hasChanges = false;
            const updatedDecks = await Promise.all(decks.map(async (d) => {
                const needsColors = !d.colorIdentity || d.colorIdentity.length === 0;
                const needsImage = !d.imageUrl;
                if (!needsColors && !needsImage) return d;

                const cmdrCard = (d.deckCards || []).find(c => 
                    c.isCommander || 
                    (d.commanderName && c.name.toLowerCase() === d.commanderName.toLowerCase())
                );

                let newColors = d.colorIdentity ? [...d.colorIdentity] : [];
                let newImg = d.imageUrl || '';

                if (cmdrCard) {
                    if (newColors.length === 0 && cmdrCard.colorIdentity && cmdrCard.colorIdentity.length > 0) {
                        newColors = cmdrCard.colorIdentity;
                    }
                    if (newColors.length === 0 && cmdrCard.colors && cmdrCard.colors.length > 0) {
                        newColors = cmdrCard.colors;
                    }
                    if (!newImg && cmdrCard.imageUrl) {
                        newImg = cmdrCard.imageUrl;
                    }
                }

                if ((newColors.length === 0 || !newImg) && d.commanderName && d.commanderName !== d.name) {
                    try {
                        const scryCard = await getCardByName(d.commanderName);
                        if (scryCard) {
                            if (newColors.length === 0) newColors = scryCard.color_identity || [];
                            if (!newImg) newImg = scryCard.image_uris?.art_crop || scryCard.image_uris?.normal || '';
                        }
                    } catch (e) {
                        console.error('Error auto-healing deck commander info:', e);
                    }
                }

                if (newColors.length !== (d.colorIdentity || []).length || newImg !== (d.imageUrl || '')) {
                    hasChanges = true;
                    return {
                        ...d,
                        colorIdentity: newColors,
                        imageUrl: newImg
                    };
                }
                return d;
            }));

            if (!isCancelled && hasChanges) {
                setDecks(updatedDecks);
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [decks]);

    const commanderDebounceRef = useRef<NodeJS.Timeout | null>(null);
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
    }, [decks]);

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

        const assembleResults = (uncachedResults: ScryfallCard[] = []) => {
            const all: ScryfallCard[] = [];
            selectedSetCodes.forEach(code => {
                const cached = cachedCardsMap.get(code);
                if (cached) {
                    all.push(...cached);
                } else {
                    const fromLoaded = uncachedResults.filter(c => (c.set || '').toLowerCase() === code.toLowerCase());
                    all.push(...fromLoaded);
                }
            });
            return all;
        };

        if (uncachedCodes.length === 0) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (fetchDebounceTimerRef.current) {
                clearTimeout(fetchDebounceTimerRef.current);
            }
            setCardsForSets(assembleResults());
            setIsLoadingCards(false);
            setCardLoadProgress(null);
            return;
        }

        const immediateInitial = assembleResults();
        if (immediateInitial.length > 0) {
            setCardsForSets(immediateInitial);
        }

        if (fetchDebounceTimerRef.current) {
            clearTimeout(fetchDebounceTimerRef.current);
        }

        fetchDebounceTimerRef.current = setTimeout(async () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            const currentController = new AbortController();
            abortControllerRef.current = currentController;

            setIsLoadingCards(true);
            setCardLoadProgress({ loaded: 0, total: uncachedCodes.length });

            try {
                const newCards = await getCardsForSets(
                    uncachedCodes,
                    includeReprints,
                    (loaded, total) => {
                        if (!currentController.signal.aborted) {
                            setCardLoadProgress({ loaded, total });
                        }
                    },
                    currentController.signal
                );

                if (!currentController.signal.aborted) {
                    uncachedCodes.forEach(code => {
                        const setCards = newCards.filter(c => (c.set || '').toLowerCase() === code.toLowerCase());
                        const cacheKey = `${code.toLowerCase()}_${reprintSuffix}`;
                        setCardsCacheRef.current.set(cacheKey, setCards);
                    });

                    const finalCards = assembleResults(newCards);
                    setCardsForSets(finalCards);
                    setCardLoadProgress(null);
                    setIsLoadingCards(false);
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return;
                }
                console.error('Failed to load cards for sets:', err);
                if (!currentController.signal.aborted) {
                    setIsLoadingCards(false);
                    setCardLoadProgress(null);
                }
            }
        }, 120);

        return () => {
            if (fetchDebounceTimerRef.current) {
                clearTimeout(fetchDebounceTimerRef.current);
            }
        };
    }, [selectedSetCodes, includeReprints]);

    // Commander search input change - enforced is:commander
    const handleCommanderInputChange = (val: string) => {
        setNewCommanderName(val);
        setSelectedCommanderCard(null);

        if (commanderDebounceRef.current) {
            clearTimeout(commanderDebounceRef.current);
        }

        const trimmed = val.trim();
        if (trimmed.length < 2) {
            setCommanderCardSuggestions([]);
            setIsSearchingCommander(false);
            return;
        }

        setIsSearchingCommander(true);
        commanderDebounceRef.current = setTimeout(async () => {
            const results = await searchCommanderCards(trimmed);
            setCommanderCardSuggestions(results.slice(0, 10));
            setIsSearchingCommander(false);
        }, 150);
    };

    // Selecting a commander card sets name, art, and color identity automatically
    const handleSelectCommanderCard = (card: ScryfallCard) => {
        setNewCommanderName(card.name);
        setSelectedCommanderCard(card);
        setNewColorIdentity(card.color_identity || []);
        if (!newDeckName.trim()) {
            setNewDeckName(card.name);
        }
        setCommanderCardSuggestions([]);
    };

    // Fallback commander selection
    const handleSelectCommander = async (name: string) => {
        setNewCommanderName(name);
        setCommanderCardSuggestions([]);
        const card = await getCardByName(name, false);
        if (card) {
            setSelectedCommanderCard(card);
            setNewColorIdentity(card.color_identity || []);
            if (!newDeckName.trim()) {
                setNewDeckName(card.name);
            }
        }
    };

    // Toggle color in color identity
    const toggleColor = (code: string) => {
        if (code === 'C') {
            setNewColorIdentity([]);
            return;
        }
        setNewColorIdentity(prev => 
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev.filter(c => c !== 'C'), code]
        );
    };

    // Add new Commander Deck
    const handleAddDeck = () => {
        if (!newCommanderName.trim()) return;

        const deckName = newDeckName.trim() || newCommanderName.trim();
        const commanderImg = selectedCommanderCard?.image_uris?.art_crop 
            || selectedCommanderCard?.image_uris?.normal 
            || selectedCommanderCard?.card_faces?.[0]?.image_uris?.art_crop
            || selectedCommanderCard?.card_faces?.[0]?.image_uris?.normal
            || '';

        const newDeck: CommanderDeck = {
            id: `deck_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: deckName,
            commanderName: newCommanderName.trim(),
            colorIdentity: newColorIdentity,
            imageUrl: commanderImg,
            isCommander: true,
            IsCommander: true,
            cardsAdded: []
        };

        const updated = [...decks, newDeck].sort((a, b) => 
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );

        setDecks(updated);
        setNewCommanderName('');
        setNewDeckName('');
        setNewColorIdentity([]);
        setSelectedCommanderCard(null);
    };

    // Delete a deck
    const handleDeleteDeck = (id: string) => {
        setDecks(prev => prev.filter(d => d.id !== id));
        if (selectedDeckIdForBbCode === id) {
            setSelectedDeckIdForBbCode('');
            setGeneratedBbCode('');
        }
    };

    // Delete all decks
    const handleDeleteAllDecks = () => {
        if (window.confirm("Are you sure you want to delete all decks? This cannot be undone.")) {
            setDecks([]);
            setSelectedDeckIdForBbCode('');
            setGeneratedBbCode('');
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    // Import decks from API
    const [isImportingFromApi, setIsImportingFromApi] = useState(false);
    const [apiImportMessage, setApiImportMessage] = useState<string | null>(null);

    const handleImportFromApi = async () => {
        const targetUser = (importUsername || user?.username || savedUsername || '').trim();
        if (!targetUser && !isLoggedIn) {
            setApiImportMessage('Please enter your Deck Builder username or log in to import your decks.');
            setShowUserOverride(true);
            return;
        }

        setIsImportingFromApi(true);
        setApiImportMessage(null);
        try {
            const url = targetUser
                ? `${apiPaths.DeckBuilderDecks}?username=${encodeURIComponent(targetUser)}`
                : apiPaths.DeckBuilderDecks;

            const headers = AuthService.getAuthHeaders();
            if (targetUser) {
                headers['X-Username'] = targetUser;
            }

            const res = await fetch(url, { headers });
            if (!res.ok) {
                throw new Error(`API error: ${res.statusText}`);
            }
            const data = await res.json();
            const rawDecks = Array.isArray(data) ? data : (data.decks || data.data || []);

            if (rawDecks.length === 0) {
                setApiImportMessage(
                    targetUser
                        ? `No decks found for user "${targetUser}". Check username or ensure decks are created in MTG Deck Builder.`
                        : 'No decks found in API response.'
                );
                return;
            }

            if (targetUser) {
                setSavedUsername(targetUser);
            }

            const updated = [...decks];
            let addedCount = 0;
            let updatedCount = 0;

            for (const item of rawDecks) {
                const deckName = item.deckName || item.name || 'Unnamed Deck';
                const commander = item.commander || item.commanderName || item.commanderCard || '';
                const existingIdx = updated.findIndex(d => 
                    d.id === (item.deckId || item.id) || 
                    d.name.toLowerCase() === deckName.toLowerCase()
                );

                const rawCardList: any[] = item.cards || item.deckCards || item.cardList || [];

                // Filter out maybeboard cards and ensure only commander, mainboard, and sideboard cards are kept
                const isAllowedBoard = (c: any) => {
                    const rawCat = (c.category || c.Category || c.board || c.Board || '').toString().toLowerCase().trim();
                    // Explicitly reject maybeboard
                    if (rawCat.includes('maybe')) {
                        return false;
                    }
                    // Commander is allowed
                    if (Boolean(c.isCommander || c.IsCommander) || rawCat.includes('cmdr') || rawCat.includes('commander')) {
                        return true;
                    }
                    // Sideboard is allowed
                    if (rawCat.includes('side')) {
                        return true;
                    }
                    // Mainboard is allowed (default if category empty or 'main'/'deck')
                    if (rawCat.includes('main') || rawCat === '' || rawCat === 'deck') {
                        return true;
                    }
                    return false;
                };

                const normalizeCategory = (c: any, isCmdr: boolean): string => {
                    if (isCmdr) return 'Commander';
                    const rawCat = (c.category || c.Category || c.board || c.Board || '').toString().toLowerCase().trim();
                    if (rawCat.includes('side')) return 'Sideboard';
                    return 'Main';
                };

                const filteredRawCards = rawCardList.filter(isAllowedBoard);

                const mappedCards: DeckCardItem[] = filteredRawCards.map((c: any, i: number) => {
                    const cardName = ((c.cardName || c.name || c.CardName || '') as string).trim();
                    const isCmdr = Boolean(c.isCommander || c.IsCommander) || 
                        (c.category || c.Category || c.board || c.Board || '').toString().toLowerCase().includes('commander') ||
                        Boolean(commander.length > 0 && cardName.toLowerCase() === commander.toLowerCase());
                    const category = normalizeCategory(c, isCmdr);

                    return {
                        id: (c.id || c.cardId || `card_${i}_${cardName}`) as string,
                        name: cardName,
                        cmc: Number(c.cmc || c.manaValue || 0),
                        manaCost: (c.manaCost || c.mana_cost || '') as string,
                        colors: (c.colors || []) as string[],
                        colorIdentity: (c.colorIdentity || c.color_identity || []) as string[],
                        typeLine: (c.typeLine || c.type_line || '') as string,
                        imageUrl: (c.imageUrl || c.image_url || '') as string,
                        quantity: Number(c.quantity || c.Quantity || c.count || c.Count || 1),
                        category: category,
                        scryfallId: (c.scryfallId || c.scryfall_id || '') as string,
                        isCommander: isCmdr,
                        IsCommander: isCmdr
                    };
                }).filter(c => c.name.trim().length > 0);

                // Ensure the Commander is always present in the deck cards if specified
                if (commander && !mappedCards.some(c => c.isCommander || c.name.toLowerCase() === commander.toLowerCase())) {
                    mappedCards.unshift({
                        id: `commander_${item.deckId || item.id || Date.now()}_${commander.replace(/\s+/g, '_')}`,
                        name: commander,
                        cmc: 0,
                        manaCost: '',
                        colors: (Array.isArray(item.commanderColorIdentity) ? item.commanderColorIdentity : []) as string[],
                        colorIdentity: (Array.isArray(item.commanderColorIdentity) ? item.commanderColorIdentity : []) as string[],
                        typeLine: 'Legendary Creature',
                        imageUrl: item.commanderArtUrl || item.coverCardUrl || '',
                        quantity: 1,
                        category: 'Commander',
                        scryfallId: '',
                        isCommander: true,
                        IsCommander: true
                    });
                }

                const enrichedMappedCards = await enrichDeckCardsFromScryfall(mappedCards);

                // Identify commander card and resolve effective commander name
                const commanderCardFromCards = enrichedMappedCards.find(c => c.isCommander);
                const effectiveCommanderName = (commander || commanderCardFromCards?.name || '').trim();

                let colors: string[] = Array.isArray(item.commanderColorIdentity) && item.commanderColorIdentity.length > 0
                    ? item.commanderColorIdentity
                    : [];
                let img = item.commanderArtUrl || item.coverCardUrl || '';

                if (commanderCardFromCards) {
                    if (colors.length === 0 && commanderCardFromCards.colorIdentity && commanderCardFromCards.colorIdentity.length > 0) {
                        colors = commanderCardFromCards.colorIdentity;
                    }
                    if (colors.length === 0 && commanderCardFromCards.colors && commanderCardFromCards.colors.length > 0) {
                        colors = commanderCardFromCards.colors;
                    }
                    if (!img && commanderCardFromCards.imageUrl) {
                        img = commanderCardFromCards.imageUrl;
                    }
                }

                if (effectiveCommanderName && (colors.length === 0 || !img)) {
                    const card = await getCardByName(effectiveCommanderName);
                    if (card) {
                        if (colors.length === 0) colors = card.color_identity || [];
                        if (!img) img = card.image_uris?.art_crop || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.art_crop || card.card_faces?.[0]?.image_uris?.normal || '';
                    }
                }

                if (existingIdx !== -1) {
                    const existing = updated[existingIdx];
                    updated[existingIdx] = {
                        ...existing,
                        name: deckName,
                        commanderName: effectiveCommanderName || existing.commanderName || deckName,
                        colorIdentity: colors.length > 0 ? colors : (existing.colorIdentity && existing.colorIdentity.length > 0 ? existing.colorIdentity : colors),
                        imageUrl: img || existing.imageUrl || '',
                        deckCards: enrichedMappedCards
                    };
                    updatedCount++;
                } else {
                    updated.push({
                        id: item.deckId || item.id || `deck_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: deckName,
                        commanderName: effectiveCommanderName || deckName,
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
            setApiImportMessage(`Successfully imported ${addedCount} new deck(s) and synced ${updatedCount} existing deck(s) for @${targetUser || user?.username || 'user'}!`);
            setTimeout(() => setApiImportMessage(null), 5000);
        } catch (err: unknown) {
            console.error('Import from API failed:', err);
            const msg = err instanceof Error ? err.message : 'Failed to import decks from API.';
            setApiImportMessage(msg);
            setTimeout(() => setApiImportMessage(null), 5000);
        } finally {
            setIsImportingFromApi(false);
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
        const totalCount = decks.reduce((acc, d) => acc + (d.cardsAdded ? d.cardsAdded.length : 0), 0);
        if (totalCount === 0) return;
        if (window.confirm(`Are you sure you want to clear all ${totalCount} card evaluations from all decks? This cannot be undone.`)) {
            setDecks(prev => prev.map(deck => ({
                ...deck,
                cardsAdded: []
            })));
            setGeneratedBbCode('');
        }
    };


    // Generate BBCode for MTGNexus with dynamic API headers
    const handleGenerateBbCode = async (deckId: string) => {
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;

        setIsGeneratingBbCode(true);

        const colorCombo = deck.colorIdentity.length > 0 ? deck.colorIdentity.join('') : 'C';
        const headers = await fetchSetReviewHeadersFromApi(colorCombo);

        const cards = deck.cardsAdded || [];

        const whiteCards: DeckCardEvaluation[] = [];
        const blueCards: DeckCardEvaluation[] = [];
        const blackCards: DeckCardEvaluation[] = [];
        const redCards: DeckCardEvaluation[] = [];
        const greenCards: DeckCardEvaluation[] = [];
        const multicolorCards: DeckCardEvaluation[] = [];
        const colorlessCards: DeckCardEvaluation[] = [];

        cards.forEach(card => {
            const colors = card.colorIdentity || [];
            if (colors.length > 1) {
                multicolorCards.push(card);
            } else if (colors.length === 0) {
                colorlessCards.push(card);
            } else {
                switch (colors[0]) {
                    case 'W': whiteCards.push(card); break;
                    case 'U': blueCards.push(card); break;
                    case 'B': blackCards.push(card); break;
                    case 'R': redCards.push(card); break;
                    case 'G': greenCards.push(card); break;
                    default: colorlessCards.push(card); break;
                }
            }
        });

        const sortByName = (a: DeckCardEvaluation, b: DeckCardEvaluation) => a.cardName.localeCompare(b.cardName);
        whiteCards.sort(sortByName);
        blueCards.sort(sortByName);
        blackCards.sort(sortByName);
        redCards.sort(sortByName);
        greenCards.sort(sortByName);
        multicolorCards.sort(sortByName);
        colorlessCards.sort(sortByName);

        const lines: string[] = [];

        if (globalReviewIntro && globalReviewIntro.trim()) {
            lines.push(globalReviewIntro.trim());
            lines.push('');
        }

        const formatSection = (headerBb: string, sectionCards: DeckCardEvaluation[]) => {
            if (sectionCards.length === 0) return;
            lines.push(headerBb);
            lines.push('');
            sectionCards.forEach(c => {
                lines.push(`[cards]${c.cardName}[/cards] - ${c.comments}`);
            });
            lines.push('');
        };

        formatSection(headers.White, whiteCards);
        formatSection(headers.Blue, blueCards);
        formatSection(headers.Black, blackCards);
        formatSection(headers.Red, redCards);
        formatSection(headers.Green, greenCards);
        formatSection(headers.Multicolor, multicolorCards);
        formatSection(headers.Colorless, colorlessCards);

        if (lines.length === 0) {
            setGeneratedBbCode(`No card evaluations added to "${deck.name}" yet.`);
        } else {
            setGeneratedBbCode(lines.join('\n').trim());
        }

        setIsGeneratingBbCode(false);
    };

    // Alphabetical decks
    const sortedDecks = decks;

    // Auto-select first deck for BBCode if none selected
    useEffect(() => {
        if (!selectedDeckIdForBbCode && sortedDecks.length > 0) {
            setSelectedDeckIdForBbCode(sortedDecks[0].id);
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

            {/* TAB 2: MY DECKS (CRUD & MANAGEMENT) */}
            {activeTab === 'decks' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    {/* Add / Import Section */}
                    <div className="glass rounded-[2rem] p-6 border border-purple-500/20 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-500/20 pb-4">
                            <div>
                                <h3 className="text-xl font-black uppercase text-white">Create or Import Commander Deck</h3>
                                <p className="text-xs text-slate-400">
                                    Commander search enforces <strong className="text-purple-300 font-mono">IsCommander: true</strong>. Add your decks or sync with your deckbuilder.
                                </p>
                            </div>

                            {/* Deck Import Controls: User pill / Input + Import button */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                {isLoggedIn && user && !showUserOverride ? (
                                    <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-purple-200">
                                        <div className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-200">
                                            {user.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span>User: <strong className="text-white">@{user.username}</strong></span>
                                        <button
                                            type="button"
                                            onClick={() => setShowUserOverride(true)}
                                            className="text-[10px] text-purple-400 hover:text-purple-300 underline ml-1 cursor-pointer"
                                            title="Import decks for another user"
                                        >
                                            Switch
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 bg-slate-950/60 border border-purple-500/20 rounded-xl px-2.5 py-1 text-xs">
                                        <User size={13} className="text-slate-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={importUsername}
                                            onChange={(e) => setImportUsername(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleImportFromApi();
                                            }}
                                            placeholder="Deckbuilder username..."
                                            className="bg-transparent border-none text-white text-xs outline-none w-36 sm:w-40 placeholder:text-slate-500"
                                        />
                                        {!isLoggedIn && (
                                            <button
                                                type="button"
                                                onClick={() => setIsSetReviewAuthModalOpen(true)}
                                                className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold px-1.5 py-0.5 rounded bg-purple-950/50 hover:bg-purple-900/50 border border-purple-500/30 shrink-0 transition-colors cursor-pointer"
                                            >
                                                Log In
                                            </button>
                                        )}
                                        {showUserOverride && isLoggedIn && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowUserOverride(false);
                                                    if (user?.username) setImportUsername(user.username);
                                                }}
                                                className="text-[10px] text-slate-400 hover:text-white shrink-0 ml-1 cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleImportFromApi}
                                    disabled={isImportingFromApi}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                                >
                                    <RefreshCw size={14} className={isImportingFromApi ? 'animate-spin' : ''} />
                                    <span>{isImportingFromApi ? 'Importing Decks...' : 'Import Decks'}</span>
                                </button>
                            </div>
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
                                    <span className="absolute right-3 top-9 text-xs text-purple-400 animate-spin">↻</span>
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
                                        {(() => {
                                            const cleanDeckCards = (deck.deckCards || []).filter(c => !(c.category || '').toLowerCase().includes('maybe'));
                                            const totalDeckQuantity = cleanDeckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
                                            if (cleanDeckCards.length === 0) return null;

                                            return (
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
                                                                {totalDeckQuantity} cards {expandedCommanderDecklistId === deck.id ? '▲' : '▼'}
                                                            </span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setGalleryModalDeck({ ...deck, deckCards: cleanDeckCards })}
                                                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-500/35 text-indigo-200 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0"
                                                            title={`Open full visual card gallery for ${deck.name} to view and read all cards in a grid`}
                                                        >
                                                            <Eye size={12} className="text-indigo-400" />
                                                            <span>Visual Grid</span>
                                                        </button>
                                                    </div>

                                                    {expandedCommanderDecklistId === deck.id && (
                                                        <DeckCardsBreakdown
                                                            cards={cleanDeckCards}
                                                            deck={deck}
                                                            deckName={deck.name}
                                                            maxHeightClass="max-h-64"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })()}

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

            {/* TAB 3: SET REVIEW BBCODE GENERATION */}
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

            {/* Set Review Auth Modal */}
            <AuthModal
                isOpen={isSetReviewAuthModalOpen}
                onClose={() => setIsSetReviewAuthModalOpen(false)}
            />
        </div>
    );
}
