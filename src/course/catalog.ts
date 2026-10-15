import type { UiLanguage } from '../i18n/translations';
import { WORD_LANGUAGES, type WordLanguage } from '../profiles/Profile';

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
  name: Record<UiLanguage, string>;
  languages: readonly WordLanguage[];
  levels: Level[];
}

interface RegionSpec {
  id: string;
  theme: ThemeId;
  name: Record<UiLanguage, string>;
  keys: string[];
  languages?: readonly WordLanguage[];
}

const BOSS_KEYS = '';

const REGION_SPECS: RegionSpec[] = [
  {
    id: 'polana',
    theme: 'meadow',
    name: { pl: 'Polana', uk: 'Галявина' },
    keys: ['fj', 'dk', 'sl', 'a;'],
  },
  {
    id: 'las',
    theme: 'forest',
    name: { pl: 'Las', uk: 'Ліс' },
    keys: ['gh', 'ei', 'ru'],
  },
  {
    id: 'gory',
    theme: 'mountains',
    name: { pl: 'Góry', uk: 'Гори' },
    keys: ['ty', 'wo', 'qp'],
  },
  {
    id: 'jaskinia',
    theme: 'cave',
    name: { pl: 'Jaskinia', uk: 'Печера' },
    keys: ['vm', 'cn', 'xz', 'b,.'],
  },
  {
    id: 'wyspa',
    theme: 'island',
    name: { pl: 'Wyspa Ogonków', uk: 'Острів Хвостиків' },
    keys: ['ąęó', 'łść', 'żźń'],
    languages: ['pl'],
  },
];

function buildRegions(specs: RegionSpec[]): Region[] {
  let order = 0;
  return specs.map((spec) => ({
    id: spec.id,
    theme: spec.theme,
    name: spec.name,
    languages: spec.languages ?? WORD_LANGUAGES,
    levels: [...spec.keys, BOSS_KEYS].map((keys, index) => ({
      id: `${spec.id}-${index + 1}`,
      regionId: spec.id,
      index: index + 1,
      order: order++,
      newKeys: keys,
      isBoss: keys === BOSS_KEYS,
    })),
  }));
}

export const REGIONS: Region[] = buildRegions(REGION_SPECS);

export const LEVELS: Level[] = REGIONS.flatMap((region) => region.levels);

export function levelById(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function regionOf(level: Level): Region {
  const region = REGIONS.find((candidate) => candidate.id === level.regionId);
  if (!region) throw new Error(`Unknown region: ${level.regionId}`);
  return region;
}

export function regionsFor(language: WordLanguage): Region[] {
  return REGIONS.filter((region) => region.languages.includes(language));
}
