export type Child = Node | string | null | undefined | false;

export function present(...items: Child[]): Array<Node | string> {
  return items.filter((item): item is Node | string => Boolean(item));
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Partial<
    Record<'class' | 'text' | 'html' | 'title' | 'type' | 'placeholder', string>
  > &
    Record<string, unknown> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') element.className = String(value);
    else if (key === 'text') element.textContent = String(value);
    else if (key === 'html') element.innerHTML = String(value);
    else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else element.setAttribute(key, String(value));
  }
  element.append(...present(...children));
  return element;
}
