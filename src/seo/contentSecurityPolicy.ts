import type { HtmlTagDescriptor } from 'vite';

const SELF = "'self'";
const NONE = "'none'";
const UNSAFE_INLINE = "'unsafe-inline'";
const DATA = 'data:';
const HTTP_EQUIV = 'Content-Security-Policy';
const INJECT_TO = 'head-prepend';

const DIRECTIVES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['default-src', [SELF]],
  ['script-src', [SELF]],
  ['style-src', [SELF, UNSAFE_INLINE]],
  ['img-src', [SELF, DATA]],
  ['font-src', [SELF, DATA]],
  ['connect-src', [SELF]],
  ['object-src', [NONE]],
  ['base-uri', [NONE]],
  ['form-action', [NONE]],
];

export function contentSecurityPolicy(): string {
  return DIRECTIVES.map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
}

export function contentSecurityPolicyTag(): HtmlTagDescriptor {
  return {
    tag: 'meta',
    attrs: { 'http-equiv': HTTP_EQUIV, content: contentSecurityPolicy() },
    injectTo: INJECT_TO,
  };
}
