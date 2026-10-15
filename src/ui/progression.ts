import { levelProgress, rankFor } from '../course/xp';
import type { FloatingText } from '../game/LabelLayer';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, svg } from './dom';
import './progression.css';

const XP_POP_CLASS = 'xp-pop';
const XP_POP_LIFETIME_MS = 900;
const PERCENT = 100;

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

export function coinIcon(className = 'coin-icon'): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true' },
    svg('circle', { class: 'coin-edge', cx: 12, cy: 13, r: 10 }),
    svg('circle', { class: 'coin-face', cx: 12, cy: 11, r: 10 }),
    svg('circle', { class: 'coin-ring', cx: 12, cy: 11, r: 6.5 }),
    svg('path', { class: 'coin-shine', d: 'M6.6 8.4a6 6 0 0 1 4-3.3' }),
  );
}

export function levelDisc(level: number, className = 'level-disc'): HTMLElement {
  return el('span', { class: className, text: String(level), title: playerLevelTitle(level) });
}

export interface XpBar {
  element: HTMLElement;
  fill: HTMLElement;
}

export function xpBar(fraction: number, className = 'xp-bar'): XpBar {
  const fill = el('span', { class: 'xp-bar-fill' });
  setXpBarFill(fill, fraction);
  return { element: el('span', { class: className }, fill), fill };
}

export function setXpBarFill(fill: HTMLElement, fraction: number): void {
  fill.style.width = `${Math.min(1, Math.max(0, fraction)) * PERCENT}%`;
}
