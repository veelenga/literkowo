import { describe, expect, it } from 'vitest';
import { createProfile } from './Profile';
import { serializeProfiles } from './profileSchema';
import {
  MAX_PROGRESS_FILE_BYTES,
  mergeProfiles,
  parseProgressFile,
  progressFileName,
  readProgressFile,
} from './progressFile';

const ola = createProfile('Ola', 'a');
const jan = createProfile('Jan', 'b', 'en');

describe('progressFileName', () => {
  it('names the file after the local day', () => {
    expect(progressFileName(new Date(2026, 0, 5, 23, 30))).toBe('literkowo-2026-01-05.json');
  });
});

describe('parseProgressFile', () => {
  it('reads back what was saved', () => {
    expect(parseProgressFile(serializeProfiles([ola, jan]))).toEqual([ola, jan]);
  });

  it('migrates profiles saved by an older version', () => {
    const legacy = JSON.stringify([{ id: 'old', name: 'Ala', avatar: 'c', bestScore: 40 }]);
    expect(
      parseProgressFile(legacy)?.map(({ id, name, totalScore }) => [id, name, totalScore]),
    ).toEqual([['old', 'Ala', 40]]);
  });

  it.each([
    ['broken JSON', '{"broken": tr'],
    ['an object', JSON.stringify({ id: ola.id, name: ola.name })],
    ['an empty list', '[]'],
    ['a list with junk', JSON.stringify([ola, 'junk'])],
    ['a profile without a name', JSON.stringify([{ ...ola, name: '' }])],
  ])('rejects %s', (_case, json) => {
    expect(parseProgressFile(json)).toBeUndefined();
  });
});

describe('readProgressFile', () => {
  it('reads profiles from a chosen file', async () => {
    const file = new Blob([serializeProfiles([ola])], { type: 'application/json' });
    expect(await readProgressFile(file)).toEqual([ola]);
  });

  it('rejects a file that is too large to be progress', async () => {
    const padding = ' '.repeat(MAX_PROGRESS_FILE_BYTES);
    expect(await readProgressFile(new Blob([serializeProfiles([ola]), padding]))).toBeUndefined();
  });

  it('rejects a file that cannot be read', async () => {
    const file = new Blob([]);
    file.text = () => Promise.reject(new DOMException('Gone', 'NotReadableError'));
    expect(await readProgressFile(file)).toBeUndefined();
  });
});

describe('mergeProfiles', () => {
  it('replaces profiles with the same id and keeps their place', () => {
    const richer = { ...ola, coins: 120 };
    expect(mergeProfiles([ola, jan], [richer])).toEqual([richer, jan]);
  });

  it('adds new profiles after the ones already here', () => {
    const ala = createProfile('Ala', 'c');
    expect(mergeProfiles([ola], [ala, jan])).toEqual([ola, ala, jan]);
  });

  it('keeps one profile per id when the file repeats an id', () => {
    const later = { ...jan, xp: 30 };
    expect(mergeProfiles([ola], [jan, later])).toEqual([ola, later]);
  });
});
