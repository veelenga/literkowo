import { SCREENSHOT, SHARE_IMAGE, SITE_URL, siteUrl } from './site.ts';

export const SITEMAP_FILE = 'sitemap.xml';

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const IMAGE_NAMESPACE = 'http://www.google.com/schemas/sitemap-image/1.1';
const ISO_DATE_LENGTH = 10;

export function sitemapXml(updated: Date): string {
  const lastmod = updated.toISOString().slice(0, ISO_DATE_LENGTH);
  const images = [SHARE_IMAGE, SCREENSHOT].map(
    ({ path }) => `    <image:image><image:loc>${siteUrl(path)}</image:loc></image:image>`,
  );
  return [
    XML_DECLARATION,
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:image="${IMAGE_NAMESPACE}">`,
    '  <url>',
    `    <loc>${SITE_URL}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    ...images,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}
