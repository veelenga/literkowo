import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { i18n } from '../i18n/i18n';
import { HINT_PILL_LEAVE_MS } from './hintPill';
import { Notice, NOTICE_LIFETIME_MS } from './Notice';

const UNSAVED = 'Postęp nie zapisze się na tym urządzeniu. Zapisz go do pliku w ustawieniach';

function pills(notice: Notice): HTMLElement[] {
  return [...notice.element.querySelectorAll<HTMLElement>('.notice-pill')];
}

describe('Notice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    i18n.set('pl');
  });

  it('announces the text politely without blocking the screen', () => {
    const notice = new Notice();
    notice.show(i18n.t.features.notice.unsaved);
    expect(notice.element.getAttribute('role')).toBe('status');
    expect(pills(notice).map((pill) => pill.textContent)).toEqual([`${UNSAVED}✕`]);
    expect(pills(notice)[0]?.title).toBe('Zamknij');
  });

  it('keeps only the newest notice', () => {
    const notice = new Notice();
    notice.show('Pierwszy');
    notice.show('Drugi');
    expect(pills(notice).map((pill) => pill.textContent)).toEqual(['Drugi✕']);
  });

  it('fades out on its own and on a tap', () => {
    const notice = new Notice();
    notice.show('Pierwszy');
    vi.advanceTimersByTime(NOTICE_LIFETIME_MS + HINT_PILL_LEAVE_MS);
    expect(pills(notice)).toEqual([]);
    notice.show('Drugi');
    pills(notice)[0]?.click();
    expect(pills(notice)).toEqual([]);
  });

  it('speaks the interface language', () => {
    i18n.set('uk');
    const notice = new Notice();
    notice.show(i18n.t.features.notice.unsaved);
    expect(pills(notice)[0]?.title).toBe('Закрити');
    expect(pills(notice)[0]?.textContent).toContain('Поступ не збережеться');
  });
});
