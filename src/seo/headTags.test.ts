import type { HtmlTagDescriptor } from 'vite';
import { describe, expect, it } from 'vitest';
import { headTags } from './headTags';
import { SHARE_IMAGE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL, siteUrl } from './site';

const ABSOLUTE_URL = /^https:\/\//;

function attribute(tags: HtmlTagDescriptor[], key: string, value: string): string[] {
  return tags
    .filter((tag) => tag.attrs?.[key] === value)
    .map((tag) => String(tag.attrs?.content ?? tag.attrs?.href));
}

function structuredDataScript(tags: HtmlTagDescriptor[]): string {
  const script = tags.find((tag) => tag.attrs?.type === 'application/ld+json');
  if (typeof script?.children !== 'string') throw new Error('Missing structured data');
  return script.children;
}

describe('head tags', () => {
  const tags = headTags();

  it('sets the title, the description and the canonical url', () => {
    expect(tags.find((tag) => tag.tag === 'title')?.children).toBe(SITE_TITLE);
    expect(attribute(tags, 'name', 'description')).toEqual([SITE_DESCRIPTION]);
    expect(attribute(tags, 'rel', 'canonical')).toEqual([SITE_URL]);
    expect(attribute(tags, 'name', 'robots')[0]).toMatch(/^index, follow/);
  });

  it('shares the wide image first with its size and text', () => {
    expect(attribute(tags, 'property', 'og:image')[0]).toBe(siteUrl(SHARE_IMAGE.path));
    expect(attribute(tags, 'property', 'og:image:width')[0]).toBe(String(SHARE_IMAGE.width));
    expect(attribute(tags, 'property', 'og:image:height')[0]).toBe(String(SHARE_IMAGE.height));
    expect(attribute(tags, 'property', 'og:image:alt')[0]).toBe(SHARE_IMAGE.alt);
    expect(attribute(tags, 'name', 'twitter:card')).toEqual(['summary_large_image']);
  });

  it('uses absolute urls for every shared link', () => {
    const urls = [
      ...attribute(tags, 'property', 'og:url'),
      ...attribute(tags, 'property', 'og:image'),
      ...attribute(tags, 'name', 'twitter:image'),
    ];
    expect(urls.every((url) => ABSOLUTE_URL.test(url))).toBe(true);
  });

  it('puts every tag in the head', () => {
    expect(tags.every((tag) => tag.injectTo === 'head')).toBe(true);
  });

  it('embeds structured data that parses back and cannot close the script', () => {
    const json = structuredDataScript(tags);
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toMatchObject({
      '@type': ['VideoGame', 'WebApplication'],
      url: SITE_URL,
      isAccessibleForFree: true,
      offers: { price: '0' },
    });
  });
});
