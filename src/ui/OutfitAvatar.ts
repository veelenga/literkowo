import { HATS, PETS } from '../course/shop';
import { AVATARS, type Equipped } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { PortraitCache, type PortraitRenderer } from './CharacterPortraits';
import { el } from './dom';
import { outfitOf } from './LivePreview';
import type { Outfit } from './portraits/outfitStage';
import './outfitAvatar.css';

const AVATAR_CLASS = 'avatar';
const DRESSED_CLASS = 'is-dressed';
const STILL_CLASS = 'avatar-outfit';
const KEY_SEPARATOR = '|';
const IDLE_RELEASE_MS = 4000;
const OUTFIT_COUNT = AVATARS.length * (HATS.length + 1) * (PETS.length + 1);

function loadStudio(): Promise<PortraitRenderer<Outfit>> {
  return import('./portraits/OutfitStudio').then(({ OutfitStudio }) => new OutfitStudio());
}

const stills = new PortraitCache<Outfit>({
  createRenderer: loadStudio,
  keyOf: outfitKey,
  scheduleFrame: (callback) => requestAnimationFrame(() => callback()),
  rosterSize: OUTFIT_COUNT,
  idleReleaseMs: IDLE_RELEASE_MS,
});

export function outfitKey({ character, hat, pet }: Outfit): string {
  return [character, hat?.id, pet?.id].join(KEY_SEPARATOR);
}

export function outfitAvatar(character: string, equipped: Equipped): HTMLElement {
  const outfit = outfitOf(character, equipped);
  if (!outfit.hat && !outfit.pet) return characterAvatar(character);
  const cached = stills.cached(outfit);
  return cached ? dressedAvatar(cached) : dressWhenRendered(outfit);
}

export function releaseOutfitAvatars(): void {
  stills.release();
}

function dressedAvatar(url: string): HTMLElement {
  const still = stillImage();
  still.src = url;
  return el('span', { class: `${AVATAR_CLASS} ${DRESSED_CLASS}` }, still);
}

function dressWhenRendered(outfit: Outfit): HTMLElement {
  const avatar = characterAvatar(outfit.character);
  const still = stillImage();
  avatar.append(still);
  stills
    .portraitFor(outfit)
    .then(async (url) => {
      still.src = url;
      await still.decode();
      avatar.classList.add(DRESSED_CLASS);
    })
    .catch(() => undefined);
  return avatar;
}

function stillImage(): HTMLImageElement {
  return el('img', { class: STILL_CLASS, alt: '', draggable: 'false' });
}
