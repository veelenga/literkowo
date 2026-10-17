export const RECENT_WORDS = 8;

export class RecentWords {
  private readonly words: string[] = [];

  constructor(private readonly elsewhere?: RecentWords) {}

  has(word: string): boolean {
    return this.words.includes(word);
  }

  hasElsewhere(word: string): boolean {
    return this.elsewhere?.has(word) ?? false;
  }

  add(word: string): void {
    this.words.push(word);
    if (this.words.length > RECENT_WORDS) this.words.shift();
  }
}
