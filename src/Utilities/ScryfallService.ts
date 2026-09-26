import type { ScryfallSet, ScryfallCard, DeckCardItem } from './Interfaces';

const SCRYFALL_BASE = 'https://api.scryfall.com';

export type ColorCategory = 'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless' | 'Lands';

export const COLOR_CATEGORIES: ColorCategory[] = [
    'White',
    'Blue',
    'Black',
    'Red',
    'Green',
    'Multicolor',
    'Colorless',
    'Lands'
];

/**
 * Standard MTG Color identity nickname mappings
 */
export const COLOR_IDENTITY_NICKNAMES: Record<string, string> = {
    // 0 Colors
    '': 'Colorless',

    // 1 Color (Monocolor)
    'W': 'Mono-White',
    'U': 'Mono-Blue',
    'B': 'Mono-Black',
    'R': 'Mono-Red',
    'G': 'Mono-Green',

    // 2 Colors (Guilds) - WUBRG order & conventional aliases
    'WU': 'Azorius',
    'UW': 'Azorius',
    'WB': 'Orzhov',
    'BW': 'Orzhov',
    'WR': 'Boros',
    'RW': 'Boros',
    'WG': 'Selesnya',
    'GW': 'Selesnya',
    'UB': 'Dimir',
    'BU': 'Dimir',
    'UR': 'Izzet',
    'RU': 'Izzet',
    'UG': 'Simic',
    'GU': 'Simic',
    'BR': 'Rakdos',
    'RB': 'Rakdos',
    'BG': 'Golgari',
    'GB': 'Golgari',
    'RG': 'Gruul',
    'GR': 'Gruul',

    // 3 Colors (Shards & Wedges) - WUBRG order & conventional aliases
    'WUG': 'Bant',
    'GWU': 'Bant',
    'WUB': 'Esper',
    'UBR': 'Grixis',
    'BRG': 'Jund',
    'WRG': 'Naya',
    'RGW': 'Naya',
    'WBG': 'Abzan',
    'WUR': 'Jeskai',
    'URW': 'Jeskai',
    'UBG': 'Sultai',
    'BGU': 'Sultai',
    'WBR': 'Mardu',
    'RWB': 'Mardu',
    'URG': 'Temur',
    'GUR': 'Temur',

    // 4 Colors (Nephilim) - WUBRG order & conventional aliases
    'UBRG': 'Glint-Eye / Chaos',
    'WBRG': 'Dune-Brood / Aggression',
    'BRGW': 'Dune-Brood / Aggression',
    'WURG': 'Ink-Treader / Altruism',
    'RGWU': 'Ink-Treader / Altruism',
    'WUBG': 'Witch-Maw / Growth',
    'GWUB': 'Witch-Maw / Growth',
    'WUBR': 'Yore-Tiller / Artifice',

    // 5 Colors
    'WUBRG': 'Five-Color'
};

const WUBRG_ORDER: Record<string, number> = { W: 1, U: 2, B: 3, R: 4, G: 5 };

/**
 * Normalizes any color collection (array or string, in any order or permutation) to WUBRG order
 * and returns the canonical MTG nickname (e.g. ['W', 'B', 'R'], ['R', 'W', 'B'], or 'WBR' -> 'Mardu').
 */
export function getColorComboNickname(colors: string[] | string): string {
    if (!colors) return 'Colorless';

    // Normalize input to array of uppercase characters
    const rawChars: string[] = Array.isArray(colors)
        ? colors.map(c => String(c).trim().toUpperCase()).join('').split('')
        : String(colors).trim().toUpperCase().split('');

    // Extract unique valid WUBRG color symbols
    const colorSet = new Set<string>();
    for (const char of rawChars) {
        if (WUBRG_ORDER[char] !== undefined) {
            colorSet.add(char);
        }
    }

    if (colorSet.size === 0) return 'Colorless';

    // Sort by canonical WUBRG order (W=1, U=2, B=3, R=4, G=5)
    const sortedWubrg = Array.from(colorSet)
        .sort((a, b) => WUBRG_ORDER[a] - WUBRG_ORDER[b])
        .join('');

    return COLOR_IDENTITY_NICKNAMES[sortedWubrg] || (sortedWubrg ? sortedWubrg : 'Colorless');
}

/**
 * Fetches all official Scryfall sets, filtered and sorted with newest released first.
 */
