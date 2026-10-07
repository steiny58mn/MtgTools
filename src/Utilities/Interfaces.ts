export interface DeckCardItem {
    id: string;
    name: string;
    cmc: number;
    manaCost?: string;
    colors?: string[];
    colorIdentity?: string[];
    typeLine?: string;
    imageUrl?: string;
    quantity?: number;
    category?: string;
    scryfallId?: string;
    isCommander?: boolean;
    IsCommander?: boolean;
}

export interface CommanderDeck {
    id: string;
    name: string;
    commanderName: string;
    colorIdentity: string[];
    partnerName?: string;
    imageUrl?: string;
    nexusThreadUrl?: string;
    cardsAdded?: DeckCardEvaluation[];
    isCommander?: boolean;
    IsCommander?: boolean;
    deckCards?: DeckCardItem[];
}

export interface DeckCardEvaluation {
    id: string;
    cardName: string;
    comments: string;
    dateAdded: string;
    imageUrl?: string;
    isCommander?: boolean;
    IsCommander?: boolean;
    colorIdentity?: string[];
    manaCost?: string;
    typeLine?: string;
}

export interface ScryfallSet {
    id: string;
    code: string;
    name: string;
    set_type: string;
    released_at?: string;
    card_count: number;
    icon_svg_uri?: string;
    digital?: boolean;
}

export interface ScryfallCard {
    id: string;
    name: string;
    mana_cost?: string;
    type_line?: string;
    color_identity: string[];
    colors?: string[];
    oracle_text?: string;
    flavor_text?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    rarity?: string;
    set?: string;
    set_name?: string;
    collector_number?: string;
    reprint?: boolean;
    layout?: string;
    isCommander?: boolean;
    IsCommander?: boolean;
    image_uris?: {
        small?: string;
        normal?: string;
        large?: string;
        png?: string;
        art_crop?: string;
        border_crop?: string;
    };
    card_faces?: Array<{
        name?: string;
        mana_cost?: string;
        type_line?: string;
        oracle_text?: string;
        flavor_text?: string;
        power?: string;
        toughness?: string;
        loyalty?: string;
        colors?: string[];
        image_uris?: {
            small?: string;
            normal?: string;
            large?: string;
            png?: string;
            art_crop?: string;
            border_crop?: string;
        };
    }>;
}
