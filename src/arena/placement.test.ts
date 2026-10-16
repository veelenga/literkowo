import { describe, expect, it } from 'vitest';
import { courseFor } from '../course/course';
import { levelTempo } from '../course/difficulty';
import { WordSource } from '../course/WordSource';
import { WORD_LISTS } from '../course/wordLists';
import type { PhaseRecord } from '../game/PhaseMeter';
import {
  listedWords,
  MIN_STAGE_WORDS,
  placementOutcome,
  placementStages,
  passedStages,
  STAGE_LENGTHS,
  stageLengths,
  stagePassed,
  WIDE_STAGE_LENGTHS,
} from './placement';

const SAMPLES = 300;
const POLISH = placementStages('pl');
const ENGLISH = placementStages('en');
const LANGUAGES = [
  ['pl', POLISH],
  ['en', ENGLISH],
] as const;
const GOOD: PhaseRecord = { hits: 40, mistakes: 0, reached: 0, typingSeconds: 8 };

function record(overrides: Partial<PhaseRecord>): PhaseRecord {
  return { ...GOOD, ...overrides };
}

describe('placementStages', () => {
  it('has one stage per region of the word language', () => {
    expect(POLISH.map((stage) => stage.keySet.region.id)).toEqual([
      'polana',
      'las',
      'gory',
      'jaskinia',
      'wyspa',
    ]);
    expect(ENGLISH.map((stage) => stage.number)).toEqual([1, 2, 3, 4]);
  });

  it('uses the keys of the boss level of each region', () => {
    const course = courseFor('pl');
    POLISH.forEach((stage) => {
      expect(stage.words.allowedKeys).toBe(course.allowedKeys(stage.keySet.bossLevel));
    });
    expect(POLISH[0].words.allowedKeys).toBe('fjdksla;');
  });

  it('asks for real words only and leans on the keys of its own region', () => {
    expect(POLISH[1].words).toMatchObject({ focusKeys: 'gheiru', realWordsOnly: true });
    expect(POLISH.every((stage) => stage.words.stages === undefined)).toBe(true);
  });

  it('finds enough real words of 3 to 5 letters for every stage in both lists', () => {
    for (const [language, stages] of LANGUAGES) {
      for (const stage of stages) {
        expect(stage.words.lengths).toEqual(STAGE_LENGTHS);
        const words = listedWords(language, stage.keySet.keys, STAGE_LENGTHS);
        expect(words.length).toBeGreaterThanOrEqual(MIN_STAGE_WORDS);
      }
    }
  });

  it('widens the lengths to 2 to 6 letters when a key set has too few words', () => {
    expect(stageLengths('en', 'asdf')).toEqual(WIDE_STAGE_LENGTHS);
    expect(stageLengths('en', 'fjdksla;')).toEqual(STAGE_LENGTHS);
  });

  it('runs every stage at the pace of the last practice level of its region', () => {
    expect(POLISH[0].tempo).toEqual(levelTempo(courseFor('pl').levels[16]).end);
    expect(POLISH[1].tempo.spawnInterval).toBeLessThan(POLISH[0].tempo.spawnInterval);
  });

  it('gives Polish letters more time between keys', () => {
    expect(POLISH.map((stage) => stage.targetIntervalMs)).toEqual([900, 900, 900, 900, 1400]);
    expect(ENGLISH.every((stage) => stage.targetIntervalMs === 900)).toBe(true);
  });

  it('draws only listed words for every stage', () => {
    for (const [language, stages] of LANGUAGES) {
      const listed = new Set(WORD_LISTS[language]);
      for (const stage of stages) {
        const source = new WordSource(language, stage.words);
        const drawn = Array.from({ length: SAMPLES }, () => source.next());
        expect(drawn.filter((word) => !listed.has(word))).toEqual([]);
      }
    }
  });
});

describe('stagePassed', () => {
  const polana = POLISH[0];

  it('passes careful typing at the mastery pace', () => {
    expect(stagePassed(polana, GOOD)).toBe(true);
    expect(stagePassed(polana, record({ hits: 10, typingSeconds: 9 }))).toBe(true);
  });

  it('needs at least 95% accuracy on the shown percent', () => {
    expect(stagePassed(polana, record({ hits: 19, mistakes: 1 }))).toBe(true);
    expect(stagePassed(polana, record({ hits: 47, mistakes: 3 }))).toBe(false);
  });

  it('needs at most 900 ms between correct keys, 1400 ms with Polish letters', () => {
    const slow = record({ hits: 10, typingSeconds: 10 });
    expect(stagePassed(polana, slow)).toBe(false);
    expect(stagePassed(POLISH[4], slow)).toBe(true);
    expect(stagePassed(POLISH[4], record({ hits: 10, typingSeconds: 14.1 }))).toBe(false);
  });

  it('allows one enemy at the hero, not two', () => {
    expect(stagePassed(polana, record({ reached: 1 }))).toBe(true);
    expect(stagePassed(polana, record({ reached: 2 }))).toBe(false);
  });

  it('fails a stage without a correct key', () => {
    expect(stagePassed(polana, record({ hits: 0, typingSeconds: 0 }))).toBe(false);
  });
});

describe('placementOutcome', () => {
  const failed = record({ hits: 5, mistakes: 5 });

  it('stops counting at the first failed stage', () => {
    expect(passedStages(POLISH, [GOOD, failed, GOOD])).toBe(1);
    expect(passedStages(POLISH, [GOOD, GOOD])).toBe(2);
    expect(passedStages(POLISH, [])).toBe(0);
  });

  it('places the kid in the last passed region and starts them in the next one', () => {
    const outcome = placementOutcome(POLISH, [GOOD, failed]);
    expect(outcome).toMatchObject({ stages: 5, passed: 1 });
    expect(outcome.placed?.id).toBe('polana');
    expect(outcome.start?.id).toBe('las');
  });

  it('starts a kid who passed everything in the last region', () => {
    const outcome = placementOutcome(ENGLISH, [GOOD, GOOD, GOOD, GOOD]);
    expect(outcome.placed?.id).toBe('jaskinia');
    expect(outcome.start?.id).toBe('jaskinia');
  });

  it('leaves a beginner without a place', () => {
    const outcome = placementOutcome(POLISH, [failed]);
    expect(outcome).toMatchObject({ passed: 0, placed: undefined, start: undefined });
  });

  it('sums accuracy and speed over every played stage', () => {
    const outcome = placementOutcome(POLISH, [
      record({ hits: 30, mistakes: 0, typingSeconds: 6 }),
      record({ hits: 10, mistakes: 10, typingSeconds: 6 }),
    ]);
    expect(outcome.accuracy).toBeCloseTo(40 / 50);
    expect(outcome.wpm).toBe(40);
  });
});
