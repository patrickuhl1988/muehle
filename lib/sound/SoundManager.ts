/**
 * ASMR-style sound manager. Loads real WAV files from assets/sounds, preloads via expo-audio.
 * Respects setEnabled(). Fire-and-forget play; errors caught. Overlapping sounds supported.
 */

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

export type SoundName =
  | 'place'
  | 'select'
  | 'move'
  | 'mill'
  | 'remove'
  | 'invalid'
  | 'win'
  | 'lose'
  | 'draw'
  | 'gameStart'
  | 'buttonTap'
  | 'timerTick'
  | 'timerWarning'
  | 'puzzleSolved'
  | 'achievement';

// Static require() paths – Metro needs literal paths
const SOUND_FILES: Record<SoundName, ReturnType<typeof require>> = {
  place: require('../../assets/sounds/place.wav'),
  select: require('../../assets/sounds/select.wav'),
  move: require('../../assets/sounds/move.wav'),
  mill: require('../../assets/sounds/mill.wav'),
  remove: require('../../assets/sounds/remove.wav'),
  invalid: require('../../assets/sounds/invalid.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  draw: require('../../assets/sounds/draw.wav'),
  gameStart: require('../../assets/sounds/game-start.wav'),
  buttonTap: require('../../assets/sounds/button-tap.wav'),
  timerTick: require('../../assets/sounds/timer-tick.wav'),
  timerWarning: require('../../assets/sounds/timer-warning.wav'),
  puzzleSolved: require('../../assets/sounds/puzzle-solved.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
};

const VOLUME = 0.7;

class SoundManagerImpl {
  private sounds: Map<SoundName, AudioPlayer> = new Map();
  private loaded = false;
  private enabled = true;
  private volume = VOLUME;

  async init(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: false,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });

      const entries = Object.entries(SOUND_FILES) as [SoundName, number][];
      for (const [name, file] of entries) {
        try {
          const player = createAudioPlayer(file, { volume: this.volume });
          this.sounds.set(name, player);
        } catch (err) {
          console.warn(`SoundManager: failed to load ${name}`, err);
        }
      }

      this.loaded = true;
      console.log(`SoundManager: ${this.sounds.size} sounds loaded`);
    } catch (err) {
      console.warn('SoundManager init failed:', err);
    }
  }

  private playSound(name: SoundName): void {
    if (!this.enabled || !this.loaded) return;
    try {
      const player = this.sounds.get(name);
      if (!player) return;
      player.volume = this.volume;
      player.seekTo(0);
      player.play();
    } catch (err) {
      console.warn(`SoundManager play failed: ${name}`, err);
    }
  }

  play(name: SoundName): void {
    this.playSound(name);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  async cleanup(): Promise<void> {
    for (const player of this.sounds.values()) {
      try {
        player.remove();
      } catch {}
    }
    this.sounds.clear();
    this.loaded = false;
  }
}

const instance = new SoundManagerImpl();

/** Singleton SoundManager – init in root layout, then call play() from anywhere. */
export const SoundManager = {
  init: () => instance.init(),
  playPlace: () => instance.play('place'),
  playSelect: () => instance.play('select'),
  playMove: () => instance.play('move'),
  playMill: () => instance.play('mill'),
  playRemove: () => instance.play('remove'),
  playInvalid: () => instance.play('invalid'),
  playWin: () => instance.play('win'),
  playLose: () => instance.play('lose'),
  playDraw: () => instance.play('draw'),
  playGameStart: () => instance.play('gameStart'),
  playTimerTick: () => instance.play('timerTick'),
  playTimerWarning: () => instance.play('timerWarning'),
  playButtonTap: () => instance.play('buttonTap'),
  playPuzzleSolved: () => instance.play('puzzleSolved'),
  playAchievement: () => instance.play('achievement'),
  setEnabled: (enabled: boolean) => instance.setEnabled(enabled),
  isEnabled: () => instance.isEnabled(),
  setVolume: (vol: number) => instance.setVolume(vol),
  cleanup: () => instance.cleanup(),
};
