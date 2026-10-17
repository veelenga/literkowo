export type Release = () => void;

interface Claim<T> {
  readonly value: T;
}

export class Claims<T> {
  private readonly active = new Set<Claim<T>>();

  constructor(private readonly onChange: (value: T) => void = ignore) {}

  get values(): T[] {
    return [...this.active].map((claim) => claim.value);
  }

  has(value: T): boolean {
    return this.values.includes(value);
  }

  claim(value: T): Release {
    const claim = { value };
    this.active.add(claim);
    this.onChange(value);
    return () => this.release(claim);
  }

  releaseAll(): void {
    const released = this.values;
    this.active.clear();
    released.forEach((value) => this.onChange(value));
  }

  private release(claim: Claim<T>): void {
    if (this.active.delete(claim)) this.onChange(claim.value);
  }
}

function ignore(): void {}
