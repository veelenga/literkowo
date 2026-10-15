import type { Trophy } from '../course/shop';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el } from './dom';
import { trophyCopy } from './shopCopy';
import { shopIcon } from './shopParts';

export interface Treasures {
  readonly trophies: readonly Trophy[];
  readonly newItems: boolean;
}

export function treasuresNote({ trophies, newItems }: Treasures): HTMLElement | null {
  if (trophies.length === 0 && !newItems) return null;
  const copy = i18n.t.features.shop;
  return el(
    'div',
    { class: 'result-treasures', 'aria-live': 'polite' },
    ...trophies.map((trophy) =>
      el(
        'span',
        { class: 'treasure-chip', style: `--trophy: ${trophy.color}` },
        shopIcon('trophy', 'treasure-icon'),
        format(copy.newItem, { name: trophyCopy(trophy).name }),
      ),
    ),
    newItems
      ? el(
          'span',
          { class: 'treasure-chip is-shop' },
          shopIcon('bag', 'treasure-icon'),
          copy.newInShop,
        )
      : null,
  );
}
