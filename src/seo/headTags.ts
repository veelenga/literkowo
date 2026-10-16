import type { HtmlTagDescriptor } from 'vite';
import { escapeHtml, jsonForScript } from './html.ts';
import {
  ALTERNATE_LOCALES,
  AUTHOR,
  SHARE_IMAGE,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SQUARE_IMAGE,
  siteUrl,
  type SiteImage,
} from './site.ts';
import { structuredData } from './structuredData.ts';

const ROBOTS = 'index, follow, max-image-preview:large';
const OPEN_GRAPH_TYPE = 'website';
const TWITTER_CARD = 'summary_large_image';
const IMAGE_TYPE = 'image/jpeg';
const STRUCTURED_DATA_TYPE = 'application/ld+json';
const INJECT_TO = 'head';

export function headTags(): HtmlTagDescriptor[] {
  const tags: HtmlTagDescriptor[] = [
    { tag: 'title', children: escapeHtml(SITE_TITLE) },
    meta('description', SITE_DESCRIPTION),
    meta('robots', ROBOTS),
    meta('application-name', SITE_NAME),
    meta('author', AUTHOR.name),
    { tag: 'link', attrs: { rel: 'canonical', href: SITE_URL } },
    property('og:type', OPEN_GRAPH_TYPE),
    property('og:site_name', SITE_NAME),
    property('og:locale', SITE_LOCALE),
    ...ALTERNATE_LOCALES.map((locale) => property('og:locale:alternate', locale)),
    property('og:title', SITE_TITLE),
    property('og:description', SITE_DESCRIPTION),
    property('og:url', SITE_URL),
    ...[SHARE_IMAGE, SQUARE_IMAGE].flatMap(openGraphImage),
    meta('twitter:card', TWITTER_CARD),
    meta('twitter:title', SITE_TITLE),
    meta('twitter:description', SITE_DESCRIPTION),
    meta('twitter:image', siteUrl(SHARE_IMAGE.path)),
    meta('twitter:image:alt', SHARE_IMAGE.alt),
    {
      tag: 'script',
      attrs: { type: STRUCTURED_DATA_TYPE },
      children: jsonForScript(structuredData()),
    },
  ];
  return tags.map((tag) => ({ ...tag, injectTo: INJECT_TO }));
}

function meta(name: string, content: string): HtmlTagDescriptor {
  return { tag: 'meta', attrs: { name, content } };
}

function property(name: string, content: string): HtmlTagDescriptor {
  return { tag: 'meta', attrs: { property: name, content } };
}

function openGraphImage(image: SiteImage): HtmlTagDescriptor[] {
  return [
    property('og:image', siteUrl(image.path)),
    property('og:image:type', IMAGE_TYPE),
    property('og:image:width', String(image.width)),
    property('og:image:height', String(image.height)),
    property('og:image:alt', image.alt),
  ];
}
