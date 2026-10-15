import { levelProgress, rankFor } from '../course/xp';
import type { FloatingText } from '../game/LabelLayer';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import './progression.css';

const XP_POP_CLASS = 'xp-pop';
const XP_POP_LIFETIME_MS = 900;

export function xpGainText(xp: number): string {
  return format(i18n.t.features.progression.xpGain, { xp: Math.round(xp) });
}

export function xpPop(xp: number): FloatingText {
  return { text: xpGainText(xp), className: XP_POP_CLASS, lifetimeMs: XP_POP_LIFETIME_MS };
}

export function rankName(level: number): string {
  return i18n.t.features.progression.ranks[rankFor(level)];
}

export function playerLevelTitle(level: number): string {
  const levelText = format(i18n.t.features.progression.playerLevel, { level });
  return `${levelText}, ${rankName(level)}`;
}

export function playerLevelOf(xp: number): number {
  return levelProgress(xp).level;
}
