import type { HtmlTagDescriptor, Plugin } from 'vite';
import { APP_ROOT, appRootWithFallback } from './fallback';
import { headTags } from './headTags';

const PLUGIN_NAME = 'literkowo-seo';

export interface SeoPage {
  readonly html: string;
  readonly tags: HtmlTagDescriptor[];
}

export function withSeo(html: string): SeoPage {
  if (!html.includes(APP_ROOT)) throw new Error(`index.html needs ${APP_ROOT}`);
  return { html: html.replace(APP_ROOT, appRootWithFallback()), tags: headTags() };
}

export function seoPlugin(): Plugin {
  return {
    name: PLUGIN_NAME,
    transformIndexHtml: { order: 'pre', handler: withSeo },
  };
}
