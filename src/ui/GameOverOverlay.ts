import { i18n } from '../i18n/i18n';
import type { GameResult } from '../game/Game';
import { el } from './dom';

interface Actions {
  onPlayAgain: () => void;
  onSwitchPlayer: () => void;
}

export function gameOverOverlay(
  result: GameResult,
  isRecord: boolean,
  actions: Actions,
): HTMLElement {
  const t = i18n.t;
  return el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center' },
      el('h2', { text: t.gameOver }),
      isRecord ? el('p', { class: 'record', text: t.newRecord }) : el('p', { text: t.wellDone }),
      el(
        'div',
        { class: 'results' },
        resultRow(t.score, String(result.score)),
        resultRow(t.accuracy, `${Math.round(result.accuracy * 100)}%`),
        resultRow(t.speed, `${result.wpm} ${t.wpm}`),
      ),
      el(
        'div',
        { class: 'actions' },
        el('button', {
          class: 'button button-primary',
          text: t.playAgain,
          onClick: actions.onPlayAgain,
        }),
        el('button', { class: 'button', text: t.backToProfiles, onClick: actions.onSwitchPlayer }),
      ),
    ),
  );
}

export function pauseOverlay(): HTMLElement {
  const t = i18n.t;
  return el(
    'div',
    { class: 'overlay' },
    el(
      'div',
      { class: 'panel panel-center' },
      el('h2', { text: t.paused }),
      el('p', { text: t.resumeHint }),
    ),
  );
}

function resultRow(label: string, value: string): HTMLElement {
  return el(
    'div',
    { class: 'result-row' },
    el('span', { text: label }),
    el('strong', { text: value }),
  );
}
