import { describe, expect, it } from 'vitest';
import { entriesOf, isOneOf, isShare, isWholeNumber, wholeOf } from './raw';

const NOT_NUMBERS = ['3', '', null, undefined, true, { value: 3 }];
const NOT_WHOLE = [2.5, 0.1, -1, -2.5, Number.NaN, Infinity, -Infinity];

describe('isWholeNumber', () => {
  it('accepts zero and positive integers', () => {
    expect(isWholeNumber(0)).toBe(true);
    expect(isWholeNumber(42)).toBe(true);
  });

  it.each([...NOT_WHOLE, ...NOT_NUMBERS])('rejects %o', (value) => {
    expect(isWholeNumber(value)).toBe(false);
  });
});

describe('wholeOf', () => {
  it('keeps zero and positive integers', () => {
    expect(wholeOf(0)).toBe(0);
    expect(wholeOf(42)).toBe(42);
  });

  it.each([...NOT_WHOLE, ...NOT_NUMBERS])('turns %o into 0', (value) => {
    expect(wholeOf(value)).toBe(0);
  });
});

describe('isShare', () => {
  it.each([0, 0.25, 1])('accepts %s', (value) => {
    expect(isShare(value)).toBe(true);
  });

  it.each([1.01, 2, -0.5, Number.NaN, Infinity, ...NOT_NUMBERS])('rejects %o', (value) => {
    expect(isShare(value)).toBe(false);
  });
});

describe('isOneOf', () => {
  const OPTIONS = ['cap', 'halo'];

  it('accepts a listed option', () => {
    expect(isOneOf('halo', OPTIONS)).toBe(true);
  });

  it.each(['helmet', 'Halo', '', 3, null, undefined])('rejects %o', (value) => {
    expect(isOneOf(value, OPTIONS)).toBe(false);
  });

  it('matches numbers by value without turning strings into numbers', () => {
    expect(isOneOf(2, [1, 2, 3])).toBe(true);
    expect(isOneOf('2', [1, 2, 3])).toBe(false);
  });
});

describe('entriesOf', () => {
  it('keeps the entries the reader can read', () => {
    const read = (entry: unknown): number | undefined => (isWholeNumber(entry) ? entry : undefined);
    expect(entriesOf({ a: 1, b: 'two', c: 3 }, read)).toEqual({ a: 1, c: 3 });
  });

  it('keeps falsy values that the reader returns', () => {
    expect(entriesOf({ a: 0, b: '' }, (entry) => entry)).toEqual({ a: 0, b: '' });
  });

  it('passes each key to the reader', () => {
    const read = (entry: unknown, key: string): unknown => (key.length === 1 ? entry : undefined);
    expect(entriesOf({ a: 1, bb: 2 }, read)).toEqual({ a: 1 });
  });

  it.each([undefined, null, 3, 'text'])('reads %o as no entries', (value) => {
    expect(entriesOf(value, (entry) => entry)).toEqual({});
  });

  it('reads an array as no entries', () => {
    expect(entriesOf([1, 2], (entry) => entry)).toEqual({});
  });
});
