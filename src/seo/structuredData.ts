import {
  AUTHOR,
  INTERFACE_LANGUAGES,
  MIN_PLAYER_AGE,
  SCREENSHOT,
  SEARCH_PHRASES,
  SHARE_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  SQUARE_IMAGE,
  siteUrl,
  type SiteImage,
} from './site';

const SCHEMA_CONTEXT = 'https://schema.org';
const GAME_TYPES = ['VideoGame', 'WebApplication'];
const APPLICATION_CATEGORY = 'GameApplication';
const GENRES = ['Educational game', 'Typing game'];
const PLATFORM = 'Web browser';
const BROWSER_REQUIREMENTS = 'Requires JavaScript and WebGL';
const FREE_PRICE = '0';
const PRICE_CURRENCY = 'PLN';
const KEYWORD_SEPARATOR = ', ';

export interface ImageObject {
  readonly '@type': 'ImageObject';
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
}

export interface GameData {
  readonly '@context': string;
  readonly '@type': readonly string[];
  readonly name: string;
  readonly url: string;
  readonly description: string;
  readonly inLanguage: readonly string[];
  readonly applicationCategory: string;
  readonly genre: readonly string[];
  readonly gamePlatform: string;
  readonly operatingSystem: string;
  readonly browserRequirements: string;
  readonly isAccessibleForFree: boolean;
  readonly audience: { readonly '@type': 'PeopleAudience'; readonly suggestedMinAge: number };
  readonly typicalAgeRange: string;
  readonly author: { readonly '@type': 'Person'; readonly name: string; readonly url: string };
  readonly image: readonly ImageObject[];
  readonly screenshot: ImageObject;
  readonly offers: {
    readonly '@type': 'Offer';
    readonly price: string;
    readonly priceCurrency: string;
  };
  readonly keywords: string;
}

export function structuredData(): GameData {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': GAME_TYPES,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: INTERFACE_LANGUAGES,
    applicationCategory: APPLICATION_CATEGORY,
    genre: GENRES,
    gamePlatform: PLATFORM,
    operatingSystem: PLATFORM,
    browserRequirements: BROWSER_REQUIREMENTS,
    isAccessibleForFree: true,
    audience: { '@type': 'PeopleAudience', suggestedMinAge: MIN_PLAYER_AGE },
    typicalAgeRange: `${MIN_PLAYER_AGE}-`,
    author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    image: [SHARE_IMAGE, SQUARE_IMAGE].map(imageObject),
    screenshot: imageObject(SCREENSHOT),
    offers: { '@type': 'Offer', price: FREE_PRICE, priceCurrency: PRICE_CURRENCY },
    keywords: SEARCH_PHRASES.join(KEYWORD_SEPARATOR),
  };
}

function imageObject(image: SiteImage): ImageObject {
  return {
    '@type': 'ImageObject',
    url: siteUrl(image.path),
    width: image.width,
    height: image.height,
    caption: image.alt,
  };
}
