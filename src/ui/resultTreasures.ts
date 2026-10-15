import type { Trophy } from '../course/shop';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { arenaIcon } from './arena/arenaParts';
import { el } from './dom';
import './resultTreasures.css';
import type { ShopTab } from './ShopScreen';
import { trophyCopy } from './shopCopy';
import { shopIcon } from './shopParts';

const TROPHY_TAB: ShopTab = 'trophy';
const GO_MARK = '›';

export interface Treasures {
  readonly trophies: readonly Trophy[];
  readonly newItems: boolean;
  readonly arenaOpened: boolean;
}

export type OpenShop = (tab?: ShopTab) => void;

interface ShopChip {
  readonly className: string;
  readonly symbol: SVGSVGElement;
  readonly text: string;
  readonly style?: string;
}

export function treasuresNote(
  { trophies, newItems, arenaOpened }: Treasures,
  onShop: OpenShop,
): HTMLElement | null {
  if (trophies.length === 0 && !newItems && !arenaOpened) return null;
  const copy = i18n.t.features.shop;
  return el(
    'div',
    { class: 'result-treasures', 'aria-live': 'polite' },
    arenaOpened
      ? el(
          'span',
          { class: 'treasure-chip is-arena' },
          arenaIcon('treasure-icon'),
          i18n.t.features.arena.opened,
        )
      : null,
    ...trophies.map((trophy) =>
      shopChip(
        {
          className: 'treasure-chip',
          symbol: shopIcon('trophy', 'treasure-icon'),
          text: format(copy.newItem, { name: trophyCopy(trophy).name }),
          style: `--trophy: ${trophy.color}`,
        },
        () => onShop(TROPHY_TAB),
      ),
    ),
    newItems
      ? shopChip(
          {
            className: 'treasure-chip is-shop',
            symbol: shopIcon('bag', 'treasure-icon'),
            text: copy.newInShop,
          },
          () => onShop(),
        )
      : null,
  );
}

function shopChip(chip: ShopChip, onClick: () => void): HTMLButtonElement {
  return el(
    'button',
    {
      class: `${chip.className} is-link`,
      type: 'button',
      title: i18n.t.features.shop.open,
      style: chip.style,
      onClick,
    },
    chip.symbol,
    chip.text,
    el('span', { class: 'treasure-go', 'aria-hidden': 'true', text: GO_MARK }),
  );
}
