/**
 * Blitz timer presets and configuration.
 * Bullet 1min, Blitz 3min, Rapid 5min, Custom 1–10min.
 */

export type TimerPreset = 'bullet' | 'blitz' | 'rapid' | 'custom';

export interface TimerConfig {
  preset: TimerPreset;
  /** Seconds per player (60–600). */
  secondsPerPlayer: number;
  label: string;
}

const BULLET_SEC = 60;
const BLITZ_SEC = 180;
const RAPID_SEC = 300;
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 10;

/** Preset configurations. */
export const TIMER_PRESETS: Record<Exclude<TimerPreset, 'custom'>, TimerConfig> = {
  bullet: { preset: 'bullet', secondsPerPlayer: BULLET_SEC, label: 'Bullet (1 Min)' },
  blitz: { preset: 'blitz', secondsPerPlayer: BLITZ_SEC, label: 'Blitz (3 Min)' },
  rapid: { preset: 'rapid', secondsPerPlayer: RAPID_SEC, label: 'Rapid (5 Min)' },
};

/**
 * Returns timer config for a preset. For 'custom', pass customMinutes (1–10).
 */
export function getTimerConfig(
  preset: TimerPreset,
  customMinutes?: number
): TimerConfig {
  if (preset !== 'custom') {
    return TIMER_PRESETS[preset];
  }
  const min = Math.max(CUSTOM_MIN, Math.min(CUSTOM_MAX, customMinutes ?? 5));
  return {
    preset: 'custom',
    secondsPerPlayer: min * 60,
    label: `Custom (${min} Min)`,
  };
}

/** Custom minute options (1–10). */
export const CUSTOM_MINUTE_OPTIONS: number[] = Array.from(
  { length: CUSTOM_MAX - CUSTOM_MIN + 1 },
  (_, i) => CUSTOM_MIN + i
);

/**
 * Formats seconds as MM:SS.
 */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
