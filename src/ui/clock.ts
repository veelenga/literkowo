const SECONDS_PER_MINUTE = 60;
const TWO_DIGITS = 2;

export function clockText(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
  const rest = String(whole % SECONDS_PER_MINUTE).padStart(TWO_DIGITS, '0');
  return `${minutes}:${rest}`;
}
