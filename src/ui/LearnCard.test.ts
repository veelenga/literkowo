import { describe, expect, it } from 'vitest';
import { i18n } from '../i18n/i18n';
import { requireLevel } from '../testing/levels';
import { learnCard } from './LearnCard';

function card(levelId: string): HTMLElement {
  const overlay = learnCard(requireLevel(levelId), {}, () => undefined);
  overlay.dispose();
  return overlay.element;
}

function keys(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.keycap-letter')].map((key) => key.textContent ?? '');
}

describe('learnCard', () => {
  it('shows the one new key with its finger and the hands', () => {
    const element = card('polana-4');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Nowy klawisz');
    expect(keys(element)).toEqual(['D']);
    expect(element.querySelector('.keycap-caption')?.textContent).toBe('lewy środkowy');
    expect(element.querySelector('.hands')).not.toBeNull();
  });

  it('shows both index finger keys on the first level', () => {
    const element = card('polana-1');
    expect(element.querySelector('.eyebrow')?.textContent).toBe(i18n.t.newKeys);
    expect(keys(element)).toEqual(['F', 'J']);
  });

  it('says in one line what a practice level is', () => {
    const element = card('polana-5');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Trening');
    expect(element.querySelector('.learn-hint')?.textContent).toBe(
      i18n.t.features.course.hints.practice,
    );
    expect(element.querySelector('.hands')).toBeNull();
  });

  it('says in one line what a review level is', () => {
    const element = card('polana-8');
    expect(element.querySelector('.eyebrow')?.textContent).toBe('Powtórka');
    expect(element.querySelector('.learn-hint')?.textContent).toBe(
      i18n.t.features.course.hints.review,
    );
    expect(keys(element)).toEqual(['D', 'K']);
  });
});
