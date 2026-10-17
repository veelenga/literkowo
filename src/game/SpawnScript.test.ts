import { describe, expect, it } from 'vitest';
import { RECENT_WORDS } from '../course/recentWords';
import { EVEN_WEIGHTS } from '../course/WordSource';
import { WORD_LISTS } from '../course/wordLists';
import { levelWordRules, type WordRules } from '../course/wordRules';
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
const LAS_KEYS = 'fjdksla;gheiru';
const SHORT_WORDS = { min: 2, max: 3 };
const REAL_RULES: WordRules = {
  allowedKeys: LAS_KEYS,
  focusKeys: LAS_KEYS,
  lengths: SHORT_WORDS,
  generatedLengths: SHORT_WORDS,
};

function script(random: RandomSource, seeded = true, rules = RULES): SpawnScript {
  return new SpawnScript({ language: 'pl', random, weights: EVEN_WEIGHTS, seeded }, rules);
}

function spawnsOf(spawnScript: SpawnScript, liveStarts = NO_STARTS): string[] {
  return Array.from(
    { length: SPAWNS },
    (_, spawned) => `${spawnScript.word(WORDS, spawned, liveStarts)}@${spawnScript.angle()}`,
  );
}

function wordsOf(spawnScript: SpawnScript): string[] {
  return Array.from({ length: SPAWNS }, (_, spawned) =>
    spawnScript.word(WORDS, spawned, NO_STARTS),
  );
}

function anglesOf(spawnScript: SpawnScript): number[] {
  return Array.from({ length: SPAWNS }, () => spawnScript.angle());
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

  it('starts the angles of every phase on their own, however many spawns came before', () => {
    const short = script(seededRandom(SEED));
    const long = script(seededRandom(SEED));
    spawnsOf(long);
    short.startPhase(SECOND_PHASE, RULES);
    long.startPhase(SECOND_PHASE, RULES);
    expect(anglesOf(long)).toEqual(anglesOf(short));
  });

  it('does not open a phase with the real words the phase before ended with', () => {
    const spawnScript = script(seededRandom(SEED), true, REAL_RULES);
    const ending = wordsOf(spawnScript).slice(-RECENT_WORDS);
    spawnScript.startPhase(SECOND_PHASE, REAL_RULES);
    const opening = wordsOf(spawnScript).slice(0, RECENT_WORDS);
    expect(opening.every((word) => WORD_LISTS.pl.includes(word))).toBe(true);
    expect(opening.filter((word, index) => ending.slice(index).includes(word))).toEqual([]);
  });

  it('gives the same words in a later phase for the same seed', () => {
    const later = (seed: number) => {
      const spawnScript = script(seededRandom(seed), true, REAL_RULES);
      wordsOf(spawnScript);
      spawnScript.startPhase(SECOND_PHASE, REAL_RULES);
      return wordsOf(spawnScript);
    };
    expect(later(SEED)).toEqual(later(SEED));
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
