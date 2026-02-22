/**
 * ASMR-style procedural sound synthesis.
 * All sounds: soft, warm, short. Max amplitude ~0.5–0.6. Mini fade-in to avoid clicks.
 */

const SAMPLE_RATE = 44100;

function fadeIn(samples: Float32Array, ms: number): void {
  const n = Math.min(Math.floor((ms / 1000) * SAMPLE_RATE), samples.length);
  for (let i = 0; i < n; i++) {
    samples[i] *= i / n;
  }
}

/** Stein setzen: warm "Klock" 180Hz → 120Hz, ~180ms */
export function generatePlaceSound(): Float32Array {
  const duration = 0.18;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 180 - (60 * t) / duration;
    const envelope = Math.exp(-t * 20);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.55;
  }
  fadeIn(samples, 3);
  return samples;
}

/** Stein auswählen: leises Tick 400Hz, ~90ms */
export function generateSelectSound(): Float32Array {
  const duration = 0.09;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 35);
    samples[i] = Math.sin(2 * Math.PI * 400 * t) * envelope * 0.4;
  }
  fadeIn(samples, 2);
  return samples;
}

/** Stein bewegen: weiches Gleiten – gefiltertes Rauschen, ~250ms */
export function generateMoveSound(): Float32Array {
  const duration = 0.25;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  let prev = 0;
  const cutoff = 0.02; // brown-ish
  for (let i = 0; i < len; i++) {
    prev = prev * (1 - cutoff) + (Math.random() * 2 - 1) * cutoff;
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 15));
    samples[i] = prev * envelope * 0.35;
  }
  fadeIn(samples, 5);
  return samples;
}

/** Mühle geschlossen: C5, E5, G5 Chime, ~550ms */
export function generateMillSound(): Float32Array {
  const duration = 0.55;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const notes = [523.25, 659.25, 783.99];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.12;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const envelope = Math.exp(-noteT * 4);
        sample += Math.sin(2 * Math.PI * notes[n] * noteT) * envelope;
        sample += 0.3 * Math.sin(4 * Math.PI * notes[n] * noteT) * envelope;
      }
    }
    samples[i] = sample * 0.28;
  }
  fadeIn(samples, 4);
  return samples;
}

/** Stein entfernen: leises Pop 300→100Hz, ~220ms */
export function generateRemoveSound(): Float32Array {
  const duration = 0.22;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 300 - (200 * t) / duration;
    const envelope = Math.exp(-t * 12);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
  }
  fadeIn(samples, 2);
  return samples;
}

/** Ungültiger Zug: dumpfes Bonk 150Hz, ~100ms */
export function generateInvalidSound(): Float32Array {
  const duration = 0.1;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 40);
    samples[i] = Math.sin(2 * Math.PI * 150 * t) * envelope * 0.45;
  }
  fadeIn(samples, 2);
  return samples;
}

/** Sieg: C4, E4, G4, C5 aufsteigend, ~1.3s */
export function generateWinSound(): Float32Array {
  const duration = 1.3;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const notes = [261.63, 329.63, 392, 523.25];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.22;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const envelope = Math.exp(-noteT * 2.5);
        sample += Math.sin(2 * Math.PI * notes[n] * noteT) * envelope;
        sample += 0.25 * Math.sin(4 * Math.PI * notes[n] * noteT) * envelope;
      }
    }
    samples[i] = sample * 0.32;
  }
  fadeIn(samples, 5);
  return samples;
}

/** Niederlage: weicher Slide 400→200Hz, ~800ms */
export function generateLoseSound(): Float32Array {
  const duration = 0.8;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 400 - (200 * t) / duration;
    const envelope = Math.exp(-t * 2) * (1 - Math.exp(-t * 8));
    samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
  }
  fadeIn(samples, 5);
  return samples;
}

/** Unentschieden: C4, G4 je ~300ms */
export function generateDrawSound(): Float32Array {
  const duration = 0.7;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const notes = [261.63, 392];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.28;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const envelope = Math.exp(-noteT * 4);
        sample += Math.sin(2 * Math.PI * notes[n] * noteT) * envelope;
      }
    }
    samples[i] = sample * 0.3;
  }
  fadeIn(samples, 4);
  return samples;
}

/** Spielstart: Whoosh + C4 */
export function generateGameStartSound(): Float32Array {
  const duration = 0.45;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  let noise = 0;
  const cutoff = 0.03;
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    noise = noise * (1 - cutoff) + (Math.random() * 2 - 1) * cutoff;
    const whoosh = noise * Math.exp(-t * 8) * (1 - Math.exp(-t * 20)) * 0.25;
    const tone = Math.sin(2 * Math.PI * 261.63 * t) * Math.exp(-t * 5) * 0.3;
    samples[i] = whoosh + tone;
  }
  fadeIn(samples, 5);
  return samples;
}

/** Timer-Tick: 800Hz, ~30ms, sehr leise */
export function generateTimerTickSound(): Float32Array {
  const duration = 0.03;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 80);
    samples[i] = Math.sin(2 * Math.PI * 800 * t) * envelope * 0.25;
  }
  fadeIn(samples, 1);
  return samples;
}

/** Timer-Warnung: 600Hz, ~150ms */
export function generateTimerWarningSound(): Float32Array {
  const duration = 0.15;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 25);
    samples[i] = Math.sin(2 * Math.PI * 600 * t) * envelope * 0.3;
  }
  fadeIn(samples, 2);
  return samples;
}

/** UI-Button: 500Hz, ~50ms */
export function generateButtonTapSound(): Float32Array {
  const duration = 0.05;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 60);
    samples[i] = Math.sin(2 * Math.PI * 500 * t) * envelope * 0.35;
  }
  fadeIn(samples, 1);
  return samples;
}

/** Puzzle gelöst: C5, E5, G5 kurz, ~800ms */
export function generatePuzzleSolvedSound(): Float32Array {
  const duration = 0.8;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const notes = [523.25, 659.25, 783.99];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    let sample = 0;
    for (let n = 0; n < notes.length; n++) {
      const noteStart = n * 0.1;
      if (t >= noteStart) {
        const noteT = t - noteStart;
        const envelope = Math.exp(-noteT * 5);
        sample += Math.sin(2 * Math.PI * notes[n] * noteT) * envelope;
      }
    }
    samples[i] = sample * 0.3;
  }
  fadeIn(samples, 3);
  return samples;
}

/** Achievement: Shimmer-Chime mit Obertönen, ~1s */
export function generateAchievementSound(): Float32Array {
  const duration = 1.0;
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(len);
  const baseFreq = 523.25;
  const harmonics = [1, 1.5, 2, 2.5];
  for (let i = 0; i < len; i++) {
    const t = i / SAMPLE_RATE;
    const envelope = Math.exp(-t * 3) * (1 - Math.exp(-t * 15));
    let sample = 0;
    for (const h of harmonics) {
      sample += Math.sin(2 * Math.PI * baseFreq * h * t) * envelope * (0.25 / h);
    }
    samples[i] = sample * 0.4;
  }
  fadeIn(samples, 5);
  return samples;
}

export { SAMPLE_RATE };
