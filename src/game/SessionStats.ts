const SECONDS_PER_MINUTE = 60;
const CHARS_PER_WORD = 5;
const BASE_POINTS_PER_CHAR = 10;
const COMBO_STEP = 5;
const MAX_MULTIPLIER = 5;

export class SessionStats {
  score = 0;
  combo = 0;
  hits = 0;
  mistakes = 0;
  private startedAt = performance.now();

  get accuracy(): number {
    const total = this.hits + this.mistakes;
    return total === 0 ? 1 : this.hits / total;
  }

  get multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
  }

  get wpm(): number {
    const minutes = (performance.now() - this.startedAt) / 1000 / SECONDS_PER_MINUTE;
    return minutes <= 0 ? 0 : Math.round(this.hits / CHARS_PER_WORD / minutes);
  }

  recordHit(): void {
    this.hits += 1;
    this.combo += 1;
  }

  recordMistake(): void {
    this.mistakes += 1;
    this.combo = 0;
  }

  recordWord(word: string): void {
    this.score += word.length * BASE_POINTS_PER_CHAR * this.multiplier;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.hits = 0;
    this.mistakes = 0;
    this.startedAt = performance.now();
  }
}
