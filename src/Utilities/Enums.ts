import config from '../appsettings.json';

export const ToolTypeCodes = {
    SetReview: 2,
    GameSummary: 3
} as const;

const rawBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? config.remoteurl : (config.localurl || config.url));
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export const apiPaths = {
    Root: `${baseUrl}/${config.mtgtoolsendpoint}`,
    GetBbCode: `${baseUrl}/${config.mtgtoolsendpoint}/getbbcode`,
    DeckColors: `${baseUrl}/${config.mtgtoolsendpoint}/deckcolors`,
    ParseMtgoLog: `${baseUrl}/${config.mtgtoolsendpoint}/parsemtgolog`,
    DeckBuilderDecks: `${baseUrl}/deckbuilder/decks`,
} as const;
