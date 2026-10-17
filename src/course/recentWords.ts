export const RECENT_WORDS = 8;

export class RecentWords {
  private readonly words: string[] = [];

  has(word: string): boolean {
    return this.words.includes(word);
  }

  add(word: string): void {
    this.words.push(word);
    if (this.words.length > RECENT_WORDS) this.words.shift();
  }
}
