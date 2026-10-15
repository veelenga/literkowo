import type { AnnounceStyle } from '../game/mechanics/Mechanic';
import { el } from './dom';
import './callouts.css';

const ACCENT_VARIABLE = '--callout-accent';
const FEVER_CLASS = 'is-fever';
const LEAVING_CLASS = 'is-leaving';
const MAX_VISIBLE_PER_STYLE = 3;
const EARLY_EXIT_MS = 200;

const STYLE_CLASSES: Record<AnnounceStyle, string> = {
  callout: 'callout',
  banner: 'callout callout-banner',
  warning: 'callout callout-warning',
};

const LIFETIMES_MS: Record<AnnounceStyle, number> = {
  callout: 900,
  banner: 1400,
  warning: 1800,
};

const SLOT_HEIGHTS_PX: Record<AnnounceStyle, number> = {
  callout: 88,
  banner: 120,
  warning: 96,
};

const RISE_PX: Record<AnnounceStyle, number> = {
  callout: 50,
  banner: 0,
  warning: 0,
};

const COLUMN_ORDER: readonly AnnounceStyle[] = ['banner', 'callout'];
const WARNING_REST_PX = Math.min(
  ...COLUMN_ORDER.map((style) => -RISE_PX[style] - pitch(style, 'warning')),
);

interface Announcement {
  readonly style: AnnounceStyle;
  readonly element: HTMLElement;
  readonly timer: number;
}

export class Callouts {
  readonly element = el('div', { class: 'callouts' });
  private visible: Announcement[] = [];

  show(text: string, style: AnnounceStyle, accent?: string): void {
    const element = el('div', { class: STYLE_CLASSES[style], text });
    if (accent) element.style.setProperty(ACCENT_VARIABLE, accent);
    const timer = window.setTimeout(() => this.expire(element), LIFETIMES_MS[style]);
    this.visible.push({ style, element, timer });
    this.element.append(element);
    this.trimOverflow(style);
    this.layout();
  }

  setFever(active: boolean): void {
    this.element.classList.toggle(FEVER_CLASS, active);
  }

  private expire(element: HTMLElement): void {
    this.forget(element);
    element.remove();
    this.layout();
  }

  private trimOverflow(style: AnnounceStyle): void {
    this.oldestFirst(style)
      .slice(0, -MAX_VISIBLE_PER_STYLE)
      .forEach((announcement) => this.exitEarly(announcement));
  }

  private exitEarly({ element, timer }: Announcement): void {
    window.clearTimeout(timer);
    this.forget(element);
    element.classList.add(LEAVING_CLASS);
    window.setTimeout(() => element.remove(), EARLY_EXIT_MS);
  }

  private forget(element: HTMLElement): void {
    this.visible = this.visible.filter((announcement) => announcement.element !== element);
  }

  private layout(): void {
    this.layoutColumn();
    this.layoutWarnings();
  }

  private layoutColumn(): void {
    let previous: Announcement | undefined;
    let rest = 0;
    for (const announcement of COLUMN_ORDER.flatMap((style) => this.newestFirst(style))) {
      rest = previous
        ? rest + pitch(previous.style, announcement.style)
        : -RISE_PX[announcement.style];
      place(announcement, rest);
      previous = announcement;
    }
  }

  private layoutWarnings(): void {
    this.oldestFirst('warning').forEach((announcement, index) =>
      place(announcement, WARNING_REST_PX - index * SLOT_HEIGHTS_PX.warning),
    );
  }

  private newestFirst(style: AnnounceStyle): Announcement[] {
    return this.oldestFirst(style).reverse();
  }

  private oldestFirst(style: AnnounceStyle): Announcement[] {
    return this.visible.filter((announcement) => announcement.style === style);
  }
}

function pitch(upper: AnnounceStyle, lower: AnnounceStyle): number {
  return (SLOT_HEIGHTS_PX[upper] + SLOT_HEIGHTS_PX[lower]) / 2;
}

function place({ element, style }: Announcement, rest: number): void {
  element.style.top = `${rest + RISE_PX[style]}px`;
}
