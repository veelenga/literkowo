import { NO_INSETS, type StageInsets } from '../game/arena';
import { PHONE_LAYOUT_QUERY } from './formFactor';
import { KEYBOARD_OPEN_ATTRIBUTE } from './keyboardFit';

const SIDE_GUTTER = 16;

export interface StageLayout {
  readonly stageTop: number;
  readonly stageHeight: number;
  readonly hudBottom: number;
  readonly visibleHeight: number;
}

export function arenaInsets(layout: StageLayout): StageInsets {
  const { stageTop, stageHeight } = layout;
  return {
    top: clamp(layout.hudBottom - stageTop, stageHeight),
    bottom: clamp(stageTop + stageHeight - layout.visibleHeight, stageHeight),
    side: SIDE_GUTTER,
  };
}

export function watchStageInsets(
  stage: HTMLElement,
  hud: HTMLElement,
  onChange: (insets: StageInsets) => void,
): () => void {
  const phone = window.matchMedia(PHONE_LAYOUT_QUERY);
  const viewport = window.visualViewport;
  const update = () => onChange(phone.matches ? arenaInsets(measure(stage, hud)) : NO_INSETS);
  const resizes = new ResizeObserver(update);
  resizes.observe(stage);
  resizes.observe(hud);
  phone.addEventListener('change', update);
  viewport?.addEventListener('resize', update);
  update();
  return () => {
    resizes.disconnect();
    phone.removeEventListener('change', update);
    viewport?.removeEventListener('resize', update);
  };
}

function measure(stage: HTMLElement, hud: HTMLElement): StageLayout {
  return {
    stageTop: stage.offsetTop,
    stageHeight: stage.offsetHeight,
    hudBottom: hud.offsetTop + hud.offsetHeight,
    visibleHeight: visibleHeight(),
  };
}

function visibleHeight(): number {
  const keyboardOpen = document.documentElement.hasAttribute(KEYBOARD_OPEN_ATTRIBUTE);
  return keyboardOpen && window.visualViewport
    ? window.visualViewport.height
    : Number.POSITIVE_INFINITY;
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), max);
}
