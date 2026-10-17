import { describe, expect, it } from 'vitest';
import { LONG_WORDS, ONE_HEART } from '../game/modifiers';
import {
  BOSS_BREAK_WORDS,
  BOSS_FIGHTS,
  DAILY_PRESET,
  SLOWER_PRESET,
  TIME_ATTACK_BOARD,
  dailyDifficulty,
  dailyPlan,
  dailySeed,
} from './dailyPlan';
import { arenaCoinsPerWord } from './economy';
import { endlessPlan } from './endlessPlan';
import { DAILY_SECONDS, TIME_ATTACK_SECONDS, formatOnWeekday } from './formats';
import { keySetById, type KeySet } from './keySets';
import { stagePracticeTempo } from './placement';
import { realShare, scriptedWords } from '../testing/runWords';

const DAY = '2026-10-16';
const NEXT_DAY = '2026-10-17';
const WAVES = 6;
const ALL_REAL = 1;
const TIME_ATTACK_PHASES = 1;
const SATURDAY_PHASES = 6;

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

const LAS: KeySet = required(keySetById('las', 'pl'));

function planOn(weekday: number) {
  return dailyPlan({ keySet: LAS, format: formatOnWeekday(weekday), day: DAY });
}

describe('dailySeed', () => {
  it('is the same for one key set on one day and differs otherwise', () => {
    expect(dailySeed(DAY, 'las')).toBe(dailySeed(DAY, 'las'));
    expect(dailySeed(DAY, 'las')).not.toBe(dailySeed(DAY, 'gory'));
    expect(dailySeed(DAY, 'las')).not.toBe(dailySeed('2026-10-17', 'las'));
  });

  it('seeds the plan of the day and key set', () => {
    expect(planOn(6).seed).toBe(dailySeed(DAY, 'las'));
    expect(planOn(1).seed).toBe(dailySeed(DAY, 'las'));
    const tomorrow = dailyPlan({ keySet: LAS, format: formatOnWeekday(6), day: '2026-10-17' });
    expect(tomorrow.seed).not.toBe(planOn(6).seed);
  });
});

describe('dailyPlan', () => {
  it('runs the Normalnie waves for three minutes on Sunday', () => {
    const plan = planOn(6);
    const endless = endlessPlan({ keySet: LAS, difficulty: DAILY_PRESET });
    expect(plan).toMatchObject({
      seconds: DAILY_SECONDS,
      lives: DAILY_PRESET.lives,
      xpFactor: DAILY_PRESET.xpFactor,
      coinsPerWord: arenaCoinsPerWord(DAILY_PRESET),
      allMechanicsUnlocked: true,
    });
    expect(plan.phaseAt(4)).toEqual(endless.phaseAt(4));
  });

  it('hides the words in fog on Monday and the keyboard on Wednesday', () => {
    expect(planOn(0).phaseAt(0)?.modifiers).toEqual(['fog']);
    expect(planOn(2).phaseAt(3)?.modifiers).toEqual(['darkness']);
  });

  it('slows the long words of Thursday and the one heart of Friday', () => {
    const endless = endlessPlan({ keySet: LAS, difficulty: DAILY_PRESET }).phaseAt(0);
    const thursday = planOn(3).phaseAt(0);
    expect(thursday?.words.lengths).toEqual(LONG_WORDS);
    expect(thursday?.speed).toBeCloseTo((endless?.speed ?? 0) * SLOWER_PRESET.speedFactor);
    expect(planOn(4).lives).toBe(ONE_HEART);
    expect(dailyDifficulty(formatOnWeekday(4))).toMatchObject({
      speedFactor: SLOWER_PRESET.speedFactor,
      spawnGapFactor: DAILY_PRESET.spawnGapFactor,
      coinFactor: DAILY_PRESET.coinFactor,
    });
  });

  it('keeps four slow words on the board for two minutes on Tuesday, without hearts', () => {
    const plan = planOn(1);
    expect(plan).toMatchObject({ seconds: TIME_ATTACK_SECONDS, lives: 0, hitCost: 'combo' });
    const phase = plan.phaseAt(0);
    expect(phase).toMatchObject({
      kind: 'test',
      boardSize: TIME_ATTACK_BOARD,
      seconds: TIME_ATTACK_SECONDS,
      words: { allowedKeys: LAS.keys, focusKeys: LAS.keys, realWordsOnly: true },
    });
    expect(phase?.speed).toBeLessThan(stagePracticeTempo(LAS.region).speed);
    expect(plan.phaseAt(1)).toBeUndefined();
  });

  it('runs three short boss fights with word breaks on Saturday', () => {
    const plan = planOn(5);
    const phases = Array.from({ length: 7 }, (_, index) => plan.phaseAt(index));
    expect(phases.map((phase) => phase?.kind)).toEqual([
      'words',
      'boss',
      'words',
      'boss',
      'words',
      'boss',
      undefined,
    ]);
    expect(phases.map((phase) => phase?.wave)).toEqual([1, 2, 3, 4, 5, 6, undefined]);
    expect(
      phases.filter((phase) => phase?.kind === 'boss').map((phase) => phase?.miniBoss),
    ).toEqual(BOSS_FIGHTS.map((fight) => fight.miniBoss));
    expect(phases[0]?.count).toBe(BOSS_BREAK_WORDS);
    expect(phases[5]?.count).toBeLessThanOrEqual(BOSS_FIGHTS[2].hits);
    expect(plan.seconds).toBe(DAILY_SECONDS);
  });

  it('gives everyone the same real words on one day and other words the next day', () => {
    const words = (day: string) =>
      scriptedWords(dailyPlan({ keySet: LAS, format: formatOnWeekday(6), day }), 'pl', WAVES);
    expect(words(DAY)).toEqual(words(DAY));
    expect(words(DAY)).not.toEqual(words(NEXT_DAY));
    expect(realShare(words(DAY).flat(), 'pl')).toBe(ALL_REAL);
  });

  it('keeps every format of the week to real words with the Las keys', () => {
    for (const weekday of [0, 2, 3, 4, 6]) {
      expect(realShare(scriptedWords(planOn(weekday), 'pl', WAVES).flat(), 'pl')).toBe(ALL_REAL);
    }
    expect(realShare(scriptedWords(planOn(1), 'pl', TIME_ATTACK_PHASES).flat(), 'pl')).toBe(
      ALL_REAL,
    );
    expect(realShare(scriptedWords(planOn(5), 'pl', SATURDAY_PHASES).flat(), 'pl')).toBe(ALL_REAL);
  });
});
