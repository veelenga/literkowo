export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}
