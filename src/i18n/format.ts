const PLACEHOLDER = /\{(\w+)\}/g;

export function formatParts<T>(
  template: string,
  values: Readonly<Record<string, T>>,
): Array<string | T> {
  return template
    .split(PLACEHOLDER)
    .map((part, index) => (isPlaceholderSlot(index) ? valueOf(values, part) : part))
    .filter((part) => part !== '');
}

export function format(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return formatParts(template, values).join('');
}

function isPlaceholderSlot(index: number): boolean {
  return index % 2 === 1;
}

function valueOf<T>(values: Readonly<Record<string, T>>, name: string): string | T {
  return Object.hasOwn(values, name) ? values[name] : `{${name}}`;
}
