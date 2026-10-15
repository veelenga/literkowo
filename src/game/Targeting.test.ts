import { describe, expect, it } from 'vitest';
import { Targeting, type Keystroke, type Typable } from './Targeting';

class FakeWord implements Typable {
  typed = 0;
  isCandidate = false;

  constructor(readonly word: string) {}

  get expectedChar(): string | undefined {
    return this.word[this.typed];
  }

  get isComplete(): boolean {
    return this.typed >= this.word.length;
  }

  advance(): void {
    this.typed += 1;
  }

  resetTyped(): void {
    this.typed = 0;
  }
}

function setup(...words: string[]) {
  const board = words.map((word) => new FakeWord(word));
  const targeting = new Targeting<FakeWord>((item, isCandidate) => {
    item.isCandidate = isCandidate;
  });
  const type = (keys: string): Keystroke<FakeWord>[] =>
    [...keys].map((char) => targeting.type(char, board));
  const leave = (item: FakeWord): void => {
    board.splice(board.indexOf(item), 1);
    targeting.forget(item);
  };
  return { board, targeting, type, leave };
}

function misses(keystrokes: readonly Keystroke<FakeWord>[]): number {
  return keystrokes.filter((keystroke) => keystroke.kind === 'miss').length;
}

describe('Targeting', () => {
  it('completes the word the player meant when two words share a first letter', () => {
    const { board, targeting, type } = setup('jjkj', 'jij');
    const [nearest, meant] = board;
    const keystrokes = type('jij');
    expect(misses(keystrokes)).toBe(0);
    expect(keystrokes.at(-1)).toEqual({ kind: 'complete', items: [meant] });
    expect(nearest.typed).toBe(0);
    expect(nearest.isCandidate).toBe(false);
    expect(targeting.candidates).toEqual([]);
  });

  it('completes the longer word when its letters keep matching', () => {
    const { board, type } = setup('jjkj', 'jij');
    const [longer, other] = board;
    const keystrokes = type('jjkj');
    expect(misses(keystrokes)).toBe(0);
    expect(keystrokes.at(-1)).toEqual({ kind: 'complete', items: [longer] });
    expect(other.typed).toBe(0);
  });

  it('advances and marks every enemy that fits the first key', () => {
    const { board, targeting, type } = setup('jjkj', 'jij', 'fjf');
    const [first, second, third] = board;
    type('j');
    expect(targeting.candidates).toEqual([first, second]);
    expect([first.typed, second.typed, third.typed]).toEqual([1, 1, 0]);
    expect([first.isCandidate, second.isCandidate, third.isCandidate]).toEqual([true, true, false]);
  });

  it('drops and resets candidates that stop matching, leaving one locked target', () => {
    const { board, targeting, type } = setup('jjkj', 'jij');
    const [dropped, locked] = board;
    type('ji');
    expect(targeting.candidates).toEqual([locked]);
    expect(locked.typed).toBe(2);
    expect(locked.isCandidate).toBe(true);
    expect(dropped.typed).toBe(0);
    expect(dropped.isCandidate).toBe(false);
  });

  it('counts a wrong key during a shared prefix as one mistake and keeps both candidates', () => {
    const { board, targeting, type } = setup('jjkj', 'jij');
    const keystrokes = type('jx');
    expect(misses(keystrokes)).toBe(1);
    expect(targeting.candidates).toEqual(board);
    expect(board.map((item) => item.typed)).toEqual([1, 1]);
    expect(misses(type('ij'))).toBe(0);
  });

  it('only lets candidates continue a prefix, even when another enemy fits the key', () => {
    const { board, targeting, type } = setup('jjkj', 'jij', 'kot');
    const [, , other] = board;
    expect(type('jk').map((keystroke) => keystroke.kind)).toEqual(['hit', 'miss']);
    expect(other.typed).toBe(0);
    expect(targeting.candidates).not.toContain(other);
  });

  it('treats a key that fits no enemy as a mistake without candidates', () => {
    const { targeting, type } = setup('jjkj', 'jij');
    expect(type('x')).toEqual([{ kind: 'miss' }]);
    expect(targeting.candidates).toEqual([]);
  });

  it('drops a candidate that leaves the board without a mistake', () => {
    const { board, targeting, type, leave } = setup('jjkj', 'jij');
    const [gone, kept] = board;
    type('j');
    leave(gone);
    expect(gone.isCandidate).toBe(false);
    expect(targeting.candidates).toEqual([kept]);
    const keystrokes = type('ij');
    expect(misses(keystrokes)).toBe(0);
    expect(keystrokes.at(-1)).toEqual({ kind: 'complete', items: [kept] });
  });

  it('starts over when every candidate left the board', () => {
    const { board, targeting, type, leave } = setup('jjkj', 'fjf');
    const [gone, other] = board;
    type('j');
    leave(gone);
    expect(targeting.candidates).toEqual([]);
    expect(misses(type('f'))).toBe(0);
    expect(targeting.candidates).toEqual([other]);
  });

  it('completes every enemy that carries the typed word together', () => {
    const { board, targeting, type } = setup('jjf', 'jjf', 'jf');
    const [first, twin, other] = board;
    const keystrokes = type('jjf');
    expect(keystrokes.map((keystroke) => keystroke.kind)).toEqual(['hit', 'hit', 'complete']);
    expect(keystrokes.at(-1)).toEqual({ kind: 'complete', items: [first, twin] });
    expect(other.typed).toBe(0);
    expect(board.map((item) => item.isCandidate)).toEqual([false, false, false]);
    expect(targeting.candidates).toEqual([]);
  });

  it('completes equal single letters together', () => {
    const { board, type } = setup('f', 'f', 'j');
    const [first, twin] = board;
    expect(type('f')).toEqual([{ kind: 'complete', items: [first, twin] }]);
  });

  it('ignores enemies that left the board without being forgotten', () => {
    const { board, targeting, type } = setup('jjkj', 'fjf');
    const [stale, other] = board;
    type('j');
    board.splice(0, 1);
    expect(misses(type('f'))).toBe(0);
    expect(targeting.candidates).toEqual([other]);
    expect(stale.isCandidate).toBe(false);
  });
});
