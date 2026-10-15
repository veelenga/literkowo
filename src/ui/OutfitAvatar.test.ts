import { beforeAll, describe, expect, it, vi } from 'vitest';
import { outfitOf } from './LivePreview';
import { outfitAvatar, outfitKey } from './OutfitAvatar';
import type { Outfit } from './portraits/outfitStage';

const rendered = vi.hoisted((): string[] => []);

vi.mock('./CharacterAvatar', () => ({
  characterAvatar: (character: string) => {
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.dataset.character = character;
    return avatar;
  },
}));

vi.mock('./portraits/OutfitStudio', () => ({
  OutfitStudio: class {
    render({ character, hat, pet }: Outfit): Promise<string> {
      const key = [character, hat?.id, pet?.id].join('|');
      rendered.push(key);
      return Promise.resolve(`data:image/png;base64,${key}`);
    }
    dispose(): void {}
  },
}));

const STILL_SELECTOR = '.avatar-outfit';
const DRESSED_CLASS = 'is-dressed';

function stillOf(avatar: HTMLElement): HTMLImageElement | null {
  return avatar.querySelector<HTMLImageElement>(STILL_SELECTOR);
}

describe('outfitAvatar', () => {
  beforeAll(() => {
    HTMLImageElement.prototype.decode = () => Promise.resolve();
  });

  it('keeps the plain portrait when nothing from the shop is equipped', () => {
    const bare = outfitAvatar('a', {});
    const unknown = outfitAvatar('a', { hat: 'sombrero' });

    expect(stillOf(bare)).toBeNull();
    expect(stillOf(unknown)).toBeNull();
    expect(rendered).toEqual([]);
  });

  it('shows the portrait first and the outfit once it is rendered', async () => {
    const avatar = outfitAvatar('b', { hat: 'crown', pet: 'dragon' });
    expect(avatar.dataset.character).toBe('b');
    expect(avatar.classList.contains(DRESSED_CLASS)).toBe(false);

    await vi.waitFor(() => expect(avatar.classList.contains(DRESSED_CLASS)).toBe(true));
    expect(stillOf(avatar)?.src).toBe('data:image/png;base64,b|crown|dragon');
  });

  it('serves an outfit it already rendered from memory', async () => {
    const first = outfitAvatar('c', { pet: 'bee' });
    await vi.waitFor(() => expect(first.classList.contains(DRESSED_CLASS)).toBe(true));

    const again = outfitAvatar('c', { pet: 'bee' });

    expect(again.classList.contains(DRESSED_CLASS)).toBe(true);
    expect(again.children).toHaveLength(1);
    expect(stillOf(again)?.src).toBe('data:image/png;base64,c||bee');
    expect(rendered.filter((key) => key === 'c||bee')).toHaveLength(1);
  });

  it('keys outfits by skin, hat and pet', () => {
    const keys = [
      outfitOf('a'),
      outfitOf('a', { hat: 'cap' }),
      outfitOf('a', { pet: 'bee' }),
      outfitOf('b', { hat: 'cap' }),
    ].map(outfitKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
