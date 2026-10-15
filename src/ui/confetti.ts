import { el } from './dom';
import './confetti.css';

const CONFETTI_PIECES = 42;
const CONFETTI_COLORS = ['--accent', '--xp', '--success', '--info', '--danger', '--coin'];
const CONFETTI_MAX_DELAY_MS = 350;
const CONFETTI_MIN_DURATION_MS = 1600;
const CONFETTI_DURATION_SPREAD_MS = 1000;
const CONFETTI_MAX_DRIFT_PX = 120;
const CONFETTI_MAX_SPIN_DEG = 720;
const PERCENT = 100;

export function confetti(pieces = CONFETTI_PIECES): HTMLElement {
  return el(
    'div',
    { class: 'confetti', 'aria-hidden': 'true' },
    ...Array.from({ length: pieces }, confettiPiece),
  );
}

function confettiPiece(): HTMLElement {
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const style = [
    `--x: ${Math.random() * PERCENT}%`,
    `--drift: ${spread(CONFETTI_MAX_DRIFT_PX)}px`,
    `--spin: ${spread(CONFETTI_MAX_SPIN_DEG)}deg`,
    `--delay: ${Math.random() * CONFETTI_MAX_DELAY_MS}ms`,
    `--duration: ${CONFETTI_MIN_DURATION_MS + Math.random() * CONFETTI_DURATION_SPREAD_MS}ms`,
    `--color: var(${color})`,
  ].join('; ');
  return el('span', { class: 'confetti-piece', style });
}

function spread(limit: number): number {
  return (Math.random() * 2 - 1) * limit;
}
