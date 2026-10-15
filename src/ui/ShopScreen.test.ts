import { describe, expect, it, vi } from 'vitest';
import { createProfile, type Profile } from '../profiles/Profile';
import { xpForLevel } from '../course/xp';
import { ShopScreen } from './ShopScreen';

vi.mock('./ItemPreviews', () => ({
  itemPreview: () => document.createElement('span'),
  releaseItemPreviews: () => undefined,
}));

vi.mock('./ShopHero', () => ({
  ShopHero: class {
    readonly element = document.createElement('aside');
    show(): void {}
    dispose(): void {}
  },
}));

const APPRENTICE_LEVEL = 5;

function profileWith(changes: Partial<Profile> = {}): Profile {
  return { ...createProfile('Ola', 'a'), ...changes };
}

function setup(profile: Profile) {
  const onChange = vi.fn<(profile: Profile) => void>();
  const onBack = vi.fn<(profile: Profile) => void>();
  const shop = new ShopScreen(profile, { onChange, onBack });
  const card = (key: string) => {
    const found = shop.element.querySelector<HTMLElement>(`[data-item="${key}"]`);
    if (!found) throw new Error(`Missing card ${key}`);
    return found;
  };
  const openTab = (index: number) =>
    shop.element.querySelectorAll<HTMLButtonElement>('.shop-tabs .chip')[index].click();
  const lastSaved = () => onChange.mock.lastCall?.[0];
  return { shop, card, openTab, onChange, onBack, lastSaved };
}

describe('ShopScreen', () => {
  it('opens on the pets tab with every tab on offer', () => {
    const { shop } = setup(profileWith());
    const tabs = [...shop.element.querySelectorAll('.shop-tabs .chip')];
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Zwierzaki',
      'Czapki',
      'Postacie',
      'Trofea',
    ]);
    expect(shop.element.querySelectorAll('.shop-item')).toHaveLength(6);
  });

  it('buys a pet, puts it on and saves the profile', () => {
    const { card, lastSaved } = setup(profileWith({ coins: 200 }));
    card('pet:cube-cat').querySelector<HTMLButtonElement>('.shop-action')?.click();
    expect(lastSaved()?.coins).toBe(40);
    expect(lastSaved()?.inventory.pets).toEqual(['cube-cat']);
    expect(lastSaved()?.equipped.pet).toBe('cube-cat');
    expect(card('pet:cube-cat').classList.contains('is-equipped')).toBe(true);
    expect(card('pet:cube-cat').querySelector('.shop-tag')?.textContent).toBe('W użyciu');
  });

  it('animates the cards when a tab opens and only the bought card after a purchase', () => {
    const { shop, card, openTab } = setup(profileWith({ coins: 200 }));
    const catalogue = shop.element.querySelector('.shop-catalogue');
    expect(catalogue?.classList.contains('is-entering')).toBe(true);
    card('pet:cube-cat').querySelector<HTMLButtonElement>('.shop-action')?.click();
    expect(catalogue?.classList.contains('is-entering')).toBe(false);
    expect(card('pet:cube-cat').classList.contains('is-fresh')).toBe(true);
    openTab(1);
    expect(catalogue?.classList.contains('is-entering')).toBe(true);
  });

  it('shows how many coins are missing and offers no button', () => {
    const { card } = setup(profileWith({ coins: 100 }));
    const bee = card('pet:bee');
    expect(bee.querySelector('.shop-action')).toBeNull();
    expect(bee.querySelector('.shop-note')?.textContent).toBe('Brakuje 220');
  });

  it('locks rank items with a badge until the rank is reached', () => {
    const locked = setup(profileWith());
    expect(locked.card('pet:star').querySelector('.lock-badge')?.textContent).toBe('5');
    expect(locked.card('pet:star').querySelector('.shop-note')?.textContent).toBe('Ranga: Uczeń');

    const { card, lastSaved } = setup(profileWith({ xp: xpForLevel(APPRENTICE_LEVEL) }));
    card('pet:star').querySelector<HTMLButtonElement>('.shop-action')?.click();
    expect(lastSaved()?.equipped.pet).toBe('star');
    expect(lastSaved()?.coins).toBe(0);
  });

  it('takes a hat off', () => {
    const profile = profileWith({
      inventory: { ...profileWith().inventory, hats: ['cap'] },
      equipped: { hat: 'cap' },
    });
    const { card, openTab, lastSaved } = setup(profile);
    openTab(1);
    card('hat:cap').querySelector<HTMLButtonElement>('.button-ghost')?.click();
    expect(lastSaved()?.equipped).toEqual({});
    expect(card('hat:cap').classList.contains('is-owned')).toBe(true);
  });

  it('switches to a skin the player owns', () => {
    const { card, openTab, lastSaved } = setup(profileWith());
    openTab(2);
    card('skin:c').querySelector<HTMLButtonElement>('.shop-action')?.click();
    expect(lastSaved()?.avatar).toBe('c');
    expect(card('skin:c').querySelector('.button-ghost')).toBeNull();
  });

  it('counts the trophies and marks the earned ones', () => {
    const profile = profileWith({
      inventory: { ...profileWith().inventory, trophies: ['first-boss'] },
    });
    const { shop, openTab } = setup(profile);
    openTab(3);
    expect(shop.element.querySelector('.shop-trophy-count')?.textContent).toBe('Trofea: 1 z 10');
    expect(shop.element.querySelectorAll('.shop-trophy.is-earned')).toHaveLength(1);
  });

  it('goes back with the latest profile', () => {
    const { shop, card, onBack } = setup(profileWith({ coins: 200 }));
    card('pet:cube-cat').querySelector<HTMLButtonElement>('.shop-action')?.click();
    shop.element.querySelector<HTMLButtonElement>('.shop-back')?.click();
    expect(onBack.mock.lastCall?.[0].coins).toBe(40);
  });
});
