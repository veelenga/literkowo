import { availableItems } from '../course/inventory';
import type { Unlock } from '../course/shop';
import { rankStartLevel } from '../course/xp';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { el, icon, svg } from './dom';
import { coinIcon } from './progression';
import { unlockHint } from './shopCopy';
import './shop.css';

const VIEW_BOX = '0 0 24 24';

const SHOP_PATHS = {
  trophy:
    'M7 2.5h10v1.8h3.4v2.9a4.3 4.3 0 0 1-4.1 4.3 5.3 5.3 0 0 1-3.2 2.6v2.6h3.3v2.6H7.6v-2.6h3.3v-2.6a5.3 5.3 0 0 1-3.2-2.6 4.3 4.3 0 0 1-4.1-4.3V4.3H7zm0 3.6H5.4v1.1A2.5 2.5 0 0 0 7.1 9.6 6 6 0 0 1 7 8.5zm10 0v2.4a6 6 0 0 1-.1 1.1 2.5 2.5 0 0 0 1.7-2.4V6.1zM6 19.6h12v2H6z',
  bag: 'M5.2 8.2h13.6l-1.2 12.6a1.3 1.3 0 0 1-1.3 1.2H7.7a1.3 1.3 0 0 1-1.3-1.2zM8.4 8.2V7a3.6 3.6 0 0 1 7.2 0v1.2h-2V7a1.6 1.6 0 0 0-3.2 0v1.2z',
  back: 'M15.2 4.4 7.6 12l7.6 7.6 1.8-1.8L11.2 12 17 6.2z',
} as const;

type ShopIconName = keyof typeof SHOP_PATHS;

export function shopIcon(name: ShopIconName, className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: VIEW_BOX, class: className, 'aria-hidden': 'true' },
    svg('path', { d: SHOP_PATHS[name], 'fill-rule': 'evenodd' }),
  );
}

export function lockBadge(unlock: Unlock): HTMLElement | null {
  if (unlock.by === 'free') return null;
  const hint = unlockHint(unlock);
  const value =
    unlock.by === 'coins'
      ? [coinIcon('lock-badge-coin'), String(unlock.price)]
      : [el('span', { class: 'lock-badge-level', text: String(rankStartLevel(unlock.rank)) })];
  return el(
    'span',
    { class: `lock-badge is-${unlock.by}`, title: hint, 'aria-label': hint },
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
      class: hasNews ? 'shop-button has-news' : 'shop-button',
      title: label,
      'aria-label': label,
      onClick: onOpen,
    },
    shopIcon('bag', 'shop-button-icon'),
    el('span', { class: 'shop-button-label', text: copy.open }),
    hasNews ? el('span', { class: 'shop-button-dot', 'aria-hidden': 'true' }) : null,
  );
}
