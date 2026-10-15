import { avatarImage } from '../profiles/Profile';
import { cachedPortrait, portraitFor } from './CharacterPortraits';
import { el } from './dom';

const AVATAR_CLASS = 'avatar';
const READY_CLASS = 'is-ready';

export function characterAvatar(character: string, className?: string): HTMLElement {
  const portrait = el('img', { class: 'avatar-portrait', alt: '', draggable: 'false' });
  const cached = cachedPortrait(character);
  const classes = [AVATAR_CLASS, className, cached && READY_CLASS].filter(Boolean).join(' ');
  const avatar = el('span', { class: classes }, cached ? null : placeholder(character), portrait);
  if (cached) portrait.src = cached;
  else revealWhenRendered(avatar, portrait, character);
  return avatar;
}

function placeholder(character: string): HTMLImageElement {
  return el('img', {
    class: 'avatar-placeholder',
    src: avatarImage(character),
    alt: '',
    draggable: 'false',
  });
}

function revealWhenRendered(
  avatar: HTMLElement,
  portrait: HTMLImageElement,
  character: string,
): void {
  portraitFor(character)
    .then(async (url) => {
      portrait.src = url;
      await portrait.decode();
      avatar.classList.add(READY_CLASS);
    })
    .catch(() => undefined);
}
