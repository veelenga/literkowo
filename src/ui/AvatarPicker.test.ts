import { describe, expect, it, vi } from 'vitest';
import { AVATARS, STARTER_SKINS } from '../profiles/Profile';
import { avatarPicker } from './AvatarPicker';

vi.mock('./CharacterAvatar', () => ({
  characterAvatar: () => document.createElement('span'),
}));

vi.mock('./CharacterPortraits', () => ({
  preloadPortraits: () => undefined,
}));

vi.mock('./LivePreview', () => ({
  livePreview: { show: () => undefined },
}));

const FIRST_LOCKED = STARTER_SKINS.length;

function tiles(picker: HTMLElement): HTMLButtonElement[] {
  return [...picker.querySelectorAll<HTMLButtonElement>('.avatar-option')];
}

describe('avatarPicker', () => {
  it('locks the skins the player does not own and shows how to unlock them', () => {
    const picker = avatarPicker(AVATARS[0], STARTER_SKINS, () => undefined);
    const locked = tiles(picker).filter((tile) => tile.classList.contains('is-locked'));
    expect(locked).toHaveLength(AVATARS.length - STARTER_SKINS.length);
    expect(locked[0].querySelector('.lock-badge')?.textContent).toBe('200');
    expect(locked[0].title).toBe('Odblokuj w sklepie. Cena: 200');
    expect(locked[0].getAttribute('aria-disabled')).toBe('true');
  });

  it('picks only unlocked skins', () => {
    const onPick = vi.fn();
    const picker = avatarPicker(AVATARS[0], STARTER_SKINS, onPick);
    tiles(picker)[FIRST_LOCKED].click();
    tiles(picker)[1].click();
    expect(onPick.mock.calls).toEqual([[AVATARS[0]], [AVATARS[1]]]);
  });

  it('opens a skin the player bought', () => {
    const picker = avatarPicker(AVATARS[0], [...STARTER_SKINS, 'g'], () => undefined);
    expect(tiles(picker)[FIRST_LOCKED].classList.contains('is-locked')).toBe(false);
  });
});
