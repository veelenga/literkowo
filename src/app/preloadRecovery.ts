const RELOAD_FLAG_KEY = 'literkowo.reloadedAfterPreloadError';
const RELOAD_FLAG = 'done';

export function reloadOnceOnPreloadError(): void {
  window.addEventListener('vite:preloadError', () => {
    if (claimReload()) location.reload();
  });
}

function claimReload(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY) === RELOAD_FLAG) return false;
    sessionStorage.setItem(RELOAD_FLAG_KEY, RELOAD_FLAG);
    return true;
  } catch {
    return false;
  }
}
