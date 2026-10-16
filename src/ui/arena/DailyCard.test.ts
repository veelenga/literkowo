import { describe, expect, it, vi } from 'vitest';
import type { DailyRecord } from '../../arena/record';
import { keySetById, type KeySet } from '../../arena/keySets';
import { GOLD, BRONZE } from '../../arena/medals';
import { createProfile, type Profile } from '../../profiles/Profile';
import { dailyCard, dailyKeySet, type DailyCardView } from './DailyCard';

const FRIDAY = '2026-10-16';

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Missing test data');
  return value;
}

const LAS: KeySet = required(keySetById('las', 'pl'));
const GORY: KeySet = required(keySetById('gory', 'pl'));

function record(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    date: FRIDAY,
    keySet: 'las',
    tries: 1,
    best: { score: 900, accuracy: 0.97, seconds: 180, medal: GOLD },
    stamps: ['2026-10-12', '2026-10-13', FRIDAY],
    chests: ['2026-W42/3'],
    weekStreak: 2,
    bestWeekStreak: 2,
    totalStamps: 8,
    ...overrides,
  };
}

function player(name: string, daily?: DailyRecord): Profile {
  const profile = createProfile(name, 'girl');
  return { ...profile, arena: { ...profile.arena, ...(daily ? { daily } : {}) } };
}

function render(view: Partial<DailyCardView> = {}) {
  const profile = view.profile ?? player('Ola');
  const onPlay = vi.fn<(keySet: KeySet) => void>();
  const card = dailyCard(
    { profile, family: [profile], today: FRIDAY, chosen: GORY, ...view },
    onPlay,
  );
  const text = (selector: string) => card.querySelector(selector)?.textContent;
  return { card, onPlay, text };
}

describe('dailyCard', () => {
  it('names the format of the day, its length and the key set of the chip', () => {
    const { text, card } = render();
    expect(text('.daily-title')).toBe('Wyzwanie dnia: Jedno serce');
    expect([...card.querySelectorAll('.daily-tag')].map((tag) => tag.textContent)).toEqual([
      '3 minuty',
      'Góry',
    ]);
    expect(text('.daily-rule')).toBe('Tylko jedno serce, za to wolniej. Uważaj!');
    expect(text('.daily-tries')).toBe('Próby: 0 z 3');
    expect(card.querySelector('.daily-streak')).toBeNull();
    expect(card.querySelector('.daily-board')).toBeNull();
  });

  it('marks the stamps of the week, today and the days ahead', () => {
    const { card } = render({ profile: player('Ola', record()) });
    const stamps = [...card.querySelectorAll('.stamp')];
    expect(stamps.map((stamp) => stamp.querySelector('.stamp-day')?.textContent)).toEqual([
      'Pn',
      'Wt',
      'Śr',
      'Cz',
      'Pt',
      'So',
      'Nd',
    ]);
    expect(stamps.map((stamp) => stamp.classList.contains('is-stamped'))).toEqual([
      true,
      true,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(stamps[4].className).toContain('is-today');
    expect(stamps[5].className).toContain('is-ahead');
    expect(stamps[0].getAttribute('aria-label')).toBe('Pn: pieczątka');
  });

  it('keeps the key set of the first try and shows the tries and the weeks in a row', () => {
    const profile = player('Ola', record());
    const { card, onPlay, text } = render({ profile });
    expect(dailyKeySet({ profile, family: [profile], today: FRIDAY, chosen: GORY }).id).toBe(
      LAS.id,
    );
    expect(card.querySelectorAll('.daily-tag')[1].textContent).toBe('Las');
    expect(text('.daily-tries')).toBe('Próby: 1 z 3');
    expect(text('.daily-streak')).toBe('Tygodnie z rzędu: 2');
    card.querySelector<HTMLButtonElement>('.daily-play')?.click();
    expect(onPlay.mock.lastCall?.[0].id).toBe(LAS.id);
  });

  it('follows the chip again on a new day', () => {
    const profile = player('Ola', record({ date: '2026-10-15' }));
    expect(dailyKeySet({ profile, family: [profile], today: FRIDAY, chosen: GORY })).toBe(GORY);
  });

  it('says a new challenge comes tomorrow after three tries', () => {
    const { card, text } = render({ profile: player('Ola', record({ tries: 3 })) });
    expect(card.querySelector('.daily-play')).toBeNull();
    expect(text('.daily-tomorrow')).toBe('Nowe wyzwanie jutro');
  });

  it('lists who finished today and the family chest with two profiles or more', () => {
    const ola = player('Ola', record());
    const stas = player(
      'Staś',
      record({ best: { score: 1, accuracy: 0.9, seconds: 70, medal: BRONZE } }),
    );
    const ania = player('Ania', record({ date: '2026-10-15', stamps: ['2026-10-15'] }));
    const { card, text } = render({ profile: ola, family: [ola, stas, ania] });
    expect(text('.daily-board')).toBe('Dziś: Ola złoto, Staś brąz');
    expect(text('.daily-family-label')).toBe('Rodzinna skrzynia');
    expect(text('.daily-family-count')).toBe('7 z 10');
    expect(card.querySelector('.daily-family.is-open')).toBeNull();
  });

  it('hides the family chest on a device with one profile', () => {
    const { card } = render({ profile: player('Ola', record()) });
    expect(card.querySelector('.daily-family')).toBeNull();
  });
});
