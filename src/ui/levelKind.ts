import type { Level } from '../course/catalog';
import { i18n } from '../i18n/i18n';

const KEY_SEPARATOR = ' ';

export function levelKindLabel(level: Level): string {
  const t = i18n.t;
  if (level.kind === 'boss') return t.bossLevel;
  if (level.kind === 'learn' && [...level.newKeys].length > 1) return t.newKeys;
  return t.features.course.kinds[level.kind];
}

export function levelTitle(level: Level): string {
  if (level.isBoss) return levelKindLabel(level);
  return `${levelKindLabel(level)} ${keyLabel(level.focusKeys)}`;
}

export function keyLabel(keys: string): string {
  return [...keys.toUpperCase()].join(KEY_SEPARATOR);
}