export async function getScryfallSets(): Promise<ScryfallSet[]> {
    try {
        const response: Response = await fetch(`${SCRYFALL_BASE}/sets`);
        if (!response.ok) {
            throw new Error(`Failed to fetch sets: ${response.statusText}`);
        }
        const data: any = await response.json();
        const sets: ScryfallSet[] = data.data || [];

        // Exclude purely digital / promo / memorabilia sets that aren't real card releases
        const validTypes = new Set([
            'core',
            'expansion',
            'masters',
            'commander',
            'draft_innovation',
            'funny',
            'box',
            'starter'
        ]);

        return sets
            .filter(set => !set.digital && validTypes.has(set.set_type) && set.card_count > 0)
            .sort((a, b) => {
                const dateA = a.released_at ? new Date(a.released_at).getTime() : 0;
                const dateB = b.released_at ? new Date(b.released_at).getTime() : 0;
                return dateB - dateA; // Most recent on top
            });
    } catch (error) {
        console.error('Error in getScryfallSets:', error);
        return [];
    }
}

/**
 * Fetches cards for one or more selected sets.
 * Handles Scryfall pagination automatically.
 * Supports toggling reprints (is:reprint vs not:reprint).
 */
export async function getCardsForSets(
    setCodes: string[],
    includeReprints: boolean = false,
    onProgress?: (loaded: number, total: number) => void,
    signal?: AbortSignal
): Promise<ScryfallCard[]> {
    if (!setCodes || setCodes.length === 0) {
        return [];
    }

    try {
        const setQuery = setCodes.length === 1 
            ? `e:${setCodes[0]}` 
            : `(${setCodes.map(code => `e:${code}`).join(' or ')})`;

        const reprintQuery = includeReprints ? '' : ' not:reprint';
        const fullQuery = `${setQuery}${reprintQuery} not:digital not:token`;

        let url: string | null = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(fullQuery)}&order=name`;
        const allCards: ScryfallCard[] = [];
        let totalCards = 0;

        let pagesFetched = 0;
        const maxPages = 15;

        while (url && pagesFetched < maxPages) {
            if (signal?.aborted) break;

            const res: Response = await fetch(url, { signal });
            if (!res.ok) {
                if (res.status === 404) break; // No cards found
                throw new Error(`Scryfall search error: ${res.statusText}`);
            }

            const pageData: any = await res.json();
            if (pageData.total_cards && typeof pageData.total_cards === 'number') {
                totalCards = pageData.total_cards;
            }

            if (pageData.data && Array.isArray(pageData.data)) {
                allCards.push(...pageData.data);
            }

            if (onProgress) {
                onProgress(allCards.length, totalCards || allCards.length);
            }

            url = pageData.has_more ? pageData.next_page : null;
            pagesFetched++;

            if (url) {
                await new Promise(r => setTimeout(r, 75));
            }
        }

        return allCards;
    } catch (error: any) {
        if (error?.name === 'AbortError') {
            return [];
        }
        console.error('Error fetching cards for sets:', error);
        return [];
    }
}

/**
 * Autocomplete card names from Scryfall
 */
// In-memory cache for fast autocomplete
const autocompleteCache = new Map<string, string[]>();

export function getCachedAutocomplete(query: string): string[] | undefined {
    const trimmed = query?.trim().toLowerCase();
    if (!trimmed) return undefined;
    return autocompleteCache.get(trimmed);
}

export async function autocompleteCards(query: string): Promise<string[]> {
    const trimmed = query?.trim().toLowerCase();
    if (!trimmed || trimmed.length < 1) return [];

    if (autocompleteCache.has(trimmed)) {
        return autocompleteCache.get(trimmed)!;
    }

    try {
        const response: Response = await fetch(`${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(trimmed)}`);
        if (!response.ok) return [];
        const data: any = await response.json();
        const results: string[] = data.data || [];
        autocompleteCache.set(trimmed, results);
        return results;
    } catch (error) {
        console.error('Error autocompleting cards:', error);
        return [];
    }
}

/**
 * Searches cards by text query and ensures only cards with IsCommander (legendary creatures, planeswalkers that can be commander)
 * are returned when forCommander is true.
 */
export async function searchCommanderCards(query: string): Promise<ScryfallCard[]> {
    if (!query || query.trim().length < 2) return [];

    try {
        const commanderQuery = `${query.trim()} is:commander not:digital`;
        const response: Response = await fetch(`${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(commanderQuery)}&order=name`);
        if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Scryfall error: ${response.statusText}`);
        }
        const data: any = await response.json();
        const cards: ScryfallCard[] = data.data || [];

        // Flag IsCommander explicitly as true
        return cards.map(c => ({
            ...c,
            isCommander: true,
            IsCommander: true
        }));
    } catch (error) {
        console.error('Error searching commanders:', error);
        return [];
    }
}

