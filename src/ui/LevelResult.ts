import { MAX_STARS, accuracyPercent, starThresholdPercents } from '../course/scoring';
import type { GameResult } from '../game/Game';
import { format } from '../i18n/format';
import { i18n } from '../i18n/i18n';
import { el, icon } from './dom';
import { ResultKeys } from './mastery';
import type { Overlay } from './overlay';
import { resultOverlay, statTile, type ResultActions, type ResultRewards } from './ResultOverlay';
import type { OpenShop } from './resultTreasures';

const STAR_INTRO_MS = 240;
const STAR_STAGGER_MS = 220;
const COUNTER_START_MS = STAR_INTRO_MS + MAX_STARS * STAR_STAGGER_MS;
const PLAIN_BUTTON_CLASS = 'button';

interface Actions {
  onNext?: () => void;
  onRetry: () => void;
  onMap: () => void;
  onShop: OpenShop;
}

export function levelResult(
  result: GameResult,
  stars: number,
  earned: ResultRewards,
  actions: Actions,
): Overlay {
  const t = i18n.t;
  return resultOverlay({
    mood: result.won ? 'won' : 'lost',
    title: result.won ? t.levelComplete : t.levelFailed,
    badge: starsRow(stars),
    hint: result.won ? starsHint() : t.retryHint,
    tiles: [
      statTile(t.score, result.score),
      statTile(t.accuracy, accuracyPercent(result.accuracy), '%'),
      statTile(t.speed, result.wpm, t.wpm),
      statTile(t.lettersFreed, result.lettersFreed),
    ],
    earned,
    revealDelayMs: COUNTER_START_MS,
    mastery: new ResultKeys(result.keys),
    actions: resultActions(stars, actions),
    onShop: actions.onShop,
  });
}

function starsHint(): string {
  const [one, two, three] = starThresholdPercents();
  return format(i18n.t.starsHint, { one, two, three });
}

function starsRow(stars: number): HTMLElement {
  return el(
    'div',
    { class: 'stars-row', 'aria-label': `${stars} / ${MAX_STARS}` },
    ...Array.from({ length: MAX_STARS }, (_, index) => {
      const star = icon('star', index < stars ? 'star is-earned' : 'star');
      star.style.setProperty('--delay', `${STAR_INTRO_MS + index * STAR_STAGGER_MS}ms`);
      return star;
    }),
  );
}

function resultActions(stars: number, actions: Actions): ResultActions {
  const t = i18n.t;
  const map = { label: t.map, run: actions.onMap };
  const retry = { label: t.retry, run: actions.onRetry, secondaryClass: PLAIN_BUTTON_CLASS };
  const onNext = stars > 0 ? actions.onNext : undefined;
  if (!onNext) return { buttons: [map, retry], primary: stars === 0 ? retry : map };
  const next = { label: t.next, run: onNext };
  return { buttons: [map, retry, next], primary: next };
}
