import { describe, expect, it } from 'vitest';
import { WORD_LISTS } from './wordLists';

const POLISH_BLOCKLIST = [
  'alf',
  'digi',
  'dies',
  'dieje',
  'ety',
  'fik',
  'gdak',
  'haha',
  'jaga',
  'jesie',
  'kies',
  'kupa',
  'mą',
  'owa',
  'rusa',
  'rusk',
  'siki',
  'suty',
  'tyl',
  'wyt',
];

const POLISH_WORD = /^[a-ząćęłńóśźż]+$/;

describe('WORD_LISTS', () => {
  it('has no blocked Polish words', () => {
    expect(WORD_LISTS.pl.filter((word) => POLISH_BLOCKLIST.includes(word))).toEqual([]);
  });

  it('keeps Polish words to lower case letters', () => {
    expect(WORD_LISTS.pl.filter((word) => !POLISH_WORD.test(word))).toEqual([]);
  });
});
