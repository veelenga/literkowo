import type { ArenaGoal } from '../arena/goals';
import { availableItems } from '../course/inventory';
import type { Unlock } from '../course/shop';
import { rankStartLevel } from '../course/xp';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { el, icon, svg, type Child } from './dom';
import { coinIcon, coinPill } from './progression';
import { unlockHint } from './shopCopy';
import { ESCAPE_LABEL, shortcutHint } from './shortcutHint';
import './shop.css';

const VIEW_BOX = '0 0 24 24';
const HEADER_CLASS = 'shop-header';

const SHOP_PATHS = {
  trophy:
    'M7 2.5h10v1.8h3.4v2.9a4.3 4.3 0 0 1-4.1 4.3 5.3 5.3 0 0 1-3.2 2.6v2.6h3.3v2.6H7.6v-2.6h3.3v-2.6a5.3 5.3 0 0 1-3.2-2.6 4.3 4.3 0 0 1-4.1-4.3V4.3H7zm0 3.6H5.4v1.1A2.5 2.5 0 0 0 7.1 9.6 6 6 0 0 1 7 8.5zm10 0v2.4a6 6 0 0 1-.1 1.1 2.5 2.5 0 0 0 1.7-2.4V6.1zM6 19.6h12v2H6z',
  bag: 'M5.2 8.2h13.6l-1.2 12.6a1.3 1.3 0 0 1-1.3 1.2H7.7a1.3 1.3 0 0 1-1.3-1.2zM8.4 8.2V7a3.6 3.6 0 0 1 7.2 0v1.2h-2V7a1.6 1.6 0 0 0-3.2 0v1.2z',
  back: 'M15.2 4.4 7.6 12l7.6 7.6 1.8-1.8L11.2 12 17 6.2z',
  bolt: 'M13.6 2 4.8 13.4h6.1L9.9 22l9.3-12.1h-6.3z',
} as const;

type ShopIconName = keyof typeof SHOP_PATHS;

export interface ScreenHeaderOptions {
  readonly backLabel: string;
  readonly onBack: () => void;
  readonly title: string;
  readonly trailing?: HTMLElement;
  readonly className?: string;
}

export function shopIcon(name: ShopIconName, className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: VIEW_BOX, class: className, 'aria-hidden': 'true' },
    svg('path', { d: SHOP_PATHS[name], 'fill-rule': 'evenodd' }),
  );
}

export function screenHeader({
  backLabel,
  onBack,
  title,
  trailing,
  className,
}: ScreenHeaderOptions): HTMLElement {
  return el(
    'header',
    { class: className ? `${HEADER_CLASS} ${className}` : HEADER_CLASS },
    el(
      'button',
      { class: 'button button-ghost shop-back', type: 'button', onClick: onBack },
      shopIcon('back', 'shop-back-icon'),
      backLabel,
      shortcutHint(ESCAPE_LABEL),
    ),
    el('h1', { class: 'logo logo-small shop-title', text: title }),
    trailing,
  );
}

export function headerCoins(coins: number): HTMLElement {
  return coinPill(String(coins), 'stat-pill shop-coin-pill');
}

export function lockBadge(unlock: Unlock): HTMLElement | null {
  if (unlock.by === 'free') return null;
  return badge(`lock-badge is-${unlock.by}`, unlockHint(unlock), ...badgeValue(unlock));
}

function badgeValue(unlock: Exclude<Unlock, { by: 'free' }>): Child[] {
  switch (unlock.by) {
    case 'coins':
      return [coinIcon('lock-badge-coin'), String(unlock.price)];
    case 'rank':
      return [el('span', { class: 'lock-badge-level', text: String(rankStartLevel(unlock.rank)) })];
    case 'arena':
      return [arenaGoalMark(unlock.goal)];
  }
}

function arenaGoalMark(goal: ArenaGoal): HTMLElement {
  if (goal.kind === 'gold')
    return el('span', { class: 'lock-badge-arena' }, icon('star', 'lock-badge-star'));
  return el('span', { class: 'lock-badge-arena', text: String(goal.wave) });
}

export function hintedLockBadge(hint: string): HTMLElement {
  return badge('lock-badge', hint);
}

function badge(className: string, hint: string | undefined, ...value: Child[]): HTMLElement {
  return el(
    'span',
    { class: className, title: hint, 'aria-label': hint },
    icon('lock', 'lock-badge-icon'),
    ...value,
  );
}

export function shopButton(profile: Profile, onOpen: () => void): HTMLElement {
  const copy = i18n.t.features.shop;
  const hasNews = availableItems(profile).length > 0;
  const label = hasNews ? `${copy.open}. ${copy.newInShop}` : copy.open;
  return el(
    'button',
    {
      class: hasNews ? 'header-button has-news' : 'header-button',
      title: label,
      'aria-label': label,
      onClick: onOpen,
    },
    shopIcon('bag', 'header-button-icon'),
    el('span', { class: 'header-button-label', text: copy.open }),
    hasNews ? el('span', { class: 'header-button-dot', 'aria-hidden': 'true' }) : null,
  );
}
