export interface Typable {
  readonly expectedChar: string | undefined;
  readonly isComplete: boolean;
  advance(): void;
  resetTyped(): void;
}

export type Keystroke<T> =
  | { readonly kind: 'miss' }
  | { readonly kind: 'hit' }
  | { readonly kind: 'complete'; readonly item: T };

export type CandidateMarker<T> = (item: T, isCandidate: boolean) => void;

const MISS = { kind: 'miss' } as const;
const HIT = { kind: 'hit' } as const;

export class Targeting<T extends Typable> {
  private current: readonly T[] = [];

  constructor(private readonly mark: CandidateMarker<T> = () => undefined) {}

  get candidates(): readonly T[] {
    return this.current;
  }

  type(char: string, ranked: readonly T[]): Keystroke<T> {
    const matching = this.pool(ranked).filter((item) => item.expectedChar === char);
    if (!matching.length) return MISS;
    this.narrowTo(matching);
    matching.forEach((item) => item.advance());
    const completed = matching.find((item) => item.isComplete);
    if (!completed) return HIT;
    this.complete(completed);
    return { kind: 'complete', item: completed };
  }

  forget(item: T): void {
    if (!this.current.includes(item)) return;
    this.current = this.current.filter((other) => other !== item);
    this.mark(item, false);
  }

  private pool(ranked: readonly T[]): readonly T[] {
    const candidates = ranked.filter((item) => this.current.includes(item));
    return candidates.length ? candidates : ranked;
  }

  private narrowTo(next: readonly T[]): void {
    this.current.filter((item) => !next.includes(item)).forEach((item) => this.drop(item));
    next.filter((item) => !this.current.includes(item)).forEach((item) => this.mark(item, true));
    this.current = next;
  }

  private complete(item: T): void {
    this.current.filter((other) => other !== item).forEach((other) => this.drop(other));
    this.current = [];
    this.mark(item, false);
  }

  private drop(item: T): void {
    item.resetTyped();
    this.mark(item, false);
  }
}
