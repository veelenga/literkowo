import { describe, expect, it } from 'vitest';
import { EVEN_WEIGHTS } from '../course/WordSource';
import { levelWordRules } from '../course/wordRules';
import { seededRandom, type RandomSource } from '../random';
import { requireLevel } from '../testing/levels';
import type { Phase } from './RunPlan';
import { SpawnScript } from './SpawnScript';

const SEED = 11;
const OTHER_SEED = 12;
const SPAWNS = 30;
const SECOND_PHASE = 1;
const RULES = levelWordRules(requireLevel('las-5'), 'pl');
const WORDS: Phase = { kind: 'words', count: SPAWNS, speed: 1, spawnInterval: 2 };
const NO_STARTS: ReadonlySet<string> = new Set();

function script(random: RandomSource, seeded = true): SpawnScript {
  return new SpawnScript({ language: 'pl', random, weights: EVEN_WEIGHTS, seeded }, RULES);
}

function spawnsOf(spawnScript: SpawnScript, liveStarts = NO_STARTS): string[] {
  return Array.from(
    { length: SPAWNS },
    (_, spawned) => `${spawnScript.word(WORDS, spawned, liveStarts)}@${spawnScript.angle()}`,
  );
}

describe('SpawnScript', () => {
  it('gives the same words and angles for the same seed', () => {
    expect(spawnsOf(script(seededRandom(SEED)))).toEqual(spawnsOf(script(seededRandom(SEED))));
  });

  it('gives other words and angles for another seed', () => {
    expect(spawnsOf(script(seededRandom(SEED)))).not.toEqual(
      spawnsOf(script(seededRandom(OTHER_SEED))),
    );
  });

  it('starts every phase on its own, however many spawns came before', () => {
    const short = script(seededRandom(SEED));
    const long = script(seededRandom(SEED));
    spawnsOf(long);
    short.startPhase(SECOND_PHASE, RULES);
    long.startPhase(SECOND_PHASE, RULES);
    expect(spawnsOf(long)).toEqual(spawnsOf(short));
  });

  it('ignores the letters on the board in a seeded run', () => {
    const board = new Set([...RULES.allowedKeys]);
    expect(spawnsOf(script(seededRandom(SEED)), board)).toEqual(
      spawnsOf(script(seededRandom(SEED))),
    );
  });

  it('avoids first letters on the board without a seed', () => {
    const plain = script(seededRandom(SEED), false).word(WORDS, 0, NO_STARTS);
    const avoiding = script(seededRandom(SEED), false).word(WORDS, 0, new Set([plain[0]]));
    expect(avoiding[0]).not.toBe(plain[0]);
  });

  it('numbers the spawns from zero across phases', () => {
    const spawnScript = script(seededRandom(SEED));
    const first = [spawnScript.nextIndex(), spawnScript.nextIndex()];
    spawnScript.startPhase(SECOND_PHASE, RULES);
    expect([...first, spawnScript.nextIndex()]).toEqual([0, 1, 2]);
  });
});
