import { describe, expect, it } from 'vitest';
import { MAX_ECHO_FEEDBACK, assertReverbSettings, clampEchoFeedback } from './effects';

const DAMPING = 3000;

describe('clampEchoFeedback', () => {
  it('keeps feedback that is already safe', () => {
    expect(clampEchoFeedback(0.4)).toBe(0.4);
  });

  it('keeps feedback below 0.9', () => {
    expect(MAX_ECHO_FEEDBACK).toBeLessThan(0.9);
    expect(clampEchoFeedback(0.9)).toBe(MAX_ECHO_FEEDBACK);
    expect(clampEchoFeedback(1.5)).toBe(MAX_ECHO_FEEDBACK);
  });

  it('does not allow negative feedback', () => {
    expect(clampEchoFeedback(-0.3)).toBe(0);
  });
});

describe('assertReverbSettings', () => {
  it('accepts a positive decay', () => {
    expect(() => assertReverbSettings({ decaySeconds: 2, damping: DAMPING })).not.toThrow();
  });

  it.each([0, -1, Number.NaN])('rejects a decay of %s seconds', (decaySeconds) => {
    expect(() => assertReverbSettings({ decaySeconds, damping: DAMPING })).toThrow(/decaySeconds/);
  });
});
