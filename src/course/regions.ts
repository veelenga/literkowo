import type { WordLanguage } from '../profiles/Profile';

export type ThemeId = 'meadow' | 'forest' | 'mountains' | 'cave' | 'island';

export interface Level {
  id: string;
  regionId: string;
  index: number;
  order: number;
  newKeys: string;
  isBoss: boolean;
}

export interface Region {
  id: string;
  theme: ThemeId;
  name: Record<WordLanguage | 'uk', string>;
  languages: WordLanguage[];
  levels: Level[];
}

interface RegionSpec {
  id: string;
  theme: ThemeId;
  name: Record<WordLanguage | 'uk', string>;
  keys: string[];
  languages?: WordLanguage[];
}

const REGION_SPECS: RegionSpec[] = [
  {
    id: 'polana',
    theme: 'meadow',
    name: { pl: 'Polana', en: 'Meadow', uk: 'Галявина' },
    keys: ['fj', 'dk', 'sl', 'a;'],
  },
  {
    id: 'las',
    theme: 'forest',
    name: { pl: 'Las', en: 'Forest', uk: 'Ліс' },
    keys: ['gh', 'ei', 'ru'],
  },
  {
    id: 'gory',
    theme: 'mountains',
    name: { pl: 'Góry', en: 'Mountains', uk: 'Гори' },
    keys: ['ty', 'wo', 'qp'],
  },
  {
    id: 'jaskinia',
    theme: 'cave',
    name: { pl: 'Jaskinia', en: 'Cave', uk: 'Печера' },
    keys: ['vm', 'cn', 'xz', 'b,.'],
  },
  {
    id: 'wyspa',
    theme: 'island',
    name: { pl: 'Wyspa Ogonków', en: 'Island', uk: 'Острів Хвостиків' },
    keys: ['ąęó', 'łść', 'żźń'],
    languages: ['pl'],
  },
];

let order = 0;

export const REGIONS: Region[] = REGION_SPECS.map((spec) => ({
  id: spec.id,
  theme: spec.theme,
  name: spec.name,
  languages: spec.languages ?? ['pl', 'en'],
  levels: [...spec.keys, ''].map((keys, index) => ({
    id: `${spec.id}-${index + 1}`,
    regionId: spec.id,
    index: index + 1,
    order: order++,
    newKeys: keys,
    isBoss: keys === '',
  })),
}));

export const LEVELS: Level[] = REGIONS.flatMap((region) => region.levels);

export function levelById(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function regionOf(level: Level): Region {
  return REGIONS.find((region) => region.id === level.regionId)!;
}

export function regionsFor(language: WordLanguage): Region[] {
  return REGIONS.filter((region) => region.languages.includes(language));
}

export function allowedKeysFor(level: Level): string {
  return LEVELS.filter((candidate) => candidate.order <= level.order)
    .map((candidate) => candidate.newKeys)
    .join('');
}

export function nextLevel(level: Level, language: WordLanguage): Level | undefined {
  const playable = regionsFor(language).flatMap((region) => region.levels);
  const position = playable.findIndex((candidate) => candidate.id === level.id);
  return playable[position + 1];
}

export function previousLevel(level: Level, language: WordLanguage): Level | undefined {
  const playable = regionsFor(language).flatMap((region) => region.levels);
  const position = playable.findIndex((candidate) => candidate.id === level.id);
  return position > 0 ? playable[position - 1] : undefined;
}
