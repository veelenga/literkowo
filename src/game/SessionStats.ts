import { FEVER_COMBO, FEVER_MULTIPLIER } from './combo';

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
  fever = false;
  private activeSeconds = 0;
  private frozen = false;
  private feverSlips = 0;

  get accuracy(): number {
    const total = this.hits + this.mistakes;
    return total === 0 ? 1 : this.hits / total;
  }

  get multiplier(): number {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
  }

  get wpm(): number {
    const minutes = this.activeSeconds / SECONDS_PER_MINUTE;
    return minutes <= 0 ? 0 : Math.round(this.hits / CHARS_PER_WORD / minutes);
  }

  addActiveTime(seconds: number): void {
    if (!this.frozen) this.activeSeconds += seconds;
  }

  freeze(): void {
    this.frozen = true;
  }

  recordHit(): void {
    this.hits += 1;
    this.combo += 1;
    if (this.combo >= FEVER_COMBO) this.fever = true;
  }

  recordMistake(): void {
    this.mistakes += 1;
    this.combo = 0;
    this.fever = this.fever && this.spendFeverSlip();
  }

  keepFeverOnSlips(slips: number): void {
    this.feverSlips = Math.max(0, slips);
  }

  recordWord(word: string): void {
    const feverBonus = this.fever ? FEVER_MULTIPLIER : 1;
    this.score += word.length * BASE_POINTS_PER_CHAR * this.multiplier * feverBonus;
  }

  private spendFeverSlip(): boolean {
    if (this.feverSlips <= 0) return false;
    this.feverSlips -= 1;
    return true;
  }
}
