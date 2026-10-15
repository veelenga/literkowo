import { describe, expect, it } from 'vitest';
import { format, formatParts } from './format';

describe('format', () => {
  it('fills named placeholders', () => {
    expect(format('{a}% and {b}%', { a: 85, b: 93 })).toBe('85% and 93%');
  });

  it('keeps unknown placeholders visible', () => {
    expect(format('Hi {name}', {})).toBe('Hi {name}');
  });
});

describe('formatParts', () => {
  it('splits a template around placeholder values', () => {
    const key = { kind: 'key' };
    expect(formatParts('Press {key} to go', { key })).toEqual(['Press ', key, ' to go']);
  });

  it('drops empty text around leading placeholders', () => {
    expect(formatParts('{key} first', { key: 1 })).toEqual([1, ' first']);
  });
});
