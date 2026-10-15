import type { ArenaDifficulty } from '../../arena/difficulty';
import { isArenaOpen, type ArenaProfile } from '../../arena/keySets';
import { nextMedalGoal, type Medal } from '../../arena/medals';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { el, icon, svg } from '../dom';
import { hintedLockBadge } from '../shopParts';
import '../arena.css';

type MedalKey = 'none' | 'bronze' | 'silver' | 'gold';

const MEDAL_KEYS: Readonly<Record<Medal, MedalKey>> = {
  0: 'none',
  1: 'bronze',
  2: 'silver',
  3: 'gold',
};

const ARENA_ICON_PATH =
  'M12 2.2 3.8 5.4v6.1c0 5 3.5 8.9 8.2 10.3 4.7-1.4 8.2-5.3 8.2-10.3V5.4zm0 4.6 1.5 3.1 3.4.4-2.5 2.4.7 3.4-3.1-1.7-3.1 1.7.7-3.4-2.5-2.4 3.4-.4z';

export function arenaIcon(className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true' },
    svg('path', { d: ARENA_ICON_PATH, 'fill-rule': 'evenodd' }),
  );
}

export function medalName(medal: Medal): string {
  return i18n.t.features.arena.medals[MEDAL_KEYS[medal]];
}

export function medalBadge(medal: Medal, className = 'medal'): HTMLElement {
  const name = medalName(medal);
  return el(
    'span',
    { class: `${className} is-${MEDAL_KEYS[medal]}`, title: name, 'aria-label': name },
    icon('star', 'medal-star'),
  );
}

export function nextMedalHint(medal: Medal): string {
  const copy = i18n.t.features.arena;
  const goal = nextMedalGoal(medal);
  if (!goal) return copy.topMedal;
  return format(copy.nextMedal, {
    medal: medalName(medal),
    next: medalName(goal.medal),
    wave: goal.waves,
    accuracy: goal.accuracyPercent,
  });
}

export function difficultyName({ id }: Pick<ArenaDifficulty, 'id'>): string {
  return i18n.t.features.arena.difficulties[id];
}

export function waveLabel(wave: number): string {
  return format(i18n.t.features.arena.wave, { wave });
}

export function arenaButton(profile: ArenaProfile, onOpen: () => void): HTMLElement {
  const copy = i18n.t.features.arena;
  const open = isArenaOpen(profile);
  const label = open ? copy.open : `${copy.open}. ${copy.locked}`;
  return el(
    'button',
    {
      class: open ? 'header-button arena-button' : 'header-button arena-button is-locked',
      title: label,
      'aria-label': label,
      onClick: onOpen,
    },
    arenaIcon('header-button-icon'),
    el('span', { class: 'header-button-label', text: copy.open }),
    open ? null : hintedLockBadge(copy.locked),
  );
}
