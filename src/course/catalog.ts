import type { UiLanguage } from '../i18n/translations';
import { WORD_LANGUAGES, type WordLanguage } from '../profiles/Profile';

export type ThemeId = 'meadow' | 'forest' | 'mountains' | 'cave' | 'island';

export type LevelKind = 'learn' | 'practice' | 'review' | 'boss';

export interface Level {
  readonly id: string;
  readonly regionId: string;
  readonly index: number;
  readonly order: number;
  readonly kind: LevelKind;
  readonly newKeys: string;
  readonly focusKeys: string;
  readonly isBoss: boolean;
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
  keys: readonly string[];
  languages?: readonly WordLanguage[];
}

interface LevelStep {
  kind: LevelKind;
  newKeys: string;
  focusKeys: string;
}

export const KEYS_PER_REVIEW = 2;
const NO_KEYS = '';

const REGION_SPECS: RegionSpec[] = [
  {
    id: 'polana',
    theme: 'meadow',
    name: { pl: 'Polana', uk: 'Галявина' },
    keys: ['fj', 'd', 'k', 's', 'l', 'a', ';'],
  },
  {
    id: 'las',
    theme: 'forest',
    name: { pl: 'Las', uk: 'Ліс' },
    keys: ['g', 'h', 'e', 'i', 'r', 'u'],
  },
  {
    id: 'gory',
    theme: 'mountains',
    name: { pl: 'Góry', uk: 'Гори' },
    keys: ['t', 'y', 'w', 'o', 'q', 'p'],
  },
  {
    id: 'jaskinia',
    theme: 'cave',
    name: { pl: 'Jaskinia', uk: 'Печера' },
    keys: ['v', 'm', 'c', 'n', 'x', 'z', 'b', ',', '.'],
  },
  {
    id: 'wyspa',
    theme: 'island',
    name: { pl: 'Wyspa Ogonków', uk: 'Острів Хвостиків' },
    keys: ['ą', 'ę', 'ó', 'ł', 'ś', 'ć', 'ż', 'ź', 'ń'],
    languages: ['pl'],
  },
];

function regionSteps(keys: readonly string[]): LevelStep[] {
  const steps: LevelStep[] = [];
  let unreviewed = NO_KEYS;
  for (const key of keys) {
    steps.push(learnStep(key), practiceStep(key));
    unreviewed += key;
    if ([...unreviewed].length < KEYS_PER_REVIEW) continue;
    steps.push(reviewStep(unreviewed));
    unreviewed = NO_KEYS;
  }
  if (unreviewed) steps.push(reviewStep(unreviewed));
  steps.push(bossStep(keys.join('')));
  return steps;
}

function learnStep(key: string): LevelStep {
  return { kind: 'learn', newKeys: key, focusKeys: key };
}

function practiceStep(key: string): LevelStep {
  return { kind: 'practice', newKeys: NO_KEYS, focusKeys: key };
}

function reviewStep(keys: string): LevelStep {
  return { kind: 'review', newKeys: NO_KEYS, focusKeys: keys };
}

function bossStep(keys: string): LevelStep {
  return { kind: 'boss', newKeys: NO_KEYS, focusKeys: keys };
}

function buildRegions(specs: RegionSpec[]): Region[] {
  let order = 0;
  return specs.map((spec) => ({
    id: spec.id,
    theme: spec.theme,
    name: spec.name,
    languages: spec.languages ?? WORD_LANGUAGES,
    levels: regionSteps(spec.keys).map((step, index) => ({
      ...step,
      id: `${spec.id}-${index + 1}`,
      regionId: spec.id,
      index: index + 1,
      order: order++,
      isBoss: step.kind === 'boss',
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

export function coursePosition(level: Level): number {
  return LEVELS.length > 1 ? level.order / (LEVELS.length - 1) : 0;
}
