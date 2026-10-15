import { sfx } from '../audio/Sfx';
import {
  buy,
  equip,
  itemState,
  unequip,
  type ItemState,
  type WearableKind,
} from '../course/inventory';
import {
  itemKey,
  itemsOf,
  priceOf,
  TROPHIES,
  type ItemKind,
  type ShopItem,
  type Trophy,
  type Unlock,
} from '../course/shop';
import { format, formatParts } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { releasePortraits } from './CharacterPortraits';
import { confetti } from './confetti';
import { el, type Child } from './dom';
import { itemPreview, releaseItemPreviews } from './ItemPreviews';
import { coinIcon, coinPill } from './progression';
import { ShopHero } from './ShopHero';
import { itemDescription, itemName, rankTitle, trophyCopy } from './shopCopy';
import { lockBadge, shopIcon } from './shopParts';

export type ShopTab = ItemKind | 'trophy';

export const SHOP_TABS: readonly ShopTab[] = ['pet', 'hat', 'skin', 'trophy'];

const BUY_CHIMES = { midis: [72, 76, 79, 84], spacing: 0.08, decay: 0.5 } as const;
const WEAR_CHIMES = { midis: [79, 84], spacing: 0.06, decay: 0.3 } as const;
const FRESH_CLASS = 'is-fresh';
const ENTERING_CLASS = 'is-entering';
const CONFETTI_PIECES = 20;

interface ShopActions {
  onBack: (profile: Profile) => void;
  onChange: (profile: Profile) => void;
}

export class ShopScreen {
  readonly element = el('div', { class: 'screen shop-screen' });
  private readonly hero = new ShopHero();
  private readonly coins = el('div', { class: 'shop-coins' });
  private readonly catalogue = el('section', { class: 'shop-catalogue' });
  private tab: ShopTab = SHOP_TABS[0];

  constructor(
    private profile: Profile,
    private readonly actions: ShopActions,
  ) {
    this.element.append(
      this.header(),
      el('main', { class: 'shop-layout' }, this.hero.element, this.catalogue),
    );
    this.refresh(true);
  }

  dispose(): void {
    this.hero.dispose();
    releaseItemPreviews();
    releasePortraits();
  }

  private header(): HTMLElement {
    const copy = i18n.t.features.shop;
    return el(
      'header',
      { class: 'shop-header' },
      el(
        'button',
        {
          class: 'button button-ghost shop-back',
          onClick: () => this.actions.onBack(this.profile),
        },
        shopIcon('back', 'shop-back-icon'),
        copy.back,
      ),
      el('h1', { class: 'logo logo-small shop-title', text: copy.title }),
      this.coins,
    );
  }

  private refresh(entering = false): void {
    this.catalogue.classList.toggle(ENTERING_CLASS, entering);
    this.coins.replaceChildren(coinPill(String(this.profile.coins), 'stat-pill shop-coin-pill'));
    this.hero.show(this.profile);
    this.catalogue.replaceChildren(this.tabs(), this.content());
  }

  private tabs(): HTMLElement {
    const labels = i18n.t.features.shop.tabs;
    return el(
      'nav',
      { class: 'segmented shop-tabs' },
      ...SHOP_TABS.map((tab) =>
        el('button', {
          class: tab === this.tab ? 'chip is-active' : 'chip',
          text: labels[tab],
          'aria-pressed': String(tab === this.tab),
          onClick: () => this.open(tab),
        }),
      ),
    );
  }

  private open(tab: ShopTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.refresh(true);
  }

  private content(): HTMLElement {
    if (this.tab === 'trophy') return this.trophies();
    return el(
      'div',
      { class: 'shop-grid' },
      ...itemsOf(this.tab).map((item) => this.itemCard(item)),
    );
  }

  private itemCard(item: ShopItem): HTMLElement {
    const state = itemState(this.profile, item);
    const description = itemDescription(item);
    return el(
      'article',
      { class: `shop-item is-${state}`, 'data-item': itemKey(item) },
      el(
        'div',
        { class: 'shop-item-art' },
        itemPreview(item),
        state === 'rankLocked' ? lockBadge(item.unlock) : null,
      ),
      el('h3', { class: 'shop-item-name', text: itemName(item) }),
      description ? el('p', { class: 'shop-item-text', text: description }) : null,
      el('div', { class: 'shop-item-footer' }, ...this.itemFooter(item, state)),
    );
  }

