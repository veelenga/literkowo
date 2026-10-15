import { describe, expect, it } from 'vitest';
import { RIGHT_ALT_KEY, RightAltLatch } from './rightAltLatch';

describe('RightAltLatch', () => {
  it('passes plain keys through', () => {
    const latch = new RightAltLatch();
    expect(latch.press('f')).toBe('f');
    expect(latch.latched).toBe(false);
  });

  it('latches on the right Alt without typing anything', () => {
    const latch = new RightAltLatch();
    expect(latch.press(RIGHT_ALT_KEY)).toBeUndefined();
    expect(latch.latched).toBe(true);
  });

  it('turns the next key into its Polish letter and releases', () => {
    const latch = new RightAltLatch();
    latch.press(RIGHT_ALT_KEY);
    expect(latch.press('a')).toBe('ą');
    expect(latch.latched).toBe(false);
    expect(latch.press('a')).toBe('a');
  });

  it('releases on a key without a Polish letter', () => {
    const latch = new RightAltLatch();
    latch.press(RIGHT_ALT_KEY);
    expect(latch.press('f')).toBe('f');
    expect(latch.latched).toBe(false);
  });

  it('unlatches when the right Alt is pressed twice', () => {
    const latch = new RightAltLatch();
    latch.press(RIGHT_ALT_KEY);
    latch.press(RIGHT_ALT_KEY);
    expect(latch.latched).toBe(false);
    expect(latch.press('l')).toBe('l');
  });
});
