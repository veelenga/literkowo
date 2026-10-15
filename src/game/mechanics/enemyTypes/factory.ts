import type { WordSource } from '../../../course/WordSource';
import type { Phase } from '../../LevelPlan';
import { BalloonEnemy } from './BalloonEnemy';
import { BatEnemy } from './BatEnemy';
import { JumperEnemy } from './JumperEnemy';
import { randomInt, type EnemyKind, type Random } from './kinds';
import type { SpecialEnemy, SpecialHost, SpecialSpec } from './SpecialEnemy';
import { SwarmEnemy } from './SwarmEnemy';

const JUMPER_LETTERS = { min: 4, max: 7 };
const BALLOON_LETTERS = { min: 3, max: 5 };
const SWARM_LETTERS = { min: 5, max: 7 };
const SPEED_SHARES = { jumper: 1, bat: 2.5, swarm: 1.25 };

const WORD_ATTEMPTS = 8;
const HALF = 0.5;

export interface SpawnSource {
  readonly words: WordSource;
  readonly phase: Phase;
  createLabel(): HTMLElement;
}

interface Recipe {
  word(words: WordSource, random: Random): string;
  build(spec: SpecialSpec, random: Random): SpecialEnemy;
  speedShare: number;
}

const RECIPES: Readonly<Record<EnemyKind, Recipe>> = {
  jumper: {
    word: (words, random) =>
      words.singleLetter().repeat(randomInt(JUMPER_LETTERS.min, JUMPER_LETTERS.max, random)),
    build: (spec) => new JumperEnemy(spec),
    speedShare: SPEED_SHARES.jumper,
  },
  balloon: {
    word: (words) => wordWithin(words, BALLOON_LETTERS),
    build: (spec) => new BalloonEnemy(spec),
    speedShare: 0,
  },
  bat: {
    word: (words) => words.shortWord(),
    build: (spec, random) => new BatEnemy(spec, random() < HALF ? 1 : -1),
    speedShare: SPEED_SHARES.bat,
  },
  swarm: {
    word: (words, random) =>
      letters(words, randomInt(SWARM_LETTERS.min, SWARM_LETTERS.max, random)),
    build: (spec) => new SwarmEnemy(spec),
    speedShare: SPEED_SHARES.swarm,
  },
};

export function createSpecial(
  kind: EnemyKind,
  source: SpawnSource,
  host: SpecialHost,
  random: Random,
): SpecialEnemy {
  const recipe = RECIPES[kind];
  const spec: SpecialSpec = {
    kind,
    word: recipe.word(source.words, random),
    label: source.createLabel(),
    speed: source.phase.speed * recipe.speedShare,
    host,
  };
  return recipe.build(spec, random);
}

function wordWithin(words: WordSource, range: { min: number; max: number }): string {
  for (let attempt = 0; attempt < WORD_ATTEMPTS; attempt += 1) {
    const word = words.next();
    if (word.length >= range.min && word.length <= range.max) return word;
  }
  return words.shortWord();
}

function letters(words: WordSource, count: number): string {
  let pool = '';
  while (pool.length < count) pool += words.next();
  return pool.slice(0, count);
}
