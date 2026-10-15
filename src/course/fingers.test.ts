import { describe, expect, it } from 'vitest';
import { baseKey, fingerFor, needsRightAlt, withRightAlt } from './fingers';

describe('fingers', () => {
  it('maps ź to the x key', () => {
    expect(baseKey('ź')).toBe('x');
    expect(fingerFor('ź')).toBe(fingerFor('x'));
  });

  it('needs the right Alt for Polish letters only', () => {
    expect(needsRightAlt('ą')).toBe(true);
    expect(needsRightAlt('Ą')).toBe(true);
    expect(needsRightAlt('a')).toBe(false);
  });

  it('assigns home row keys to their fingers', () => {
    expect(fingerFor('f')).toBe('leftIndex');
    expect(fingerFor('j')).toBe('rightIndex');
    expect(fingerFor('ą')).toBe('leftPinky');
    expect(fingerFor(' ')).toBe('thumb');
  });

  it('turns a base key into its Polish letter with the right Alt', () => {
    expect(withRightAlt('a')).toBe('ą');
    expect(withRightAlt('x')).toBe('ź');
    expect(withRightAlt('z')).toBe('ż');
  });

  it('keeps keys without a Polish letter as they are with the right Alt', () => {
    expect(withRightAlt('f')).toBe('f');
    expect(withRightAlt(' ')).toBe(' ');
  });
});
