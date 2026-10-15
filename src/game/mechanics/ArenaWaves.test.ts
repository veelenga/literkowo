// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fakeMechanicContext } from '../../testing/mechanicContext';
import type { Phase } from '../RunPlan';
import { ArenaWaves, WAVE_ACCENT } from './ArenaWaves';
import type { MechanicContext } from './Mechanic';

const WORDS: Phase = { kind: 'words', count: 10, speed: 1, spawnInterval: 2 };

function wave(number: number, kind: Phase['kind'] = 'words'): Phase {
  return { ...WORDS, kind, wave: number };
}

function setup() {
  const announce = vi.fn<MechanicContext['announce']>();
  const absorbNextHit = vi.fn<MechanicContext['absorbNextHit']>();
  const waves = new ArenaWaves(fakeMechanicContext({ announce, absorbNextHit }));
  return { waves, announce, absorbNextHit };
}

describe('ArenaWaves', () => {
  it('shows a banner with the number at the start of each wave', () => {
    const { waves, announce } = setup();
    waves.onPhaseChange(wave(1));
    waves.onPhaseChange(wave(4));
    expect(announce).toHaveBeenNthCalledWith(1, 'Fala 1', 'banner', WAVE_ACCENT);
    expect(announce).toHaveBeenNthCalledWith(2, 'Fala 4', 'banner', WAVE_ACCENT);
  });

  it('stays quiet in a course level', () => {
    const { waves, announce, absorbNextHit } = setup();
    waves.onPhaseChange({ ...WORDS, kind: 'boss' });
    waves.onPhaseChange(WORDS);
    expect(announce).not.toHaveBeenCalled();
    expect(absorbNextHit).not.toHaveBeenCalled();
  });

  it('grants a shield once the boss wave is beaten', () => {
    const { waves, announce, absorbNextHit } = setup();
    waves.onPhaseChange(wave(4));
    waves.onPhaseChange(wave(5, 'boss'));
    expect(absorbNextHit).not.toHaveBeenCalled();
    waves.onPhaseChange(wave(6));
    expect(absorbNextHit).toHaveBeenCalledOnce();
    expect(announce).toHaveBeenCalledWith('Tarcza za bossa!', 'callout', expect.any(String));
    waves.dispose();
  });
});
