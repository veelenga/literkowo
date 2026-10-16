import { escapeHtml } from './html';
import { FALLBACK_TEXTS, NOSCRIPT_TEXTS, SITE_NAME, type LocalizedText } from './site';

export const APP_ROOT = '<div id="app"></div>';

export function appRootWithFallback(): string {
  const title = `<h1 class="app-fallback-title">${escapeHtml(SITE_NAME)}</h1>`;
  const about = FALLBACK_TEXTS.map(paragraph).join('');
  const noscript = `<noscript>${NOSCRIPT_TEXTS.map(paragraph).join('')}</noscript>`;
  return `<div id="app"><main class="app-fallback">${title}${about}${noscript}</main></div>`;
}

function paragraph({ lang, text }: LocalizedText): string {
  return `<p lang="${lang}">${escapeHtml(text)}</p>`;
}
