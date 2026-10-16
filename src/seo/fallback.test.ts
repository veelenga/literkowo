import { describe, expect, it } from 'vitest';
import { appRootWithFallback } from './fallback.ts';
import { escapeHtml } from './html.ts';
import { FALLBACK_TEXTS, NOSCRIPT_TEXTS } from './site.ts';

const APP_ROOT_MARKUP = /^<div id="app">.+<\/div>$/s;

describe('app root fallback', () => {
  const markup = appRootWithFallback();

  it('keeps the app root the game mounts into', () => {
    expect(markup).toMatch(APP_ROOT_MARKUP);
  });

  it('describes the game in each language with its lang attribute', () => {
    for (const { lang, text } of FALLBACK_TEXTS) {
      expect(markup).toContain(`<p lang="${lang}">${escapeHtml(text)}</p>`);
    }
  });

  it('asks for JavaScript inside noscript', () => {
    const noscript = markup.slice(markup.indexOf('<noscript>'), markup.indexOf('</noscript>'));
    for (const { text } of NOSCRIPT_TEXTS) expect(noscript).toContain(escapeHtml(text));
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });
});
