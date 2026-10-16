import { describe, expect, it } from 'vitest';
import { APP_ROOT } from './fallback.ts';
import { withSeo } from './vitePlugin.ts';

const PAGE = `<html><head></head><body>${APP_ROOT}</body></html>`;

describe('withSeo', () => {
  it('fills the app root and adds the head tags', () => {
    const page = withSeo(PAGE);
    expect(page.html).toContain('<div id="app"><main class="app-fallback">');
    expect(page.tags.length).toBeGreaterThan(0);
  });

  it('fails the build when the app root is missing', () => {
    expect(() => withSeo('<html><body></body></html>')).toThrow(APP_ROOT);
  });
});
