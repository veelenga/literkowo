import type { ThemeId } from '../course/regions';
import { StoredToggle } from './StoredToggle';
import { onAudioUnlocked, peekAudioOutput, setAudioPaused, type AudioOutput } from './audioContext';
import { MusicBus } from './music/MusicBus';
import { MusicSession } from './music/MusicSession';
import type { MusicMood } from './music/specs';
import { arrangementFor } from './music/themes';
import { VoiceBudget } from './music/VoiceBudget';

const STORAGE_KEY = 'literkowo.music';
const MAX_VOICES = 8;
const CROSSFADE_SECONDS = 1.5;
const STOP_FADE_SECONDS = 1;
const MUTE_FADE_SECONDS = 0.05;
const INTENSITY_EPSILON = 0.01;

interface Track {
  theme: ThemeId;
  mood: MusicMood;
}

interface Playback {
  track: Track;
  session: MusicSession;
}

export class Music {
  private readonly toggle = new StoredToggle(STORAGE_KEY);
  private readonly budget = new VoiceBudget(MAX_VOICES);
  private bus: MusicBus | undefined;
  private requested: Track | undefined;
  private playback: Playback | undefined;
  private intensity = 0;

  constructor() {
    onAudioUnlocked(() => this.playRequested());
  }

  get enabled(): boolean {
    return this.toggle.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.toggle.set(enabled);
    if (enabled) this.playRequested();
    else this.fadeOutPlayback(MUTE_FADE_SECONDS);
  }

  play(theme: ThemeId, mood: MusicMood): void {
    this.requested = { theme, mood };
    this.playRequested();
  }

  stop(): void {
    this.requested = undefined;
    this.fadeOutPlayback(STOP_FADE_SECONDS);
  }

  pause(): void {
    setAudioPaused(true);
  }

  resume(): void {
    setAudioPaused(false);
  }

  setIntensity(value: number): void {
    const intensity = Math.min(1, Math.max(0, value));
    if (Math.abs(intensity - this.intensity) < INTENSITY_EPSILON) return;
    this.intensity = intensity;
    this.playback?.session.setIntensity(intensity);
    this.bus?.setBrightness(intensity);
  }

  private playRequested(): void {
    const track = this.requested;
    const output = peekAudioOutput();
    if (!track || !output || !this.enabled || this.isPlaying(track)) return;
    this.fadeOutPlayback(CROSSFADE_SECONDS);
    const session = this.createSession(track, output);
    session.start(CROSSFADE_SECONDS);
    this.playback = { track, session };
  }

  private createSession(track: Track, { context, music }: AudioOutput): MusicSession {
    this.bus ??= new MusicBus(context, music);
    this.bus.setBrightness(this.intensity);
    const session = new MusicSession({
      context,
      destination: this.bus.input,
      arrangement: arrangementFor(track.theme, track.mood),
      budget: this.budget,
    });
    session.setIntensity(this.intensity);
    return session;
  }

  private isPlaying(track: Track): boolean {
    const current = this.playback?.track;
    return current?.theme === track.theme && current.mood === track.mood;
  }

  private fadeOutPlayback(fadeSeconds: number): void {
    this.playback?.session.fadeOut(fadeSeconds);
    this.playback = undefined;
  }
}

export const music = new Music();
