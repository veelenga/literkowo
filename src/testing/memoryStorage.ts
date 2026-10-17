export class MemoryStorage implements Storage {
  private readonly items: Map<string, string>;

  constructor(source?: MemoryStorage) {
    this.items = new Map(source?.items);
  }

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

export class FailingStorage extends MemoryStorage {
  override setItem(): void {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  }
}
