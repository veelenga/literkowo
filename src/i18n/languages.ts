export const UI_LANGUAGES = ['pl', 'uk'] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];
export const DEFAULT_UI_LANGUAGE: UiLanguage = 'pl';
export const UI_LANGUAGE_LABELS: Readonly<Record<UiLanguage, string>> = { pl: 'PL', uk: 'UA' };
