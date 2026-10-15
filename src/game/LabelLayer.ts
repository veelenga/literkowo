import * as THREE from 'three';
import type { StageInsets } from './arena';
import type { Viewport } from './RenderHost';

const LAYER_CLASS = 'label-layer';
const LABEL_CLASS = 'word-label';
const SAFE_SIDE = 80;
const LABEL_CLEARANCE = 48;
const FALLBACK_SAFE_TOP = 120;
const CHROME_INSET_VARIABLE = '--chrome-inset';
const HUD_HEIGHT_VARIABLE = '--hud-height';

export interface FloatingText {
  text: string;
  className: string;
  lifetimeMs: number;
}

export interface LabelTarget {
  readonly label: HTMLElement;
  readonly object: THREE.Object3D;
  readonly labelHeight: number;
}

function cssPixels(element: Element, variable: string): number | undefined {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(variable));
  return Number.isFinite(value) ? value : undefined;
}

function measureSafeTop(element: Element): number {
  const inset = cssPixels(element, CHROME_INSET_VARIABLE);
  const hudHeight = cssPixels(element, HUD_HEIGHT_VARIABLE);
  if (inset === undefined || hudHeight === undefined) return FALLBACK_SAFE_TOP;
  return inset + hudHeight + LABEL_CLEARANCE;
}

export class LabelLayer {
  private readonly element = document.createElement('div');
  private readonly anchor = new THREE.Vector3();
  private readonly safeTop: number;

  constructor(container: HTMLElement) {
    this.element.className = LAYER_CLASS;
    container.append(this.element);
    this.safeTop = measureSafeTop(this.element);
  }

  createLabel(): HTMLElement {
    const label = document.createElement('div');
    label.className = LABEL_CLASS;
    this.element.append(label);
    return label;
  }

  float(anchor: HTMLElement, { text, className, lifetimeMs }: FloatingText): void {
    const floating = document.createElement('div');
    floating.className = className;
    floating.textContent = text;
    floating.style.transform = anchor.style.transform;
    this.element.append(floating);
    window.setTimeout(() => floating.remove(), lifetimeMs);
  }

  position(
    targets: readonly LabelTarget[],
    camera: THREE.Camera,
    viewport: Viewport,
    insets: StageInsets,
  ): void {
    const { width, height } = viewport;
    const top = Math.max(this.safeTop, insets.top + LABEL_CLEARANCE);
    const bottom = Math.max(top, height - insets.bottom);
    for (const target of targets) {
      this.anchor.copy(target.object.position).setY(target.labelHeight).project(camera);
      const x = THREE.MathUtils.clamp(
        ((this.anchor.x + 1) / 2) * width,
        SAFE_SIDE,
        width - SAFE_SIDE,
      );
      const y = THREE.MathUtils.clamp(((1 - this.anchor.y) / 2) * height, top, bottom);
      target.label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  remove(): void {
    this.element.remove();
  }
}
