import { HATS, itemKey, PETS, type ShopItem } from '../course/shop';
import { characterAvatar } from './CharacterAvatar';
import { PortraitCache, type PortraitRenderer } from './CharacterPortraits';
import { el } from './dom';

const READY_CLASS = 'is-ready';
const IDLE_RELEASE_MS = 4000;

function loadStudio(): Promise<PortraitRenderer> {
  return import('./portraits/ItemStudio').then(({ ItemStudio }) => new ItemStudio());
}

const previews = new PortraitCache({
  createRenderer: loadStudio,
  keyOf: (key) => key,
  scheduleFrame: (callback) => requestAnimationFrame(() => callback()),
  rosterSize: PETS.length + HATS.length,
  idleReleaseMs: IDLE_RELEASE_MS,
});

export function itemPreview(item: ShopItem): HTMLElement {
  if (item.kind === 'skin') return characterAvatar(item.id);
  const key = itemKey(item);
  const image = el('img', { class: 'avatar-portrait', alt: '', draggable: 'false' });
  const cached = previews.cached(key);
  const preview = el('span', { class: cached ? `avatar ${READY_CLASS}` : 'avatar' }, image);
  if (cached) image.src = cached;
  else revealWhenRendered(preview, image, key);
  return preview;
}

export function releaseItemPreviews(): void {
  previews.release();
}

function revealWhenRendered(preview: HTMLElement, image: HTMLImageElement, key: string): void {
  previews
    .portraitFor(key)
    .then(async (url) => {
      image.src = url;
      await image.decode();
      preview.classList.add(READY_CLASS);
    })
    .catch(() => undefined);
}
