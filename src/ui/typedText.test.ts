import { describe, expect, it } from 'vitest';
import { TypedText } from './typedText';

describe('TypedText', () => {
  it('reads each inserted character from a field that is cleared after every input', () => {
    const typed = new TypedText();
    expect(typed.read('f', false)).toEqual(['f']);
    expect(typed.read('j', false)).toEqual(['j']);
  });

  it('splits text inserted at once into characters', () => {
    expect(new TypedText().read('ął', false)).toEqual(['ą', 'ł']);
  });

  it('reads only the new characters while a composition grows', () => {
    const typed = new TypedText();
    expect(typed.read('d', true)).toEqual(['d']);
    expect(typed.read('dk', true)).toEqual(['k']);
    expect(typed.read('dks', true)).toEqual(['s']);
  });

  it('ignores deletions and replacements', () => {
    const typed = new TypedText();
    typed.read('dom', true);
    expect(typed.read('do', true)).toEqual([]);
    expect(typed.read('dam', true)).toEqual([]);
  });

  it('starts over after a reset', () => {
    const typed = new TypedText();
    typed.read('las', true);
    typed.reset();
    expect(typed.read('l', true)).toEqual(['l']);
  });
});
