const HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const HTML_SPECIAL = /[&<>"']/g;
const SCRIPT_CLOSING = /</g;
const ESCAPED_LESS_THAN = '\\u003c';

export function escapeHtml(text: string): string {
  return text.replace(HTML_SPECIAL, (char) => HTML_ENTITIES[char] ?? char);
}

export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(SCRIPT_CLOSING, ESCAPED_LESS_THAN);
}
