export type GameModule = typeof import('../game/Game');

let pending: Promise<GameModule> | undefined;

export function loadGameModule(): Promise<GameModule> {
  pending ??= import('../game/Game').catch((error: unknown) => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export function prefetchGameModule(): void {
  loadGameModule().catch(() => undefined);
}
