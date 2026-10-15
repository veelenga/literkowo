import type { WordSource } from '../../../course/WordSource';
import type { Phase } from '../../LevelPlan';
import { BalloonEnemy } from './BalloonEnemy';
import { BatEnemy } from './BatEnemy';
import { BullEnemy } from './BullEnemy';
import { ChameleonEnemy } from './ChameleonEnemy';
import { GhostEnemy } from './GhostEnemy';
import { JumperEnemy } from './JumperEnemy';
import type { EnemyKind, Random } from './kinds';
import type { SpecialEnemy, SpecialHost, SpecialSpec } from './SpecialEnemy';
import { KEY_LENGTH, ShieldEnemy } from './ShieldEnemy';
import { SplitterEnemy } from './SplitterEnemy';
import { SwarmEnemy } from './SwarmEnemy';
import { keyOf, lettersWithin, repeatedKey, sameLengthWord, wordPair, wordWithin } from './words';

const JUMPER_LETTERS = { min: 4, max: 7 };
const BALLOON_LETTERS = { min: 3, max: 5 };
const SWARM_LETTERS = { min: 5, max: 7 };
const SHIELDED_LETTERS = { min: 4, max: 6 };
const GHOST_LETTERS = { min: 3, max: 5 };
const CHAMELEON_LETTERS = { min: 3, max: 5 };
const BULL_LETTERS = { min: 4, max: 5 };
const SPEED_SHARES = {
  jumper: 1,
  bat: 2.5,
  swarm: 1.25,
  splitter: 0.8,
  shield: 0.85,
  ghost: 0.9,
  chameleon: 0.9,
  bull: 3,
};

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
      new JumperEnemy(spec(repeatedKey(words, JUMPER_LETTERS, random))),
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
      new SwarmEnemy(spec(lettersWithin(words, SWARM_LETTERS, random))),
  },
  splitter: {
    speedShare: SPEED_SHARES.splitter,
    create: (spec, words) => {
      const halves = wordPair(words);
      return new SplitterEnemy(spec(halves.join('')), { part: 'whole', halves });
    },
  },
  shield: {
    speedShare: SPEED_SHARES.shield,
    create: (spec, words) =>
      new ShieldEnemy(spec(keyOf(words, KEY_LENGTH) + wordWithin(words, SHIELDED_LETTERS))),
  },
  ghost: {
    speedShare: SPEED_SHARES.ghost,
    create: (spec, words, random) =>
      new GhostEnemy(spec(wordWithin(words, GHOST_LETTERS)), random() < HALF ? 1 : -1),
  },
  chameleon: {
    speedShare: SPEED_SHARES.chameleon,
    create: (spec, words) =>
      new ChameleonEnemy(spec(wordWithin(words, CHAMELEON_LETTERS)), (current) =>
        sameLengthWord(words, current),
      ),
  },
  bull: {
    speedShare: SPEED_SHARES.bull,
    create: (spec, words) => new BullEnemy(spec(wordWithin(words, BULL_LETTERS))),
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
