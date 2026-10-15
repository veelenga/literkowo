const REVEALED_CLASS = 'is-revealed';
const REVEAL_MARGIN = '0px 0px -6% 0px';
const REVEAL_STAGGER_MS = 70;
const SCROLL_CENTER_PROPERTY = '--scroll-center';
const HALF = 2;

export type StopEffect = () => void;

export function revealOnEnter(targets: readonly HTMLElement[]): StopEffect {
  const observer = new IntersectionObserver(
    (entries) =>
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          if (!(entry.target instanceof HTMLElement)) return;
          entry.target.style.setProperty('--reveal-delay', `${index * REVEAL_STAGGER_MS}ms`);
          entry.target.classList.add(REVEALED_CLASS);
          observer.unobserve(entry.target);
        }),
    { rootMargin: REVEAL_MARGIN },
  );
  targets.forEach((target) => observer.observe(target));
  return () => observer.disconnect();
}

export function followScroll(scroller: HTMLElement, scene: HTMLElement): StopEffect {
  let frame = 0;
  const update = () => {
    frame = 0;
    const center = scroller.scrollTop + scroller.clientHeight / HALF - scene.offsetTop;
    scene.style.setProperty(SCROLL_CENTER_PROPERTY, String(Math.round(center)));
  };
  const schedule = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };
  scroller.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();
  return () => {
    cancelAnimationFrame(frame);
    scroller.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
  };
}
