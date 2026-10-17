import { Claims, type Release } from './Claims';

export type ClassList = Pick<DOMTokenList, 'toggle'>;

export class PageClasses {
  private readonly claims = new Claims<string>((name) => this.sync(name));

  constructor(private readonly classList: ClassList) {}

  claim(name: string): Release {
    return this.claims.claim(name);
  }

  releaseAll(): void {
    this.claims.releaseAll();
  }

  private sync(name: string): void {
    this.classList.toggle(name, this.claims.has(name));
  }
}
