import config from '../appsettings.json';

export const ToolTypeCodes = {
    SetReview: 2,
    GameSummary: 3
} as const;

const rawBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? config.remoteurl : (config.localurl || config.url));
export const apiBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const apiPaths = {
    Root: `${apiBaseUrl}/${config.mtgtoolsendpoint}`,
    GetBbCode: `${apiBaseUrl}/${config.mtgtoolsendpoint}/getbbcode`,
    DeckColors: `${apiBaseUrl}/${config.mtgtoolsendpoint}/deckcolors`,
    ParseMtgoLog: `${apiBaseUrl}/${config.mtgtoolsendpoint}/parsemtgolog`,
    DeckBuilderDecks: `${apiBaseUrl}/deckbuilder/decks`,
    SecurityLogin: `${apiBaseUrl}/security/login`,
    SecurityGoogleLogin: `${apiBaseUrl}/security/google-login`,
    SecurityRegister: `${apiBaseUrl}/security/register`,
    SecurityValidate: `${apiBaseUrl}/security/validate`,
    SecurityUsers: `${apiBaseUrl}/security/users`,
} as const;
