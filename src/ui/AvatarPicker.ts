import { isSkinLocked } from '../course/inventory';
import { skinSpec } from '../course/shop';
import { AVATARS } from '../profiles/Profile';
import { characterAvatar } from './CharacterAvatar';
import { preloadPortraits } from './CharacterPortraits';
import { el } from './dom';
import { unlockHint } from './shopCopy';
import { lockBadge } from './shopParts';

const ACTIVE_CLASS = 'is-active';
const LOCKED_CLASS = 'avatar-option is-locked';
const OPEN_CLASS = 'avatar-option';

interface AvatarTile {
  character: string;
  button: HTMLButtonElement;
  locked: boolean;
}

export function avatarPicker(
  initial: string,
  owned: readonly string[],
  onPick: (character: string) => void,
): HTMLElement {
  preloadPortraits(AVATARS);
  const tiles = AVATARS.map((character) => createTile(character, owned));
  let current: AvatarTile | undefined;
  const pick = (chosen: AvatarTile) => {
    if (chosen === current) return;
    current = chosen;
    tiles.forEach((tile) => markActive(tile.button, tile === chosen));
    onPick(chosen.character);
  };
  tiles
    .filter((tile) => !tile.locked)
    .forEach((tile) => tile.button.addEventListener('click', () => pick(tile)));
  const initialTile = tiles.find((tile) => tile.character === initial);
  if (initialTile) pick(initialTile);
  return el('div', { class: 'avatar-options' }, ...tiles.map((tile) => tile.button));
}

function createTile(character: string, owned: readonly string[]): AvatarTile {
  const unlock = isSkinLocked(character, owned) ? skinSpec(character)?.unlock : undefined;
  const button = el(
    'button',
    {
      class: unlock ? LOCKED_CLASS : OPEN_CLASS,
      'aria-pressed': 'false',
      'aria-disabled': unlock ? 'true' : undefined,
      title: unlock ? unlockHint(unlock) : undefined,
    },
    characterAvatar(character),
    unlock ? lockBadge(unlock) : null,
  );
  return { character, button, locked: unlock !== undefined };
}

function markActive(button: HTMLButtonElement, isActive: boolean): void {
  button.classList.toggle(ACTIVE_CLASS, isActive);
  button.setAttribute('aria-pressed', String(isActive));
}