/**
 * Retrieves a single card by exact or fuzzy name.
 */
export async function getCardByName(name: string, exact: boolean = true): Promise<ScryfallCard | null> {
    if (!name || !name.trim()) return null;

    try {
        const endpoint = exact ? 'exact' : 'fuzzy';
        const response: Response = await fetch(`${SCRYFALL_BASE}/cards/named?${endpoint}=${encodeURIComponent(name.trim())}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching card by name:', error);
        return null;
    }
}

/**
 * Returns canonical WUBRG order string for a card's color identity (e.g. ['U', 'W'] -> 'WU')
 */
export function getCanonicalColorIdentityString(colorIdentity: string[]): string {
    if (!colorIdentity || colorIdentity.length === 0) return 'C';
    return [...colorIdentity]
        .map(c => c.toUpperCase())
        .filter(c => WUBRG_ORDER[c] !== undefined)
        .sort((a, b) => WUBRG_ORDER[a] - WUBRG_ORDER[b])
        .join('');
}

/**
 * Checks whether a card is a Land (including DFCs where either face is a land).
 */
export function isLandCard(card: ScryfallCard): boolean {
    if (card.type_line && /\bland\b/i.test(card.type_line)) {
        return true;
    }
    if (card.card_faces && card.card_faces.some(f => f.type_line && /\bland\b/i.test(f.type_line))) {
        return true;
    }
    return false;
}

/**
 * Returns the section category for a card:
 * - Lands: All lands (even if they have colors) are grouped into Lands at the end.
 * - Colorless: Colorless cards that are NOT lands.
 * - White, Blue, Black, Red, Green: Monocolored non-land cards.
 * - Multicolor: Cards with >1 color.
 */
export function getCardColorCategory(card: ScryfallCard): ColorCategory {
    // Lands always go to their own section at the end, even if they have a color
    if (isLandCard(card)) {
        return 'Lands';
    }

    const colors = card.colors ?? (card.card_faces && card.card_faces[0]?.colors) ?? [];

    if (colors.length === 0) {
        return 'Colorless';
    }

    if (colors.length === 1) {
        switch (colors[0].toUpperCase()) {
            case 'W': return 'White';
            case 'U': return 'Blue';
            case 'B': return 'Black';
            case 'R': return 'Red';
            case 'G': return 'Green';
            default: return 'Colorless';
        }
    }

    return 'Multicolor';
}

/**
 * Groups cards by section: White, Blue, Black, Red, Green, Multicolor, Colorless (non-land), Lands.
 * Within each section, sorts cards alphabetically by name.
 */
export function groupAndSortCardsByColor(cards: ScryfallCard[]): Record<ColorCategory, ScryfallCard[]> {
    const grouped: Record<ColorCategory, ScryfallCard[]> = {
        'White': [],
        'Blue': [],
        'Black': [],
        'Red': [],
        'Green': [],
        'Multicolor': [],
        'Colorless': [],
        'Lands': []
    };

    for (const card of cards) {
        const cat = getCardColorCategory(card);
        grouped[cat].push(card);
    }

    // Sort cards alphabetically by name within each color
    for (const cat of COLOR_CATEGORIES) {
        grouped[cat].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    return grouped;
}

/**
 * Determines whether a card can fit in a Commander deck based on Color Identity.
 * A card is compatible if all colors in its color identity are present in the Commander deck's color identity.
 * Colorless cards (empty color identity) fit in every Commander deck.
 */
export function isCardCompatibleWithDeck(cardColorIdentity: string[], deckColorIdentity: string[]): boolean {
    if (!cardColorIdentity || cardColorIdentity.length === 0) {
        return true;
    }
    const deckSet = new Set(deckColorIdentity.map(c => c.toUpperCase()));
    return cardColorIdentity.every(color => deckSet.has(color.toUpperCase()));
}

/**
 * Returns any colors in the card's color identity that the deck does not support.
 */
export function getMissingColors(cardColorIdentity: string[], deckColorIdentity: string[]): string[] {
    const deckSet = new Set((deckColorIdentity || []).map(c => c.toUpperCase()));
    return (cardColorIdentity || []).filter(c => !deckSet.has(c.toUpperCase()));
}

/**
 * Generates Set Review color headers using the existing MTG Tools API backend.
 * Falls back to styled defaults if endpoint is not reachable.
 */
export async function fetchSetReviewHeadersFromApi(colorCombo: string): Promise<Record<string, string>> {
    const fallbackHeaders: Record<string, string> = {
        White: `[CENTER][HEADER style=White][SIZE=100]White Cards[/SIZE][/HEADER][/CENTER]`,
        Blue: `[CENTER][HEADER style=Blue][SIZE=100]Blue Cards[/SIZE][/HEADER][/CENTER]`,
        Black: `[CENTER][HEADER style=Black][SIZE=100]Black Cards[/SIZE][/HEADER][/CENTER]`,
        Red: `[CENTER][HEADER style=Red][SIZE=100]Red Cards[/SIZE][/HEADER][/CENTER]`,
        Green: `[CENTER][HEADER style=Green][SIZE=100]Green Cards[/SIZE][/HEADER][/CENTER]`,
        Multicolor: `[CENTER][HEADER style=${colorCombo}][SIZE=100]Multicolor Cards[/SIZE][/HEADER][/CENTER]`,
        Colorless: `[CENTER][HEADER style=Colorless][SIZE=100]Colorless and Land Cards[/SIZE][/HEADER][/CENTER]`
    };

    try {
        const res: Response = await fetch(`/api/SetReview?colorCombo=${encodeURIComponent(colorCombo)}`);
        if (!res.ok) return fallbackHeaders;
        const data: any = await res.json();
        return data || fallbackHeaders;
    } catch {
        return fallbackHeaders;
    }
}

export interface GroupedDeckCardColor {
    color: 'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless';
    cards: DeckCardItem[];
}

export interface GroupedDeckCardMv {
    manaValue: number;
    colorGroups: GroupedDeckCardColor[];
    totalCards: number;
}

/**
 * Groups deck cards by mana value (ascending), then colors (W, U, B, R, G, Multicolor, Colorless),
 * and sorts cards alphabetically within each color group.
 */
export function groupDeckCardsByCmcAndColor(cards: DeckCardItem[]): GroupedDeckCardMv[] {
    if (!cards || cards.length === 0) return [];

    // Group by mana value (0, 1, 2, 3...)
    const cmcMap = new Map<number, DeckCardItem[]>();
    for (const card of cards) {
        const cmc = Math.max(0, Math.floor(typeof card.cmc === 'number' ? card.cmc : parseFloat(card.cmc as any) || 0));
        if (!cmcMap.has(cmc)) {
            cmcMap.set(cmc, []);
        }
        cmcMap.get(cmc)!.push(card);
    }

    const sortedCmcs = Array.from(cmcMap.keys()).sort((a, b) => a - b);

    const colorOrder: ('White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless')[] = [
        'White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'
    ];

    const getCardColor = (c: DeckCardItem): 'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless' => {
        const colors = c.colors || [];
        if (colors.length === 0) return 'Colorless';
        if (colors.length > 1) return 'Multicolor';
        const code = colors[0].toUpperCase();
        if (code === 'W') return 'White';
        if (code === 'U') return 'Blue';
        if (code === 'B') return 'Black';
        if (code === 'R') return 'Red';
        if (code === 'G') return 'Green';
        return 'Colorless';
    };

    return sortedCmcs.map(mv => {
        const cardsAtMv = cmcMap.get(mv)!;
        const byColor = new Map<'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless', DeckCardItem[]>();

        for (const card of cardsAtMv) {
            const cat = getCardColor(card);
            if (!byColor.has(cat)) {
                byColor.set(cat, []);
            }
            byColor.get(cat)!.push(card);
        }

        const colorGroups: GroupedDeckCardColor[] = colorOrder
            .filter(col => byColor.has(col) && byColor.get(col)!.length > 0)
            .map(color => {
                const sortedCards = byColor.get(color)!.sort((a, b) => 
                    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                );
                return {
                    color,
                    cards: sortedCards
                };
            });

        return {
            manaValue: mv,
            colorGroups,
            totalCards: cardsAtMv.length
        };
    });
}

export type DeckCardCategory = 'White' | 'Blue' | 'Black' | 'Red' | 'Green' | 'Multicolor' | 'Colorless' | 'Lands';

export interface GroupedDeckCategory {
    category: DeckCardCategory;
    cards: DeckCardItem[];
    totalCards: number;
}

const COMMON_NON_LAND_0_DROPS = /\b(mox|lotus|petal|crypt|diamond|bauble|chalice|bone saw|spidersilk|shield|memnite|ornithopter|phyrexian walker|darksteel relic|everflowing chalice|tormod's crypt|welding jar|paradox engine|astrolabe|claws of gix|accorder's shield|chariot of victory|fountain of youth|gust-skimmer|jeweled|lions eye|mana crypt|mishra's bauble|urza's bauble|spellbook|zuran orb)\b/i;

/**
 * Checks whether a DeckCardItem is a Land.
 */
export function isDeckCardLand(card: DeckCardItem): boolean {
    if (card.typeLine && /\bland\b/i.test(card.typeLine)) {
        return true;
    }
    // Fallback heuristic if typeLine has not been fetched yet
    if (!card.typeLine) {
        const cmc = typeof card.cmc === 'number' ? card.cmc : parseFloat(card.cmc as any) || 0;
        const colors = card.colors || [];
        if (cmc === 0 && colors.length === 0 && !COMMON_NON_LAND_0_DROPS.test(card.name)) {
            return true;
        }
    }
    return false;
}

/**
 * Groups deck cards by Color -> Alphabetical, with Lands separate and showing up last.
 * Color order: White -> Blue -> Black -> Red -> Green -> Multicolor -> Colorless -> Lands.
 * Inside each category, cards are sorted alphabetically.
 */
export function groupDeckCardsByColor(cards: DeckCardItem[]): GroupedDeckCategory[] {
    if (!cards || cards.length === 0) return [];

    const categories: DeckCardCategory[] = [
        'White',
        'Blue',
        'Black',
        'Red',
        'Green',
        'Multicolor',
        'Colorless',
        'Lands'
    ];

    const categoryMap = new Map<DeckCardCategory, DeckCardItem[]>();
    for (const cat of categories) {
        categoryMap.set(cat, []);
    }

    for (const card of cards) {
        if (isDeckCardLand(card)) {
            categoryMap.get('Lands')!.push(card);
            continue;
        }

        const colors = card.colors || [];
        if (colors.length === 0) {
            categoryMap.get('Colorless')!.push(card);
        } else if (colors.length > 1) {
            categoryMap.get('Multicolor')!.push(card);
        } else {
            const code = colors[0].toUpperCase();
            switch (code) {
                case 'W': categoryMap.get('White')!.push(card); break;
                case 'U': categoryMap.get('Blue')!.push(card); break;
                case 'B': categoryMap.get('Black')!.push(card); break;
                case 'R': categoryMap.get('Red')!.push(card); break;
                case 'G': categoryMap.get('Green')!.push(card); break;
                default: categoryMap.get('Colorless')!.push(card); break;
            }
        }
    }

    return categories
        .filter(cat => (categoryMap.get(cat)?.length || 0) > 0)
        .map(cat => {
            const list = categoryMap.get(cat)!;
            list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
            return {
                category: cat,
                cards: list,
                totalCards: list.length
            };
        });
}

/**
 * Enriches an array of DeckCardItems with typeLine and colors from Scryfall collection API.
 */
export async function enrichDeckCardsFromScryfall(cards: DeckCardItem[]): Promise<DeckCardItem[]> {
    const missingCards = cards.filter(c => !c.typeLine && (c.scryfallId || c.name));
    if (missingCards.length === 0) return cards;

    const enrichedMap = new Map<string, { type_line: string; colors: string[] }>();

    // Chunk into batches of up to 75
    const batchSize = 75;
    for (let i = 0; i < missingCards.length; i += batchSize) {
        const batch = missingCards.slice(i, i + batchSize);
        const identifiers = batch.map(c => c.scryfallId ? { id: c.scryfallId } : { name: c.name });

        try {
            const res = await fetch('https://api.scryfall.com/cards/collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifiers })
            });
            if (res.ok) {
                const data = await res.json();
                for (const card of (data.data || [])) {
                    if (card.id) {
                        enrichedMap.set(card.id, {
                            type_line: card.type_line || '',
                            colors: card.colors || []
                        });
                    }
                    if (card.name) {
                        enrichedMap.set(card.name.toLowerCase(), {
                            type_line: card.type_line || '',
                            colors: card.colors || []
                        });
                    }
                }
            }
        } catch (e) {
            console.error('Error enriching cards from Scryfall collection:', e);
        }
    }

    return cards.map(c => {
        if (c.typeLine) return c;
        const info = (c.scryfallId ? enrichedMap.get(c.scryfallId) : null) || enrichedMap.get(c.name.toLowerCase());
        if (info) {
            return {
                ...c,
                typeLine: info.type_line,
                colors: (c.colors && c.colors.length > 0) ? c.colors : info.colors
            };
        }
        return c;
    });
}
