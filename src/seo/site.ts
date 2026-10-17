export interface SiteImage {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

export interface LocalizedText {
  readonly lang: string;
  readonly text: string;
}

export const SITE_URL = 'https://veelenga.github.io/literkowo/';
export const SOURCE_URL = 'https://github.com/veelenga/literkowo';
export const SITE_NAME = 'Literkowo';
export const SITE_TITLE = `${SITE_NAME}: gra do nauki pisania na klawiaturze dla dzieci`;
export const SITE_DESCRIPTION =
  'Darmowa gra do nauki szybkiego, bezwzrokowego pisania dla dzieci od 9 lat. Nowy klawisz na każdym poziomie aż do polskich liter, przygoda 3D, bossowie i arena.';
export const SITE_LANGUAGE = 'pl';
export const SITE_LOCALE = 'pl_PL';
export const ALTERNATE_LOCALES = ['uk_UA', 'en_US'] as const;
export const MIN_PLAYER_AGE = 9;
export const AUTHOR = { name: 'Vitalii Elenhaupt', url: 'https://github.com/veelenga' } as const;

export const SEARCH_PHRASES = [
  'nauka pisania na klawiaturze dla dzieci',
  'gra do nauki bezwzrokowego pisania',
  'szybkie pisanie dla dzieci za darmo',
  'typing game for kids',
  'learn touch typing Polish keyboard',
  'гра для навчання друку для дітей',
] as const;

const HERO_ALT =
  'Bohater w czapce czarodzieja z małym smokiem pokonuje słowami potworki na wyspie w grze Literkowo';

export const SHARE_IMAGE: SiteImage = { path: 'og.jpg', width: 1200, height: 630, alt: HERO_ALT };
export const SQUARE_IMAGE: SiteImage = {
  path: 'og-square.jpg',
  width: 1200,
  height: 1200,
  alt: HERO_ALT,
};
export const SCREENSHOT: SiteImage = {
  path: 'screenshot.jpg',
  width: 1600,
  height: 840,
  alt: 'Poziom na wyspie w grze Literkowo: potworki ze słowami, punkty, serca i klawiatura z kolorami palców',
};

export const SHARE_IMAGE_BADGES = ['Za darmo', 'Bez reklam', 'Bez konta'] as const;

export const FALLBACK_TEXTS: readonly LocalizedText[] = [
  {
    lang: 'pl',
    text: 'Literkowo to darmowa gra do nauki pisania na klawiaturze dla dzieci od 9 lat. To gra do nauki bezwzrokowego pisania wszystkimi palcami: każdy poziom dodaje jeden nowy klawisz, aż po polskie litery. Szybkie pisanie dla dzieci ćwiczy się w przygodzie 3D z potworkami, bossami, areną i sklepem. Działa w przeglądarce, za darmo, bez konta i bez reklam.',
  },
  {
    lang: 'uk',
    text: 'Literkowo: безкоштовна гра для навчання друку для дітей від 9 років. Сліпий друк усіма пальцями, по одній новій клавіші на рівень, пригода у 3D з босами, ареною та крамницею. Інтерфейс польською та українською мовами, слова для друку польською та англійською.',
  },
  {
    lang: 'en',
    text: 'Literkowo is a free typing game for kids aged 9 and up. Learn touch typing on a Polish keyboard with all ten fingers, one new key per level, in a blocky 3D adventure with bosses, an arena and a shop. Polish and Ukrainian interface, Polish and English words.',
  },
];

export const NOSCRIPT_TEXTS: readonly LocalizedText[] = [
  { lang: 'pl', text: 'Literkowo działa w przeglądarce z włączonym JavaScriptem.' },
  { lang: 'uk', text: 'Для гри Literkowo увімкніть JavaScript у браузері.' },
];

export function siteUrl(path = ''): string {
  return new URL(path, SITE_URL).href;
}
