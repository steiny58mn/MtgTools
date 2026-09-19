import config from '../appsettings.json';

export const ToolTypeCodes = {
    DeckUpdates: 1,
    SetReview: 2,
    GameSummary: 3
} as const

const rawBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? config.remoteurl : (config.localurl || config.url));
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export const apiPaths = {
    Root: `${baseUrl}/${config.mtgtoolsendpoint}`,
    GetBbCode: `${baseUrl}/${config.mtgtoolsendpoint}/getbbcode`,
    FormatText: `${baseUrl}/${config.mtgtoolsendpoint}/formattext`,
    DeckColors: `${baseUrl}/${config.mtgtoolsendpoint}/deckcolors`,
    CreateDecklist: `${baseUrl}/${config.mtgtoolsendpoint}/createdecklist`,
    UpdateDb: `${baseUrl}/${config.mtgtoolsendpoint}/updatedb`,
    CompareFiles: `${baseUrl}/${config.mtgtoolsendpoint}/comparefiles`,
    Test: `${baseUrl}/${config.mtgtoolsendpoint}/test`,
    ParseMtgoLog: `${baseUrl}/${config.mtgtoolsendpoint}/parsemtgolog`,
    CreateDeckPicklist: `${baseUrl}/${config.mtgtoolsendpoint}/createdeckpicklist`,
} as const
