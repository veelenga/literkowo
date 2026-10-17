// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fakeClaims } from '../../testing/claims';
import { fakeBoard } from '../../testing/enemyBoard';
import type { Modifier, Phase } from '../RunPlan';
import { Darkness, DARKNESS_CLASS, DARKNESS_SECONDS } from './bossPhases/Darkness';
import { Modifiers } from './Modifiers';

const MASK = '•';
const AFTER_DARKNESS = DARKNESS_SECONDS + 1;

function phase(modifiers: readonly Modifier[] = []): Phase {
  return { kind: 'words', count: 10, speed: 1, spawnInterval: 2, modifiers };
}

function labelText(label: HTMLElement): string {
  return label.textContent ?? '';
}

function setup() {
  const claims = fakeClaims();
  const board = fakeBoard(claims.context);
  const isDark = () => claims.hasPageClass(DARKNESS_CLASS);
  return { ...board, isDark, mechanic: new Modifiers(board.context) };
}

describe('Modifiers', () => {
  it('shows only the next letter of every word in the fog', () => {
    const { enemyAt, mechanic } = setup();
    const early = enemyAt(5, 'kotek');
    mechanic.onPhaseChange(phase(['fog']));
    const late = enemyAt(6, 'lasy');
    mechanic.onSpawn(late);
    expect(labelText(early.label)).toBe(`k${MASK.repeat(4)}`);
    expect(labelText(late.label)).toBe(`l${MASK.repeat(3)}`);
  });

  it('leaves the labels whole without fog', () => {
    const { enemyAt, mechanic } = setup();
    mechanic.onPhaseChange(phase());
    const enemy = enemyAt(5, 'kotek');
    mechanic.onSpawn(enemy);
    expect(labelText(enemy.label)).toBe('kotek');
  });

  it('keeps the darkness for the whole run and lifts it when the run ends', () => {
    const { context, isDark, mechanic } = setup();
    mechanic.onPhaseChange(phase(['darkness']));
    expect(isDark()).toBe(true);
    const attack = new Darkness(context);
    attack.strike();
    attack.update(AFTER_DARKNESS);
    expect(isDark()).toBe(true);
    mechanic.onPhaseChange(phase(['darkness']));
    expect(isDark()).toBe(true);
    mechanic.dispose();
    expect(isDark()).toBe(false);
  });

  it('never touches the darkness of a run without the modifier', () => {
    const { context, isDark, mechanic } = setup();
    mechanic.onPhaseChange(phase(['fog']));
    const attack = new Darkness(context);
    attack.strike();
    mechanic.dispose();
    expect(isDark()).toBe(true);
    attack.stop();
    expect(isDark()).toBe(false);
  });
});
