export class TypedText {
  private seen = '';

  read(value: string, composing: boolean): string[] {
    const added = value.startsWith(this.seen) ? value.slice(this.seen.length) : '';
    this.seen = composing ? value : '';
    return [...added];
  }

  reset(): void {
    this.seen = '';
  }
}
