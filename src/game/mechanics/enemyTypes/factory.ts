import type { WordSource } from '../../../course/WordSource';
import type { Phase } from '../../LevelPlan';
import { BalloonEnemy } from './BalloonEnemy';
import { BatEnemy } from './BatEnemy';
import { JumperEnemy } from './JumperEnemy';
import { randomInt, type EnemyKind, type Random } from './kinds';
import type { SpecialEnemy, SpecialHost, SpecialSpec } from './SpecialEnemy';
import { SwarmEnemy } from './SwarmEnemy';
import { letters, wordWithin } from './words';

const JUMPER_LETTERS = { min: 4, max: 7 };
const BALLOON_LETTERS = { min: 3, max: 5 };
const SWARM_LETTERS = { min: 5, max: 7 };
const SPEED_SHARES = { jumper: 1, bat: 2.5, swarm: 1.25 };

const HALF = 0.5;

export interface SpawnSource {
  readonly words: WordSource;
  readonly phase: Phase;
  createLabel(): HTMLElement;
}

type SpecFor = (word: string) => SpecialSpec;

interface Recipe {
  readonly speedShare: number;
  create(spec: SpecFor, words: WordSource, random: Random): SpecialEnemy;
}

const RECIPES: Readonly<Record<EnemyKind, Recipe>> = {
  jumper: {
    speedShare: SPEED_SHARES.jumper,
    create: (spec, words, random) =>
      new JumperEnemy(
        spec(
          words.singleLetter().repeat(randomInt(JUMPER_LETTERS.min, JUMPER_LETTERS.max, random)),
        ),
      ),
  },
  balloon: {
    speedShare: 0,
    create: (spec, words) => new BalloonEnemy(spec(wordWithin(words, BALLOON_LETTERS))),
  },
  bat: {
    speedShare: SPEED_SHARES.bat,
    create: (spec, words, random) =>
      new BatEnemy(spec(words.shortWord()), random() < HALF ? 1 : -1),
  },
  swarm: {
    speedShare: SPEED_SHARES.swarm,
    create: (spec, words, random) =>
      new SwarmEnemy(spec(letters(words, randomInt(SWARM_LETTERS.min, SWARM_LETTERS.max, random)))),
  },
};

export function createSpecial(
  kind: EnemyKind,
  source: SpawnSource,
  host: SpecialHost,
  random: Random,
): SpecialEnemy {
  const recipe = RECIPES[kind];
  const spec: SpecFor = (word) => ({
    kind,
    word,
    label: source.createLabel(),
    speed: source.phase.speed * recipe.speedShare,
    host,
  });
  return recipe.create(spec, source.words, random);
}