  private itemFooter(item: ShopItem, state: ItemState): Child[] {
    const copy = i18n.t.features.shop;
    const wearable = wearableKind(item);
    switch (state) {
      case 'equipped':
        return [
          el('span', { class: 'shop-tag', text: copy.inUse }),
          wearable ? this.button(copy.unequip, 'button-ghost', () => this.takeOff(wearable)) : null,
        ];
      case 'owned':
        return [this.button(copy.equip[item.kind], '', () => this.wear(item))];
      case 'buyable':
        return [this.button(copy.buy, 'button-primary', () => this.get(item), priceOf(item))];
      case 'claimable':
        return [this.button(copy.claim, 'button-primary', () => this.get(item))];
      case 'tooExpensive':
        return [coinAmount(priceOf(item), 'shop-price'), missingNote(priceOf(item), this.profile)];
      case 'rankLocked':
        return [rankNote(item.unlock)];
    }
  }

  private button(
    label: string,
    variant: string,
    onClick: () => void,
    price?: number,
  ): HTMLButtonElement {
    return el(
      'button',
      { class: `button shop-action ${variant}`.trim(), onClick },
      label,
      price === undefined ? null : coinAmount(price, 'shop-action-price'),
    );
  }

  private get(item: ShopItem): void {
    const bought = buy(this.profile, item);
    if (!bought.ok) return;
    const worn = equip(bought.profile, item);
    this.commit(worn.ok ? worn.profile : bought.profile);
    sfx.chimes(BUY_CHIMES.midis, BUY_CHIMES.spacing, BUY_CHIMES.decay);
    sfx.sparkle();
    this.celebrate(item);
  }

  private wear(item: ShopItem): void {
    const worn = equip(this.profile, item);
    if (!worn.ok) return;
    this.commit(worn.profile);
    sfx.chimes(WEAR_CHIMES.midis, WEAR_CHIMES.spacing, WEAR_CHIMES.decay);
  }

  private takeOff(kind: WearableKind): void {
    this.commit(unequip(this.profile, kind));
  }

  private commit(profile: Profile): void {
    this.profile = profile;
    this.actions.onChange(profile);
    this.refresh();
  }

  private celebrate(item: ShopItem): void {
    const card = this.catalogue.querySelector(`[data-item="${itemKey(item)}"]`);
    card?.classList.add(FRESH_CLASS);
    card?.append(confetti(CONFETTI_PIECES));
  }

  private trophies(): HTMLElement {
    const owned = new Set(this.profile.inventory.trophies);
    const earned = TROPHIES.filter((trophy) => owned.has(trophy.id)).length;
    const count = format(i18n.t.features.shop.trophyCount, { earned, total: TROPHIES.length });
    return el(
      'div',
      { class: 'shop-trophies' },
      el('p', { class: 'shop-trophy-count', text: count }),
      el(
        'div',
        { class: 'shop-grid' },
        ...TROPHIES.map((trophy) => trophyCard(trophy, owned.has(trophy.id))),
      ),
    );
  }
}

function wearableKind(item: ShopItem): WearableKind | undefined {
  return item.kind === 'skin' ? undefined : item.kind;
}

function coinAmount(amount: number, className: string): HTMLElement {
  return el('span', { class: className }, coinIcon(), String(amount));
}

function missingNote(price: number, profile: Profile): HTMLElement {
  const coins = coinAmount(price - profile.coins, 'shop-note-coins');
  return el(
    'span',
    { class: 'shop-note' },
    ...formatParts(i18n.t.features.shop.missing, { coins }),
  );
}

function rankNote(unlock: Unlock): HTMLElement | null {
  if (unlock.by !== 'rank') return null;
  const text = format(i18n.t.features.shop.rank, { rank: rankTitle(unlock.rank) });
  return el('span', { class: 'shop-note', text });
}

function trophyCard(trophy: Trophy, earned: boolean): HTMLElement {
  const { name, hint } = trophyCopy(trophy);
  return el(
    'article',
    {
      class: earned ? 'shop-item shop-trophy is-earned' : 'shop-item shop-trophy is-locked',
      style: `--trophy: ${trophy.color}`,
    },
    el('div', { class: 'shop-item-art' }, shopIcon('trophy', 'shop-trophy-icon')),
    el('h3', { class: 'shop-item-name', text: name }),
    el('p', { class: 'shop-item-text', text: hint }),
    earned
      ? null
      : el(
          'div',
          { class: 'shop-item-footer' },
          el('span', { class: 'shop-note', text: i18n.t.features.shop.trophyLocked }),
        ),
  );
}
