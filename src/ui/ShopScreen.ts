import { sfx } from '../audio/Sfx';
import {
  buy,
  equip,
  isLocked,
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
import { awardTrophies, trophyProgress, type TrophyProgress } from '../course/trophies';
import { format, formatParts } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import type { Profile } from '../profiles/Profile';
import { releasePortraits } from './CharacterPortraits';
import { confetti } from './confetti';
import { el, toggleChip, type Child } from './dom';
import { itemPreview, releaseItemPreviews } from './ItemPreviews';
import { coinIcon } from './progression';
import { ShopHero } from './ShopHero';
import { onShortcutKeys } from './overlay';
import {
  arenaGoalNote,
  itemDescription,
  itemName,
  itemPower,
  rankTitle,
  trophyCopy,
} from './shopCopy';
import { headerCoins, lockBadge, screenHeader, shopIcon } from './shopParts';

export type ShopTab = ItemKind | 'trophy';

export const SHOP_TABS: readonly ShopTab[] = ['pet', 'hat', 'skin', 'trophy'];

const BUY_CHIMES = { midis: [72, 76, 79, 84], spacing: 0.08, decay: 0.5 } as const;
const WEAR_CHIMES = { midis: [79, 84], spacing: 0.06, decay: 0.3 } as const;
const FRESH_CLASS = 'is-fresh';
const ENTERING_CLASS = 'is-entering';
const CONFETTI_PIECES = 20;
const PERCENT = 100;

export interface ShopExit {
  readonly onBack: (profile: Profile) => void;
  readonly backLabel?: string;
}

interface ShopActions extends ShopExit {
  readonly onChange: (profile: Profile) => void;
}

export class ShopScreen {
  readonly element = el('div', { class: 'screen shop-screen' });
  private readonly hero = new ShopHero();
  private readonly coins = el('div', { class: 'shop-coins' });
  private readonly tabBar = el('nav', { class: 'segmented shop-tabs' });
  private readonly list = el('div', { class: 'shop-catalogue-list' });
  private readonly catalogue = el('section', { class: 'shop-catalogue' }, this.tabBar, this.list);
  private readonly stopKeys: () => void;

  constructor(
    private profile: Profile,
    private readonly actions: ShopActions,
    private tab: ShopTab = SHOP_TABS[0],
  ) {
    this.stopKeys = onShortcutKeys(this.element, {
      Escape: () => this.actions.onBack(this.profile),
    });
    this.element.append(
      this.header(),
      el('main', { class: 'shop-layout' }, this.hero.element, this.catalogue),
    );
    this.refresh(true);
  }

  dispose(): void {
    this.stopKeys();
    this.hero.dispose();
    releaseItemPreviews();
    releasePortraits();
  }

  private header(): HTMLElement {
    const copy = i18n.t.features.shop;
    return screenHeader({
      backLabel: this.actions.backLabel ?? copy.back,
      onBack: () => this.actions.onBack(this.profile),
      title: copy.title,
      trailing: this.coins,
    });
  }

  private refresh(entering = false): void {
    this.catalogue.classList.toggle(ENTERING_CLASS, entering);
    this.coins.replaceChildren(headerCoins(this.profile.coins));
    this.hero.show(this.profile);
    this.tabBar.replaceChildren(...this.tabs());
    this.list.replaceChildren(this.content());
  }

  private tabs(): HTMLElement[] {
    const labels = i18n.t.features.shop.tabs;
    return SHOP_TABS.map((tab) => toggleChip(labels[tab], tab === this.tab, () => this.open(tab)));
  }

  private open(tab: ShopTab): void {
    if (tab === this.tab) return;
    this.tab = tab;
    this.list.scrollTop = 0;
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
    const power = itemPower(item);
    return el(
      'article',
      { class: `shop-item is-${state}`, 'data-item': itemKey(item) },
      el(
        'div',
        { class: 'shop-item-art' },
        itemPreview(item),
        isGated(state) ? lockBadge(item.unlock) : null,
      ),
      el('h3', { class: 'shop-item-name', text: itemName(item) }),
      power ? powerNote(power) : null,
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
      case 'arenaLocked':
        return [arenaNote(item.unlock)];
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
    this.commit(awardTrophies(worn.ok ? worn.profile : bought.profile));
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
        ...TROPHIES.map((trophy) =>
          trophyCard(trophy, owned.has(trophy.id), trophyProgress(this.profile, trophy.rule)),
        ),
      ),
    );
  }
}

function wearableKind(item: ShopItem): WearableKind | undefined {
  return item.kind === 'skin' ? undefined : item.kind;
}

function powerNote(power: string): HTMLElement {
  return el(
    'p',
    { class: 'shop-item-power' },
    shopIcon('bolt', 'shop-item-power-icon'),
    el('span', { text: power }),
  );
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

function arenaNote(unlock: Unlock): HTMLElement | null {
  if (unlock.by !== 'arena') return null;
  return el('span', { class: 'shop-note', text: arenaGoalNote(unlock.goal) });
}

function isGated(state: ItemState): boolean {
  return isLocked(state) && state !== 'tooExpensive';
}

function trophyCard(
  trophy: Trophy,
  earned: boolean,
  progress: TrophyProgress | undefined,
): HTMLElement {
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
    earned ? null : el('div', { class: 'shop-item-footer' }, trophyGoal(progress)),
  );
}

function trophyGoal(progress: TrophyProgress | undefined): HTMLElement {
  const copy = i18n.t.features.shop;
  if (!progress) return el('span', { class: 'shop-note', text: copy.trophyLocked });
  const current = Math.min(progress.current, progress.goal);
  const share = Math.round((current / progress.goal) * PERCENT);
  const label = format(copy.trophyProgress, { current, goal: progress.goal });
  return el(
    'div',
    { class: 'trophy-progress' },
    el(
      'span',
      {
        class: 'trophy-progress-bar',
        role: 'progressbar',
        'aria-label': label,
        'aria-valuenow': String(share),
      },
      el('span', { class: 'trophy-progress-fill', style: `width: ${share}%` }),
    ),
    el('span', { class: 'shop-note', text: label }),
  );
}
