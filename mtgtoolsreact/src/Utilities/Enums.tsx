import config from '../appsettings.json';
export const ToolTypeCodes = {
    DeckUpdates: 1,
    SetReview: 2,
    GameSummary: 3
} as const

export const apiPaths = {
    Root: `${config.url}/${config.mtgtoolsendpoint}`,
    GetBbCode: `${config.url}/${config.mtgtoolsendpoint}/getbbcode`,
    FormatText: `${config.url}/${config.mtgtoolsendpoint}/formattext`,
    DeckColors: `${config.url}/${config.mtgtoolsendpoint}/deckcolors`,
    CreateDecklist: `${config.url}/${config.mtgtoolsendpoint}/createdecklist`,
    UpdateDb: `${config.url}/${config.mtgtoolsendpoint}/updatedb`,
    CompareFiles: `${config.url}/${config.mtgtoolsendpoint}/comparefiles`,
    Test: `${config.url}/${config.mtgtoolsendpoint}/test`,
    ParseMtgoLog: `${config.url}/${config.mtgtoolsendpoint}/parsemtgolog`,
    CreateDeckPicklist: `${config.url}/${config.mtgtoolsendpoint}/createdeckpicklist`,
} as const