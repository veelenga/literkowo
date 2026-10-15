import { MAX_STARS } from '../course/scoring';
import { i18n } from '../i18n/i18n';
import type { GameResult } from '../game/Game';
import { el } from './dom';

interface Actions {
  onNext?: () => void;
  onRetry: () => void;
  onMap: () => void;
}

export function levelResult(result: GameResult, stars: number, actions: Actions): HTMLElement {
  const t = i18n.t;
  return el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center' },
      el('h2', { text: result.won ? t.levelComplete : t.levelFailed }),
      el(
        'div',
        { class: 'stars-row' },
        ...Array.from({ length: MAX_STARS }, (_, index) =>
          el('span', {
            class: index < stars ? 'star is-earned' : 'star',
            text: '★',
            style: `--delay: ${index * 0.2}s`,
          }),
        ),
      ),
      el('p', { class: 'muted', text: result.won ? t.starsHint : t.retryHint }),
      el(
        'div',
        { class: 'results' },
        row(t.score, String(result.score)),
        row(t.accuracy, `${Math.round(result.accuracy * 100)}%`),
        row(t.speed, `${result.wpm} ${t.wpm}`),
        row(t.lettersFreed, String(result.lettersFreed)),
      ),
      el(
        'div',
        { class: 'actions' },
        actions.onNext && stars > 0
          ? el('button', { class: 'button button-primary', text: t.next, onClick: actions.onNext })
          : null,
        el('button', {
          class: stars > 0 ? 'button' : 'button button-primary',
          text: t.retry,
          onClick: actions.onRetry,
        }),
        el('button', { class: 'button', text: t.map, onClick: actions.onMap }),
      ),
    ),
  );
}

function row(label: string, value: string): HTMLElement {
  return el(
    'div',
    { class: 'result-row' },
    el('span', { text: label }),
    el('strong', { text: value }),
  );
}
