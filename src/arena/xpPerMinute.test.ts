import { describe, expect, it } from 'vitest';
import { levelPlan } from '../game/LevelPlan';
import type { RunPhase, RunPlan } from '../game/RunPlan';
import { RunRewards } from '../game/RunRewards';
import { SessionStats } from '../game/SessionStats';
import { WORD_LANGUAGES, type WordLanguage } from '../profiles/Profile';
import { DIFFICULTIES, type ArenaDifficulty } from './difficulty';
import { XP_RATE_CAP } from './economy';
import { endlessPlan } from './endlessPlan';
import { keySetsFor, type KeySet } from './keySets';

const INTRO_SECONDS = 1.8;
const LAST_WORD_SECONDS = 4;
const BOSS_SECONDS_PER_HIT = 3;
const BOSS_WORD = { min: 4, max: 7 };
const WARMUP_LETTERS = 1;
const ACCURACIES = [0.93, 0.95, 0.97];
const SAMPLES = 40;
const MAX_WAVES = 60;
const SECONDS_PER_MINUTE = 60;
const SEED = 20261015;

type Random = () => number;

interface RunTally {
  xp: number;
  seconds: number;
}

function seeded(seed: number): Random {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(min: number, max: number, random: Random): number {
  return min + Math.floor(random() * (max - min + 1));
}

class Typist {
  private readonly stats = new SessionStats();
  private readonly rewards: RunRewards;

  constructor(
    plan: RunPlan,
    private readonly accuracy: number,
    private readonly random: Random,
  ) {
    this.rewards = new RunRewards(plan);
  }

  get xp(): number {
    return this.rewards.xp;
  }

  type(letters: number, bossHit = false): void {
    for (let letter = 0; letter < letters; letter += 1) {
      while (this.random() > this.accuracy) this.stats.recordMistake();
      this.stats.recordHit();
    }
    const { fever, multiplier } = this.stats;
    this.rewards.recordWord({ letters, tags: [], bossHit, fever, multiplier });
  }
}

function playPhase(phase: RunPhase, typist: Typist, random: Random): number {
  if (phase.kind === 'boss') {
    for (let hit = 0; hit < phase.count; hit += 1) {
      typist.type(between(BOSS_WORD.min, BOSS_WORD.max, random), true);
    }
    return phase.count * BOSS_SECONDS_PER_HIT;
  }
  const { min, max } = phase.words.lengths;
  for (let word = 0; word < phase.count; word += 1) {
    typist.type(phase.kind === 'warmup' ? WARMUP_LETTERS : between(min, max, random));
  }
  return phase.count * phase.spawnInterval;
}

function practiceLevelOf(keySet: KeySet) {
  const practice = keySet.region.levels.filter((level) => level.kind === 'practice').at(-1);
  if (!practice) throw new Error(`No practice level in ${keySet.id}`);
  return practice;
}

function courseRate(keySet: KeySet, language: WordLanguage, accuracy: number): number {
  const plan = levelPlan(practiceLevelOf(keySet), language);
  const random = seeded(SEED);
  let xp = 0;
  let seconds = 0;
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const typist = new Typist(plan, accuracy, random);
    seconds += INTRO_SECONDS + LAST_WORD_SECONDS;
    for (let index = 0, phase = plan.phaseAt(0); phase; phase = plan.phaseAt(++index)) {
      seconds += playPhase(phase, typist, random);
    }
    xp += typist.xp;
  }
  return (xp / seconds) * SECONDS_PER_MINUTE;
}

function arenaRates(keySet: KeySet, difficulty: ArenaDifficulty, accuracy: number): number[] {
  const plan = endlessPlan({ keySet, difficulty });
  const random = seeded(SEED);
  const totals: RunTally[] = Array.from({ length: MAX_WAVES }, () => ({ xp: 0, seconds: 0 }));
  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const typist = new Typist(plan, accuracy, random);
    let seconds = INTRO_SECONDS + LAST_WORD_SECONDS;
    totals.forEach((total, index) => {
      const phase = plan.phaseAt(index);
      seconds += (phase.calmSeconds ?? 0) + playPhase(phase, typist, random);
      total.xp += typist.xp;
      total.seconds += seconds;
    });
  }
  return totals.map((total) => (total.xp / total.seconds) * SECONDS_PER_MINUTE);
}

describe('arena XP per minute', () => {
  it.each(WORD_LANGUAGES)(
    'stays within the cap of course practice for the same accuracy and position in %s',
    (language) => {
      for (const keySet of keySetsFor(language)) {
        for (const accuracy of ACCURACIES) {
          const course = courseRate(keySet, language, accuracy);
          for (const difficulty of DIFFICULTIES) {
            const rates = arenaRates(keySet, difficulty, accuracy);
            expect(Math.max(...rates)).toBeLessThanOrEqual(course * XP_RATE_CAP);
          }
        }
      }
    },
  );
});
