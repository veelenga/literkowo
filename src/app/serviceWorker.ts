export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}
