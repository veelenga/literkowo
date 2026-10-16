import { describe, expect, it } from 'vitest';
import { SCREENSHOT, SHARE_IMAGE, SITE_URL, siteUrl } from './site';
import { sitemapXml } from './sitemap';

const BUILD_DATE = new Date('2026-10-16T12:00:00Z');

describe('sitemapXml', () => {
  const xml = sitemapXml(BUILD_DATE);

  it('lists the single page with the build date', () => {
    expect(xml).toContain(`<loc>${SITE_URL}</loc>`);
    expect(xml).toContain('<lastmod>2026-10-16</lastmod>');
    expect(xml.match(/<url>/g)).toHaveLength(1);
  });

  it('lists the share image and the screenshot', () => {
    expect(xml).toContain(`<image:loc>${siteUrl(SHARE_IMAGE.path)}</image:loc>`);
    expect(xml).toContain(`<image:loc>${siteUrl(SCREENSHOT.path)}</image:loc>`);
  });
});
