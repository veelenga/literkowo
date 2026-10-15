import { describe, expect, it } from 'vitest';
import { TRANSITION_SCORES, transitionScore, typability } from './typability';

const GOOD = 0.8;
const BAD = 0.2;

describe('typability', () => {
  it.each(['fj', 'jf', 'fjf', 'dk', 'jfjd'])('scores %s well, the hands take turns', (word) => {
    expect(typability(word)).toBeGreaterThanOrEqual(GOOD);
  });

  it.each(['fr', 'ju', 'ft', 'ki', 'swx'])('scores %s badly, one finger presses twice', (word) => {
    expect(typability(word)).toBeLessThanOrEqual(BAD);
  });

  it('allows a doubled letter', () => {
    expect(typability('ff')).toBe(TRANSITION_SCORES.double);
    expect(typability('ff')).toBeGreaterThan(typability('fd'));
  });

  it('ranks hand alternation above the same hand above the same finger', () => {
    expect(transitionScore('f', 'j')).toBeGreaterThan(transitionScore('f', 'd'));
    expect(transitionScore('f', 'd')).toBeGreaterThan(transitionScore('f', 'g'));
  });

  it('scores Polish letters by the finger of their base key', () => {
    expect(transitionScore('ą', 'q')).toBe(TRANSITION_SCORES.sameFinger);
    expect(transitionScore('ł', 'j')).toBe(TRANSITION_SCORES.sameHand);
  });

  it('scores a single key and an empty text as easy', () => {
    expect(typability('k')).toBe(TRANSITION_SCORES.alternation);
    expect(typability('')).toBe(TRANSITION_SCORES.alternation);
  });

  it('looks at the moves into and out of the focus keys when it is given', () => {
    expect(typability('frjk', 'k')).toBe(TRANSITION_SCORES.sameHand);
    expect(typability('ftk', 'k')).toBe(TRANSITION_SCORES.alternation);
    expect(typability('ftk')).toBeLessThan(typability('ftk', 'k'));
    expect(typability('fj', 'k')).toBe(TRANSITION_SCORES.alternation);
  });
});
