import { i18n } from '../i18n/i18n';
import { el } from './dom';
import { createOverlay, type Overlay } from './overlay';

interface Actions {
  onRetry: () => void;
  onMap: () => void;
}

export function loadErrorOverlay(actions: Actions): Overlay {
  const t = i18n.t;
  return createOverlay(
    el(
      'div',
      { class: 'overlay' },
      el(
        'div',
        { class: 'panel panel-center result-panel is-lost' },
        el('h2', { class: 'result-title', text: t.loadFailed }),
        el('p', { class: 'result-hint', text: t.loadFailedHint }),
        el(
          'div',
          { class: 'actions result-actions' },
          el('button', { class: 'button button-ghost', text: t.map, onClick: actions.onMap }),
          el('button', {
            class: 'button button-primary button-large',
            text: t.retry,
            onClick: actions.onRetry,
          }),
        ),
      ),
    ),
  );
}
