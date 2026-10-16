import { describe, expect, it } from 'vitest';
import { createProfile } from '../profiles/Profile';
import { Hud } from './Hud';

const NO_ACTIONS = {
  onMap: () => undefined,
  onPause: () => undefined,
  onKeyboard: () => undefined,
};

function hud(): Hud {
  return new Hud(createProfile('Ola', 'girl'), NO_ACTIONS, { lives: 3, xpFactor: 1 });
}

function count(element: HTMLElement): string | null | undefined {
  return element.querySelector('.progress-count')?.textContent;
}

describe('Hud', () => {
  it('counts words of an untimed phase', () => {
    const view = hud();
    view.progress({ kind: 'words', done: 3, total: 12, timed: false });
    expect(count(view.element)).toBe('3/12');
  });

  it('shows seconds left under a minute', () => {
    const view = hud();
    view.progress({ kind: 'test', done: 2.5, total: 12, timed: true });
    expect(count(view.element)).toBe('10 s');
  });

  it('shows minutes and seconds left from a minute up', () => {
    const view = hud();
    view.progress({ kind: 'words', done: 19.2, total: 180, timed: true, wave: 2 });
    expect(count(view.element)).toBe('2:41');
    expect(view.element.querySelector('.progress-label')?.textContent).toBe('Fala 2');
  });
});
