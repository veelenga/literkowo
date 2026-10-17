import { svg } from '../dom';

const TEST_ICON_PATH =
  'M9 1.8h6v2.2h-2v1.3a8.5 8.5 0 0 1 5.3 2.3l1.3-1.3 1.6 1.6-1.3 1.3A8.5 8.5 0 1 1 11 5.3V4H9zm3 5.7a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zm-1 2.3h2v4.2l2.9 1.7-1 1.7-3.9-2.3z';

export function testIcon(className: string): SVGSVGElement {
  return svg(
    'svg',
    { viewBox: '0 0 24 24', class: className, 'aria-hidden': 'true' },
    svg('path', { d: TEST_ICON_PATH, 'fill-rule': 'evenodd' }),
  );
}
