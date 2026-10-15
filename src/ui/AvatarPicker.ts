import { AVATARS } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { preloadPortraits } from './CharacterPortraits';
import { el } from './dom';
import { livePreview } from './LivePreview';

const ACTIVE_CLASS = 'is-active';

interface AvatarTile {
  character: string;
  button: HTMLButtonElement;
  portrait: HTMLElement;
}

export function avatarPicker(initial: string, onPick: (character: string) => void): HTMLElement {
  preloadPortraits(AVATARS);
  const tiles = AVATARS.map(createTile);
  let current: AvatarTile | undefined;
  const pick = (chosen: AvatarTile) => {
    if (chosen === current) return;
    current = chosen;
    tiles.forEach((tile) => markActive(tile.button, tile === chosen));
    livePreview.show(chosen.portrait, chosen.character);
    onPick(chosen.character);
  };
  tiles.forEach((tile) => tile.button.addEventListener('click', () => pick(tile)));
  const initialTile = tiles.find((tile) => tile.character === initial);
  if (initialTile) pick(initialTile);
  return el('div', { class: 'avatar-options' }, ...tiles.map((tile) => tile.button));
}

function createTile(character: string): AvatarTile {
  const portrait = characterAvatar(character);
  const button = el('button', { class: 'avatar-option', 'aria-pressed': 'false' }, portrait);
  return { character, button, portrait };
}

function markActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle(ACTIVE_CLASS, isActive);
  button.setAttribute('aria-pressed', String(isActive));
}
