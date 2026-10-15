import type { Unlock } from '../course/shop';
import { rankStartLevel } from '../course/xp';
import { el, icon } from './dom';
import { coinIcon } from './progression';
import { unlockHint } from './shopCopy';
import './shop.css';

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
