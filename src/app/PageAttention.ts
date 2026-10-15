const BLUR_GRACE_MS = 2000;
const HIDDEN: DocumentVisibilityState = 'hidden';

export interface VisibilitySource extends EventTarget {
  readonly visibilityState: DocumentVisibilityState;
}

export interface AttentionTargets {
  readonly page: VisibilitySource;
  readonly window: EventTarget;
}

type AttentionListener = (away: boolean) => void;

export class PageAttention {
  private readonly controller = new AbortController();
  private hidden: boolean;
  private blurred = false;
  private blurTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly onChange: AttentionListener,
    private readonly targets: AttentionTargets = { page: document, window },
  ) {
    this.hidden = this.isPageHidden();
    const { signal } = this.controller;
    targets.page.addEventListener('visibilitychange', this.onVisibilityChange, { signal });
    targets.window.addEventListener('blur', this.onBlur, { signal });
    targets.window.addEventListener('focus', this.onFocus, { signal });
  }

  get away(): boolean {
    return this.hidden || this.blurred;
  }

  dispose(): void {
    this.controller.abort();
    this.cancelBlurTimer();
  }

  private readonly onVisibilityChange = (): void => {
    this.update(() => (this.hidden = this.isPageHidden()));
  };

  private readonly onBlur = (): void => {
    this.cancelBlurTimer();
    this.blurTimer = setTimeout(() => this.update(() => (this.blurred = true)), BLUR_GRACE_MS);
  };

  private readonly onFocus = (): void => {
    this.cancelBlurTimer();
    this.update(() => (this.blurred = false));
  };

  private update(change: () => void): void {
    const wasAway = this.away;
    change();
    if (this.away !== wasAway) this.onChange(this.away);
  }

  private isPageHidden(): boolean {
    return this.targets.page.visibilityState === HIDDEN;
  }

  private cancelBlurTimer(): void {
    clearTimeout(this.blurTimer);
    this.blurTimer = undefined;
  }
}
