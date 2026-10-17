import { describe, expect, it, vi } from 'vitest';
import type { DailyRecord } from '../../arena/record';
import { SILVER } from '../../arena/medals';
import { createProfile, type Profile } from '../../profiles/Profile';
import { arenaButton, dailyMedalDot } from './arenaParts';

const FRIDAY = '2026-10-16';
const DAILY: DailyRecord = {
  date: FRIDAY,
  keySet: 'polana',
  tries: 2,
  best: { score: 900, accuracy: 0.95, seconds: 180, medal: SILVER },
  stamps: [FRIDAY],
  chests: [],
  weekStreak: 0,
  bestWeekStreak: 0,
  totalStamps: 1,
};

function player(open: boolean, daily?: DailyRecord): Profile {
  const profile = createProfile('Ola', 'girl');
  const placement = open ? { placement: { regionId: 'polana', date: FRIDAY } } : {};
  return { ...profile, arena: { ...profile.arena, ...placement, ...(daily ? { daily } : {}) } };
}

function dotOf(profile: Profile): Element | null {
  return arenaButton(profile, vi.fn(), FRIDAY).querySelector('.daily-dot');
}

describe('arenaButton', () => {
  it('shows a quiet dot while the daily of today waits', () => {
    expect(dotOf(player(true))).not.toBeNull();
    expect(dotOf(player(true, { ...DAILY, date: '2026-10-15' }))).not.toBeNull();
    expect(arenaButton(player(true), vi.fn(), FRIDAY).title).toBe('Arena. Wyzwanie dnia czeka');
  });

  it('hides the dot once today is played', () => {
    expect(dotOf(player(true, DAILY))).toBeNull();
    expect(dotOf(player(false))).not.toBeNull();
  });
});

describe('dailyMedalDot', () => {
  it('shows the best medal of today once the daily is done', () => {
    const dot = dailyMedalDot(player(true, DAILY), FRIDAY);
    expect(dot?.className).toContain('is-silver');
    expect(dot?.getAttribute('aria-label')).toBe('Wyzwanie dnia: Srebro');
  });

  it('shows nothing before the first finished try of the day', () => {
    expect(dailyMedalDot(player(true), FRIDAY)).toBeNull();
    expect(dailyMedalDot(player(true, { ...DAILY, date: '2026-10-15' }), FRIDAY)).toBeNull();
  });
});
