export const FIRST_PLAYER_LEVEL = 1;
const XP_PER_LETTER = 1;
const FIRST_STEP_XP = 100;
const STEP_GROWTH = 1.12;
const MAX_STEP_XP = 15_000;
const FEVER_XP_FACTOR = 2;
const BOSS_HIT_XP_FACTOR = 3;
const DEFAULT_TAG_FACTOR = 1;

const TAG_XP_FACTORS: Readonly<Record<string, number>> = {
  merged: 3,
  'power-word': 2,
  minion: 1,
};

export const RANKS = [
  { id: 'chick', fromLevel: 1 },
  { id: 'apprentice', fromLevel: 5 },
  { id: 'letterHunter', fromLevel: 12 },
  { id: 'wordGuardian', fromLevel: 22 },
  { id: 'keyboardMaster', fromLevel: 35 },
  { id: 'legend', fromLevel: 50 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

export interface CompletedWord {
  letters: number;
  tags: Iterable<string>;
  bossHit: boolean;
  fever: boolean;
  multiplier: number;
}

export interface LevelProgress {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  fraction: number;
}

export function wordXp({ letters, tags, bossHit, fever, multiplier }: CompletedWord): number {
  const feverFactor = fever ? FEVER_XP_FACTOR : 1;
  return Math.round(letters * XP_PER_LETTER * multiplier * feverFactor * tagFactor(tags, bossHit));
}

export function tagFactor(tags: Iterable<string>, bossHit = false): number {
  const factors = [...tags].map((tag) => TAG_XP_FACTORS[tag] ?? DEFAULT_TAG_FACTOR);
  if (bossHit) factors.push(BOSS_HIT_XP_FACTOR);
  return Math.max(DEFAULT_TAG_FACTOR, ...factors);
}

export function xpToAdvance(level: number): number {
  const growth = STEP_GROWTH ** (level - FIRST_PLAYER_LEVEL);
  return Math.min(MAX_STEP_XP, Math.round(FIRST_STEP_XP * growth));
}

export function xpForLevel(level: number): number {
  let total = 0;
  for (let step = FIRST_PLAYER_LEVEL; step < level; step += 1) total += xpToAdvance(step);
  return total;
}

export function levelProgress(xp: number): LevelProgress {
  let level = FIRST_PLAYER_LEVEL;
  let remaining = Math.max(0, xp);
  while (remaining >= xpToAdvance(level)) {
    remaining -= xpToAdvance(level);
    level += 1;
  }
  const xpToNext = xpToAdvance(level);
  return { level, xpInLevel: remaining, xpToNext, fraction: remaining / xpToNext };
}

export function rankFor(level: number): RankId {
  return RANKS.reduce<RankId>(
    (current, rank) => (level >= rank.fromLevel ? rank.id : current),
    RANKS[0].id,
  );
}

export function rankStartLevel(rank: RankId): number {
  return RANKS.find((entry) => entry.id === rank)?.fromLevel ?? Number.POSITIVE_INFINITY;
}
