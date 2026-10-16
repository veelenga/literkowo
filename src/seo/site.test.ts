import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_TEXTS,
  NOSCRIPT_TEXTS,
  SCREENSHOT,
  SHARE_IMAGE,
  SHARE_IMAGE_BADGES,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
  SQUARE_IMAGE,
  siteUrl,
} from './site.ts';

const MAX_TITLE_LENGTH = 60;
const MIN_DESCRIPTION_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 160;
const DASHES = /[-‐‑‒–—―]/u;
const ALL_CAPS_WORD = /\b\p{Lu}{2,}\b/u;
const PUBLIC_DIR = new URL('../../public/', import.meta.url);

const COPY = [
  SITE_TITLE,
  SITE_DESCRIPTION,
  SHARE_IMAGE.alt,
  SCREENSHOT.alt,
  ...SHARE_IMAGE_BADGES,
  ...FALLBACK_TEXTS.map(({ text }) => text),
  ...NOSCRIPT_TEXTS.map(({ text }) => text),
];

function publicFile(path: string): string {
  return decodeURIComponent(new URL(path, PUBLIC_DIR).pathname);
}

describe('site copy', () => {
  it('keeps the title and the description at search result length', () => {
    expect(SITE_TITLE.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(SITE_DESCRIPTION.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION_LENGTH);
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });

  it.each(COPY)('has no dashes and no words in capitals: %s', (text) => {
    expect(text).not.toMatch(DASHES);
    expect(text).not.toMatch(ALL_CAPS_WORD);
  });

  it('describes the game in every interface language and in English', () => {
    expect(FALLBACK_TEXTS.map(({ lang }) => lang)).toEqual(['pl', 'uk', 'en']);
  });
});

describe('site urls', () => {
  it('builds absolute urls under the live origin', () => {
    expect(siteUrl()).toBe(SITE_URL);
    expect(siteUrl(SHARE_IMAGE.path)).toBe(`${SITE_URL}${SHARE_IMAGE.path}`);
  });
});

describe('site images', () => {
  it.each([SHARE_IMAGE, SQUARE_IMAGE, SCREENSHOT])('matches the file $path', async (image) => {
    const { width, height, format } = await sharp(publicFile(image.path)).metadata();
    expect({ width, height, format }).toEqual({
      width: image.width,
      height: image.height,
      format: 'jpeg',
    });
  });
});
