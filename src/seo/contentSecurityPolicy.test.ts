import { describe, expect, it } from 'vitest';
import {
  contentSecurityPolicy,
  contentSecurityPolicyTag,
  type HtmlTarget,
} from './contentSecurityPolicy.ts';

const TARGETS: readonly HtmlTarget[] = ['build', 'devServer'];
const REMOTE_SOURCE = /https?:|\*/;

function directive(target: HtmlTarget, name: string): string[] | undefined {
  return contentSecurityPolicy(target)
    .split('; ')
    .map((entry) => entry.split(' '))
    .find(([key]) => key === name)
    ?.slice(1);
}

describe('content security policy', () => {
  it.each(TARGETS)('runs scripts from the site only in the %s', (target) => {
    expect(directive(target, 'script-src')).toEqual(["'self'"]);
    expect(directive(target, 'default-src')).toEqual(["'self'"]);
  });

  it.each(TARGETS)('allows no remote origin in the %s', (target) => {
    expect(contentSecurityPolicy(target)).not.toMatch(REMOTE_SOURCE);
  });

  it.each(TARGETS)('blocks plugins, base url changes and form posts in the %s', (target) => {
    expect(directive(target, 'object-src')).toEqual(["'none'"]);
    expect(directive(target, 'base-uri')).toEqual(["'none'"]);
    expect(directive(target, 'form-action')).toEqual(["'none'"]);
  });

  it.each(TARGETS)('blocks inline style attributes in the %s', (target) => {
    expect(directive(target, 'style-src')).toEqual(["'self'"]);
    expect(directive(target, 'style-src-attr')).toBeUndefined();
  });

  it('allows inline style tags and blob workers only in the dev server', () => {
    expect(directive('build', 'style-src-elem')).toBeUndefined();
    expect(directive('build', 'worker-src')).toBeUndefined();
    expect(directive('devServer', 'style-src-elem')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directive('devServer', 'worker-src')).toEqual(["'self'", 'blob:']);
  });

  it.each(TARGETS)('leaves out directives that a meta tag ignores in the %s', (target) => {
    expect(contentSecurityPolicy(target)).not.toMatch(/frame-ancestors|report-uri|sandbox/);
  });

  it('goes first in the head so it covers every later tag', () => {
    const tag = contentSecurityPolicyTag('build');
    expect(tag.attrs).toEqual({
      'http-equiv': 'Content-Security-Policy',
      content: contentSecurityPolicy('build'),
    });
    expect(tag.injectTo).toBe('head-prepend');
  });
});
