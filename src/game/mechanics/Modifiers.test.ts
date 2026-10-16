// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { fakeBoard } from '../../testing/enemyBoard';
import type { Modifier, Phase } from '../RunPlan';
import { DARKNESS_CLASS } from './bossPhases/Darkness';
import { Modifiers } from './Modifiers';

const MASK = '•';

function phase(modifiers: readonly Modifier[] = []): Phase {
  return { kind: 'words', count: 10, speed: 1, spawnInterval: 2, modifiers };
}

function labelText(label: HTMLElement): string {
  return label.textContent ?? '';
}

describe('Modifiers', () => {
  afterEach(() => document.body.classList.remove(DARKNESS_CLASS));

  it('shows only the next letter of every word in the fog', () => {
    const board = fakeBoard();
    const early = board.enemyAt(5, 'kotek');
    const mechanic = new Modifiers(board.context);
    mechanic.onPhaseChange(phase(['fog']));
    const late = board.enemyAt(6, 'lasy');
    mechanic.onSpawn(late);
    expect(labelText(early.label)).toBe(`k${MASK.repeat(4)}`);
    expect(labelText(late.label)).toBe(`l${MASK.repeat(3)}`);
  });

  it('leaves the labels whole without fog', () => {
    const board = fakeBoard();
    const mechanic = new Modifiers(board.context);
    mechanic.onPhaseChange(phase());
    const enemy = board.enemyAt(5, 'kotek');
    mechanic.onSpawn(enemy);
    expect(labelText(enemy.label)).toBe('kotek');
  });

  it('keeps the darkness for the whole run and lifts it when the run ends', () => {
    const mechanic = new Modifiers(fakeBoard().context);
    mechanic.onPhaseChange(phase(['darkness']));
    expect(document.body.classList.contains(DARKNESS_CLASS)).toBe(true);
    document.body.classList.remove(DARKNESS_CLASS);
    mechanic.update();
    expect(document.body.classList.contains(DARKNESS_CLASS)).toBe(true);
    mechanic.dispose();
    expect(document.body.classList.contains(DARKNESS_CLASS)).toBe(false);
  });

  it('never touches the darkness of a run without the modifier', () => {
    const mechanic = new Modifiers(fakeBoard().context);
    mechanic.onPhaseChange(phase(['fog']));
    document.body.classList.add(DARKNESS_CLASS);
    mechanic.update();
    mechanic.dispose();
    expect(document.body.classList.contains(DARKNESS_CLASS)).toBe(true);
  });
});
