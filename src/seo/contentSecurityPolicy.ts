import type { HtmlTagDescriptor } from 'vite';

export type HtmlTarget = 'build' | 'devServer';

type Directive = readonly [name: string, sources: readonly string[]];

const SELF = "'self'";
const NONE = "'none'";
const UNSAFE_INLINE = "'unsafe-inline'";
const DATA = 'data:';
const BLOB = 'blob:';
const HTTP_EQUIV = 'Content-Security-Policy';
const INJECT_TO = 'head-prepend';

const BUILD_DIRECTIVES: readonly Directive[] = [
  ['default-src', [SELF]],
  ['script-src', [SELF]],
  ['style-src', [SELF]],
  ['img-src', [SELF, DATA]],
  ['font-src', [SELF, DATA]],
  ['connect-src', [SELF]],
  ['object-src', [NONE]],
  ['base-uri', [NONE]],
  ['form-action', [NONE]],
];

const DEV_SERVER_DIRECTIVES: readonly Directive[] = [
  ['style-src-elem', [SELF, UNSAFE_INLINE]],
  ['worker-src', [SELF, BLOB]],
];

const DIRECTIVES: Readonly<Record<HtmlTarget, readonly Directive[]>> = {
  build: BUILD_DIRECTIVES,
  devServer: [...BUILD_DIRECTIVES, ...DEV_SERVER_DIRECTIVES],
};

export function contentSecurityPolicy(target: HtmlTarget): string {
  return DIRECTIVES[target].map(([name, sources]) => [name, ...sources].join(' ')).join('; ');
}

export function contentSecurityPolicyTag(target: HtmlTarget): HtmlTagDescriptor {
  return {
    tag: 'meta',
    attrs: { 'http-equiv': HTTP_EQUIV, content: contentSecurityPolicy(target) },
    injectTo: INJECT_TO,
  };
}
