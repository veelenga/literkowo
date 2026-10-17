import { countOf, isCount, isRecord, stringsOf, type RawRecord } from './raw';

const PERFECT_ACCURACY = 1;
const NO_PRICE = 0;
const NO_WPM = 0;

const BOSS_LEVEL_IDS: ReadonlySet<string> = new Set([
  'polana-19',
  'las-16',
  'gory-16',
  'jaskinia-24',
  'wyspa-24',
]);

const PET_PRICES: ReadonlyMap<string, number> = new Map([
  ['cube-cat', 160],
  ['piggy', 250],
  ['bee', 320],
  ['puppy', 400],
  ['ghost', 480],
  ['penguin', 700],
  ['dragon', 900],
]);

const HAT_PRICES: ReadonlyMap<string, number> = new Map([
  ['cap', 75],
  ['headphones', 200],
  ['horns', 350],
  ['halo', 600],
  ['beanie', 800],
  ['helmet', 1100],
  ['pirate', 1500],
]);

const SKIN_PRICES: ReadonlyMap<string, number> = new Map([
  ['g', 200],
  ['h', 250],
  ['i', 300],
  ['k', 400],
  ['l', 500],
  ['n', 650],
  ['o', 800],
  ['q', 1200],
]);

interface WonLevel {
  readonly levelId: string;
  readonly accuracy: number;
  readonly wpm: number;
}

export function seededCounters(raw: RawRecord, avatar: string): RawRecord {
  const won = wonLevels(raw.levelResults);
  return {
    wordsTyped: 0,
    powerWords: 0,
    specialEnemies: 0,
    bossesBeaten: won.filter(({ levelId }) => BOSS_LEVEL_IDS.has(levelId)).length,
    coinsEarned: countOf(raw.coins) + coinsSpent(raw.inventory, avatar),
    perfectLevels: won.filter(({ accuracy }) => accuracy >= PERFECT_ACCURACY).length,
    bestWpm: Math.max(NO_WPM, ...won.map(({ wpm }) => wpm)),
    skinsPlayed: [avatar],
  };
}

function wonLevels(value: unknown): WonLevel[] {
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([levelId, result]) => {
    if (!isRecord(result)) return [];
    const { stars, score, accuracy, wpm } = result;
    if (!isCount(stars) || !isCount(score) || !isCount(accuracy) || !isCount(wpm)) return [];
    return stars > 0 ? [{ levelId, accuracy, wpm }] : [];
  });
}

function coinsSpent(value: unknown, avatar: string): number {
  const inventory = isRecord(value) ? value : {};
  return (
    spentOn(PET_PRICES, stringsOf(inventory.pets)) +
    spentOn(HAT_PRICES, stringsOf(inventory.hats)) +
    spentOn(SKIN_PRICES, [...stringsOf(inventory.skins), avatar])
  );
}

function spentOn(prices: ReadonlyMap<string, number>, ids: readonly string[]): number {
  return [...new Set(ids)].reduce((sum, id) => sum + (prices.get(id) ?? NO_PRICE), 0);
}
