import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, contentSecurityPolicyTag } from './contentSecurityPolicy.ts';

const REMOTE_SOURCE = /https?:|\*/;

function directive(name: string): string[] {
  const found = contentSecurityPolicy()
    .split('; ')
    .map((entry) => entry.split(' '))
    .find(([key]) => key === name);
  if (!found) throw new Error(`Missing ${name}`);
  return found.slice(1);
}

describe('content security policy', () => {
  it('runs scripts from the site only', () => {
    expect(directive('script-src')).toEqual(["'self'"]);
    expect(directive('default-src')).toEqual(["'self'"]);
  });

  it('allows no remote origin', () => {
    expect(contentSecurityPolicy()).not.toMatch(REMOTE_SOURCE);
  });

  it('blocks plugins, base url changes and form posts', () => {
    expect(directive('object-src')).toEqual(["'none'"]);
    expect(directive('base-uri')).toEqual(["'none'"]);
    expect(directive('form-action')).toEqual(["'none'"]);
  });

  it('leaves out directives that a meta tag ignores', () => {
    expect(contentSecurityPolicy()).not.toMatch(/frame-ancestors|report-uri|sandbox/);
  });

  it('goes first in the head so it covers every later tag', () => {
    const tag = contentSecurityPolicyTag();
    expect(tag.attrs).toEqual({
      'http-equiv': 'Content-Security-Policy',
      content: contentSecurityPolicy(),
    });
    expect(tag.injectTo).toBe('head-prepend');
  });
});
