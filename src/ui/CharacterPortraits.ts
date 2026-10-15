import { AVATARS } from '../profiles/Profile';

export interface PortraitRenderer<Subject = string> {
  render(subject: Subject): Promise<string>;
  dispose(): void;
}

export type PortraitRendererFactory<Subject = string> = () => Promise<PortraitRenderer<Subject>>;
export type FrameScheduler = (callback: () => void) => void;

export interface PortraitCacheOptions<Subject = string> {
  createRenderer: PortraitRendererFactory<Subject>;
  keyOf: (subject: Subject) => string;
  scheduleFrame: FrameScheduler;
  rosterSize: number;
  idleReleaseMs: number;
}

const CANCELLED_ERROR = 'Portrait request was cancelled';
const IDLE_RELEASE_MS = 4000;

function ignore(): void {}

class PortraitJob<Subject> {
  readonly promise: Promise<string>;
  resolve: (url: string) => void = ignore;
  reject: (reason: unknown) => void = ignore;

  constructor(
    readonly subject: Subject,
    readonly key: string,
  ) {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.promise.catch(ignore);
  }
}

export class PortraitCache<Subject = string> {
  private readonly portraits = new Map<string, string>();
  private readonly jobs = new Map<string, PortraitJob<Subject>>();
  private readonly queue: PortraitJob<Subject>[] = [];
  private renderer: Promise<PortraitRenderer<Subject>> | undefined;
  private idleRelease: ReturnType<typeof setTimeout> | undefined;
  private draining = false;

  constructor(private readonly options: PortraitCacheOptions<Subject>) {}

  cached(subject: Subject): string | undefined {
    return this.portraits.get(this.options.keyOf(subject));
  }

  portraitFor(subject: Subject): Promise<string> {
    const key = this.options.keyOf(subject);
    const cached = this.portraits.get(key);
    if (cached) return Promise.resolve(cached);
    return (this.jobs.get(key) ?? this.enqueue(subject, key)).promise;
  }

  preload(subjects: readonly Subject[]): void {
    subjects.forEach((subject) => void this.portraitFor(subject));
  }

  release(): void {
    this.abandonAll(new Error(CANCELLED_ERROR));
  }

  private enqueue(subject: Subject, key: string): PortraitJob<Subject> {
    const job = new PortraitJob(subject, key);
    this.jobs.set(key, job);
    this.queue.push(job);
    this.cancelIdleRelease();
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
    this.releaseRendererWhenIdle();
  }

  private nextFrame(): Promise<void> {
    return new Promise((resolve) => this.options.scheduleFrame(resolve));
  }

  private async run(job: PortraitJob<Subject>): Promise<void> {
    const renderer = await this.acquireRenderer().catch((error: unknown) => {
      this.abandonAll(error);
    });
    if (!renderer) return;
    try {
      this.complete(job, await renderer.render(job.subject));
    } catch (error) {
      this.fail(job, error);
    }
  }

  private complete(job: PortraitJob<Subject>, url: string): void {
    if (this.isCurrent(job)) {
      this.portraits.set(job.key, url);
      this.jobs.delete(job.key);
    }
    job.resolve(url);
  }

  private fail(job: PortraitJob<Subject>, error: unknown): void {
    if (this.isCurrent(job)) this.jobs.delete(job.key);
    job.reject(error);
  }

  private isCurrent(job: PortraitJob<Subject>): boolean {
    return this.jobs.get(job.key) === job;
  }

  private acquireRenderer(): Promise<PortraitRenderer<Subject>> {
    this.renderer ??= this.options.createRenderer();
    return this.renderer;
  }

  private abandonAll(reason: unknown): void {
    this.jobs.forEach((job) => job.reject(reason));
    this.jobs.clear();
    this.queue.length = 0;
    this.disposeRenderer();
  }

  private releaseRendererWhenIdle(): void {
    if (this.portraits.size >= this.options.rosterSize) return this.disposeRenderer();
    this.cancelIdleRelease();
    this.idleRelease = setTimeout(() => this.disposeRenderer(), this.options.idleReleaseMs);
  }

  private cancelIdleRelease(): void {
    clearTimeout(this.idleRelease);
    this.idleRelease = undefined;
  }

  private disposeRenderer(): void {
    this.cancelIdleRelease();
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

const portraits = new PortraitCache({
  createRenderer: loadStudio,
  keyOf: (character) => character,
  scheduleFrame: onNextAnimationFrame,
  rosterSize: AVATARS.length,
  idleReleaseMs: IDLE_RELEASE_MS,
});

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
