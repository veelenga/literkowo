import type { StampDay } from '../../arena/daily';
import { format } from '../../i18n/format';
import { i18n } from '../../i18n/i18n';
import { el, svg } from '../dom';

const CHECK_PATH = 'M9.4 17.2 4.6 12.4l1.8-1.8 3 3 8.2-8.2 1.8 1.8z';

export function stampRow(days: readonly StampDay[]): HTMLElement {
  const names = i18n.t.features.daily.weekdays;
  return el(
    'ol',
    { class: 'stamp-row' },
    ...days.map((day, index) => stamp(day, names[index] ?? day.day)),
  );
}

function stamp(day: StampDay, name: string): HTMLElement {
  return el(
    'li',
    { class: stampClass(day), 'aria-label': stampLabel(day, name) },
    el('span', { class: 'stamp-day', text: name }),
    el('span', { class: 'stamp-mark' }, day.stamped ? checkIcon() : null),
  );
}

function stampClass({ stamped, isToday, isAhead }: StampDay): string {
  const classes = ['stamp'];
  if (stamped) classes.push('is-stamped');
  if (isToday) classes.push('is-today');
  if (isAhead) classes.push('is-ahead');
  return classes.join(' ');
}

function stampLabel({ stamped, isToday }: StampDay, name: string): string {
  const copy = i18n.t.features.daily;
  if (stamped) return format(copy.stamped, { day: name });
  return isToday ? format(copy.today, { day: name }) : name;
}

function checkIcon(): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: 'stamp-check', 'aria-hidden': 'true' },
    svg('path', { d: CHECK_PATH }),
  );
}
