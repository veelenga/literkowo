import {
  DAILY_TRIES,
  FAMILY_CHEST,
  dailyDay,
  familyStamps,
  hasFamilyChest,
  shownWeekStreak,
  triesLeft,
  weekCard,
} from '../../arena/daily';
import { deviceBoard, type BoardEntry } from '../../arena/dailyProgress';
import { formatOn, type DailyFormat } from '../../arena/formats';
import { keySetById, type KeySet } from '../../arena/keySets';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import type { Profile } from '../../profiles/Profile';
import { el, svg } from '../dom';
import { xpBar } from '../progression';
import { medalName } from './arenaParts';
import { stampRow } from './stampRow';
import '../daily.css';

export interface DailyCardView {
  readonly profile: Profile;
  readonly family: readonly Profile[];
  readonly today: string;
  readonly chosen: KeySet;
}

const FAMILY_SIZE = 2;
const DAILY_ICON_PATH =
  'M7 2.5h2v2h6v-2h2v2h2.5A1.5 1.5 0 0 1 21 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5V6a1.5 1.5 0 0 1 1.5-1.5H7zM5 9v10h14V9zm7 1.4 1.3 2.6 2.8.4-2 2 .5 2.8-2.6-1.4-2.6 1.4.5-2.8-2-2 2.8-.4z';
const SECONDS_PER_MINUTE = 60;
const FIRST_MINUTE = 1;
const BOARD_SEPARATOR = ', ';

export function dailyKeySet(view: DailyCardView): KeySet {
  const fixed = dailyDay(view.profile.arena.daily, view.today).keySet;
  const pinned = fixed === undefined ? undefined : keySetById(fixed, view.profile.wordLanguage);
  return pinned ?? view.chosen;
}

export function dailyCard(view: DailyCardView, onPlay: (keySet: KeySet) => void): HTMLElement {
  const copy = i18n.t.features.daily;
  const daily = formatOn(view.today);
  const keySet = dailyKeySet(view);
  return el(
    'article',
    { class: 'shop-item daily-card', 'data-mode': 'daily', 'data-format': daily.id },
    el('div', { class: 'shop-item-art arena-mode-art daily-art' }, dailyIcon()),
    el('h3', {
      class: 'shop-item-name daily-title',
      text: format(copy.title, { format: formatName(daily) }),
    }),
    el('p', { class: 'shop-item-text daily-rule', text: copy.formats[daily.id].rule }),
    stampRow(weekCard(view.profile.arena.daily, view.today)),
    infoLine(view, daily, keySet),
    boardLine(deviceBoard(view.family, view.today)),
    familyBar(view),
    playOrWait(view, () => onPlay(keySet)),
  );
}

export function formatName({ id }: Pick<DailyFormat, 'id'>): string {
  return i18n.t.features.daily.formats[id].name;
}

export function minutesText(seconds: number): string {
  const minutes = i18n.t.features.daily.minutes;
  return minutes[Math.round(seconds / SECONDS_PER_MINUTE) - FIRST_MINUTE] ?? minutes[0];
}

function dailyIcon(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: 'arena-mode-icon', 'aria-hidden': 'true' },
    svg('path', { d: DAILY_ICON_PATH, 'fill-rule': 'evenodd' }),
  );
}

function infoLine(
  { profile, today }: DailyCardView,
  daily: DailyFormat,
  keySet: KeySet,
): HTMLElement {
  const copy = i18n.t.features.daily;
  const record = profile.arena.daily;
  const weeks = shownWeekStreak(record, today);
  return el(
    'div',
    { class: 'daily-info' },
    el('span', { class: 'stat-pill daily-tag', text: minutesText(daily.seconds) }),
    el('span', { class: 'stat-pill daily-tag', text: keySet.region.name[i18n.current] }),
    el('span', {
      class: 'daily-tries',
      text: format(copy.tries, { used: dailyDay(record, today).tries, total: DAILY_TRIES }),
    }),
    weeks > 0
      ? el('span', { class: 'daily-streak', text: format(copy.weekStreak, { weeks }) })
      : null,
  );
}

function boardLine(entries: readonly BoardEntry[]): HTMLElement | null {
  if (entries.length === 0) return null;
  const copy = i18n.t.features.daily;
  const players = entries
    .map(({ name, medal }) =>
      format(copy.boardEntry, { name, medal: medalName(medal).toLocaleLowerCase(i18n.current) }),
    )
    .join(BOARD_SEPARATOR);
  return el('p', { class: 'daily-board', text: format(copy.board, { players }) });
}

function familyBar({ profile, family, today }: DailyCardView): HTMLElement | null {
  if (family.length < FAMILY_SIZE) return null;
  const copy = i18n.t.features.daily;
  const goal = FAMILY_CHEST.stamps;
  const stamps = Math.min(
    goal,
    familyStamps(
      family.map((member) => member.arena.daily),
      today,
    ),
  );
  const open = hasFamilyChest(profile.arena.daily, today);
  return el(
    'div',
    { class: open ? 'daily-family is-open' : 'daily-family' },
    el('span', { class: 'daily-family-label', text: copy.family }),
    xpBar(stamps / goal, 'xp-bar xp-bar-thin daily-family-bar').element,
    el('span', { class: 'daily-family-count', text: format(copy.familyCount, { stamps, goal }) }),
  );
}

function playOrWait({ profile, today }: DailyCardView, onPlay: () => void): HTMLElement {
  if (triesLeft(profile.arena.daily, today) === 0) {
    return el('p', { class: 'daily-tomorrow', text: i18n.t.features.daily.tomorrow });
  }
  return el('button', {
    class: 'button button-primary button-large daily-play',
    text: i18n.t.play,
    onClick: onPlay,
  });
}
