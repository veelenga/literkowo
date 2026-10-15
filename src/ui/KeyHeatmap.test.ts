import { describe, expect, it } from 'vitest';
import { EMPTY_KEY_STAT, recordHit, recordMiss } from '../course/keyStats';
import { heatHue, keyHeatmap } from './KeyHeatmap';

function key(heatmap: HTMLElement, id: string): HTMLElement {
  const element = heatmap.querySelector<HTMLElement>(`.heat-key[data-key="${id}"]`);
  if (!element) throw new Error(`Missing key ${id}`);
  return element;
}

describe('heatHue', () => {
  it('runs from red for weak keys to green for accurate keys', () => {
    expect(heatHue(0.5)).toBe(0);
    expect(heatHue(0.85)).toBe(65);
    expect(heatHue(1)).toBe(130);
  });
});

describe('keyHeatmap', () => {
  it('lays out the letter rows of the keyboard', () => {
    const heatmap = keyHeatmap({});
    expect(heatmap.querySelectorAll('.key-row')).toHaveLength(3);
    expect(heatmap.querySelectorAll('.heat-key')).toHaveLength(29);
  });

  it('tints practised keys by accuracy and greys out the rest', () => {
    const heatmap = keyHeatmap({ f: recordHit(EMPTY_KEY_STAT), j: recordMiss(EMPTY_KEY_STAT) });
    expect(key(heatmap, 'f').style.getPropertyValue('--heat')).toBe('130');
    expect(key(heatmap, 'f').title).toBe('F: 100%');
    expect(key(heatmap, 'j').style.getPropertyValue('--heat')).toBe('0');
    expect(key(heatmap, 'k').classList.contains('is-empty')).toBe(true);
  });

  it('marks a practised Polish letter on its base key', () => {
    const heatmap = keyHeatmap({ ą: recordHit(EMPTY_KEY_STAT) });
    const mark = key(heatmap, 'a').querySelector('.heat-alt');
    expect(mark?.textContent).toBe('ą');
    expect(key(heatmap, 'e').querySelector('.heat-alt')).toBeNull();
  });
});
