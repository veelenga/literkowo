export interface PortraitRenderer {
  render(character: string): Promise<string>;
  dispose(): void;
}

export type PortraitRendererFactory = () => Promise<PortraitRenderer>;
export type FrameScheduler = (callback: () => void) => void;

const CANCELLED_ERROR = 'Portrait request was cancelled';

function ignore(): void {}

class PortraitJob {
  readonly promise: Promise<string>;
  resolve: (url: string) => void = ignore;
  reject: (reason: unknown) => void = ignore;

  constructor(readonly character: string) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.promise.catch(ignore);
  }
}

export class PortraitCache {
  private readonly portraits = new Map<string, string>();
  private readonly jobs = new Map<string, PortraitJob>();
  private readonly queue: PortraitJob[] = [];
  private renderer: Promise<PortraitRenderer> | undefined;
  private draining = false;

  constructor(
    private readonly createRenderer: PortraitRendererFactory,
    private readonly scheduleFrame: FrameScheduler,
  ) {}

  cached(character: string): string | undefined {
    return this.portraits.get(character);
  }

  portraitFor(character: string): Promise<string> {
    const cached = this.portraits.get(character);
    if (cached) return Promise.resolve(cached);
    return (this.jobs.get(character) ?? this.enqueue(character)).promise;
  }

  preload(characters: readonly string[]): void {
    characters.forEach((character) => void this.portraitFor(character));
  }

  release(): void {
    this.abandonAll(new Error(CANCELLED_ERROR));
  }

  private enqueue(character: string): PortraitJob {
    const job = new PortraitJob(character);
    this.jobs.set(character, job);
    this.queue.push(job);
    if (!this.draining) void this.drain();
    return job;
  }

  private async drain(): Promise<void> {
    this.draining = true;
    while (this.queue.length > 0) {
      await this.nextFrame();
      const job = this.queue.shift();
      if (job) await this.run(job);
    }
    this.draining = false;
    this.disposeRenderer();
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => this.scheduleFrame(resolve));
  }

  private async run(job: PortraitJob): Promise<void> {
    const renderer = await this.acquireRenderer().catch((error: unknown) => {
      this.abandonAll(error);
    });
    if (!renderer) return;
    try {
      this.complete(job, await renderer.render(job.character));
    } catch (error) {
      this.fail(job, error);
    }
  }

  private complete(job: PortraitJob, url: string): void {
    if (this.isCurrent(job)) {
      this.portraits.set(job.character, url);
      this.jobs.delete(job.character);
    }
    job.resolve(url);
  }

  private fail(job: PortraitJob, error: unknown): void {
    if (this.isCurrent(job)) this.jobs.delete(job.character);
    job.reject(error);
  }

  private isCurrent(job: PortraitJob): boolean {
    return this.jobs.get(job.character) === job;
  }

  private acquireRenderer(): Promise<PortraitRenderer> {
    this.renderer ??= this.createRenderer();
    return this.renderer;
  }

  private abandonAll(reason: unknown): void {
    this.jobs.forEach((job) => job.reject(reason));
    this.jobs.clear();
    this.queue.length = 0;
    this.disposeRenderer();
  }

  private disposeRenderer(): void {
    const pending = this.renderer;
    this.renderer = undefined;
    pending?.then((renderer) => renderer.dispose(), ignore);
  }
}

function loadStudio(): Promise<PortraitRenderer> {
  return import('./portraits/PortraitStudio').then(({ PortraitStudio }) => new PortraitStudio());
}

function onNextAnimationFrame(callback: () => void): void {
  requestAnimationFrame(() => callback());
}

const portraits = new PortraitCache(loadStudio, onNextAnimationFrame);

export function portraitFor(character: string): Promise<string> {
  return portraits.portraitFor(character);
}

export function cachedPortrait(character: string): string | undefined {
  return portraits.cached(character);
}

export function preloadPortraits(characters: readonly string[]): void {
  portraits.preload(characters);
}

export function releasePortraits(): void {
  portraits.release();
}
