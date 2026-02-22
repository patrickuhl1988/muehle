const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const OUTPUT_DIR = path.join(__dirname, 'assets', 'sounds');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper: create WAV buffer from samples
function createWav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);          // chunk size
  buffer.writeUInt16LE(1, 20);           // PCM
  buffer.writeUInt16LE(1, 22);           // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // sample rate
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);           // block align
  buffer.writeUInt16LE(16, 34);          // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  return buffer;
}

// Helper: generate samples
function generate(duration, fn) {
  const len = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    samples[i] = fn(i / SAMPLE_RATE, i, len);
  }
  return samples;
}

// Helper: soft fade in/out to prevent clicks
function applyFades(samples, fadeIn = 0.005, fadeOut = 0.01) {
  const fadeInSamples = Math.floor(fadeIn * SAMPLE_RATE);
  const fadeOutSamples = Math.floor(fadeOut * SAMPLE_RATE);
  for (let i = 0; i < fadeInSamples && i < samples.length; i++) {
    samples[i] *= i / fadeInSamples;
  }
  for (let i = 0; i < fadeOutSamples && i < samples.length; i++) {
    samples[samples.length - 1 - i] *= i / fadeOutSamples;
  }
  return samples;
}

// ─── SOUND DEFINITIONS ───

// 1. Place stone: warm wood "klock"
const place = generate(0.18, (t) => {
  const freq = 180 - 80 * (t / 0.18);
  const env = Math.exp(-t * 25);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.6;
});

// 2. Select stone: light tick
const select = generate(0.08, (t) => {
  const env = Math.exp(-t * 60);
  return Math.sin(2 * Math.PI * 400 * t) * env * 0.35;
});

// 3. Move stone: soft slide
const move = generate(0.25, (t) => {
  const env = Math.exp(-t * 8) * (1 - Math.exp(-t * 100));
  return (Math.random() * 2 - 1) * env * 0.15; // filtered noise
});

// 4. Mill formed: satisfying three-note chime
const mill = generate(0.7, (t) => {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  let s = 0;
  for (let n = 0; n < notes.length; n++) {
    const start = n * 0.13;
    if (t >= start) {
      const nt = t - start;
      const env = Math.exp(-nt * 3.5);
      s += Math.sin(2 * Math.PI * notes[n] * nt) * env;
      s += Math.sin(2 * Math.PI * notes[n] * 2 * nt) * env * 0.15; // overtone
    }
  }
  return s * 0.25;
});

// 5. Remove stone: soft pop
const remove = generate(0.22, (t) => {
  const freq = 300 - 200 * (t / 0.22);
  const env = Math.exp(-t * 18);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.5;
});

// 6. Invalid move: dull bonk
const invalid = generate(0.1, (t) => {
  const env = Math.exp(-t * 40);
  return Math.sin(2 * Math.PI * 150 * t) * env * 0.4;
});

// 7. Win: warm ascending melody
const win = generate(1.4, (t) => {
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  let s = 0;
  for (let n = 0; n < notes.length; n++) {
    const start = n * 0.25;
    if (t >= start) {
      const nt = t - start;
      const env = Math.exp(-nt * 2.5);
      s += Math.sin(2 * Math.PI * notes[n] * nt) * env;
      s += Math.sin(2 * Math.PI * notes[n] * 1.5 * nt) * env * 0.1; // fifth overtone
    }
  }
  return s * 0.22;
});

// 8. Lose: gentle descending tone
const lose = generate(0.8, (t) => {
  const freq = 400 - 200 * (t / 0.8);
  const env = Math.exp(-t * 2.5);
  return Math.sin(2 * Math.PI * freq * t) * env * 0.35;
});

// 9. Draw: two neutral tones
const draw = generate(0.7, (t) => {
  let s = 0;
  if (t < 0.35) {
    const env = Math.exp(-t * 4);
    s = Math.sin(2 * Math.PI * 261.63 * t) * env; // C4
  }
  if (t >= 0.25) {
    const nt = t - 0.25;
    const env = Math.exp(-nt * 4);
    s += Math.sin(2 * Math.PI * 392.00 * nt) * env; // G4
  }
  return s * 0.25;
});

// 10. Game start: soft whoosh + tone
const gameStart = generate(0.45, (t) => {
  const noise = (Math.random() * 2 - 1) * Math.exp(-t * 6) * (1 - Math.exp(-t * 50)) * 0.12;
  const tone = Math.sin(2 * Math.PI * 261.63 * t) * Math.exp(-t * 4) * 0.3;
  return noise + tone;
});

// 11. Button tap: minimal click
const buttonTap = generate(0.04, (t) => {
  const env = Math.exp(-t * 100);
  return Math.sin(2 * Math.PI * 500 * t) * env * 0.25;
});

// 12. Timer tick
const timerTick = generate(0.03, (t) => {
  const env = Math.exp(-t * 120);
  return Math.sin(2 * Math.PI * 800 * t) * env * 0.2;
});

// 13. Timer warning
const timerWarning = generate(0.12, (t) => {
  const env = Math.exp(-t * 20);
  return Math.sin(2 * Math.PI * 600 * t) * env * 0.35;
});

// 14. Puzzle solved: short bright chime
const puzzleSolved = generate(0.8, (t) => {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  let s = 0;
  for (let n = 0; n < notes.length; n++) {
    const start = n * 0.1;
    if (t >= start) {
      const nt = t - start;
      s += Math.sin(2 * Math.PI * notes[n] * nt) * Math.exp(-nt * 4) * 0.3;
    }
  }
  return s;
});

// 15. Achievement unlocked: shimmer
const achievement = generate(1.0, (t) => {
  let s = 0;
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  for (let n = 0; n < freqs.length; n++) {
    const start = n * 0.08;
    if (t >= start) {
      const nt = t - start;
      s += Math.sin(2 * Math.PI * freqs[n] * nt) * Math.exp(-nt * 2.5) * 0.2;
    }
  }
  return s;
});

// ─── WRITE ALL FILES ───

const sounds = {
  'place.wav': place,
  'select.wav': select,
  'move.wav': move,
  'mill.wav': mill,
  'remove.wav': remove,
  'invalid.wav': invalid,
  'win.wav': win,
  'lose.wav': lose,
  'draw.wav': draw,
  'game-start.wav': gameStart,
  'button-tap.wav': buttonTap,
  'timer-tick.wav': timerTick,
  'timer-warning.wav': timerWarning,
  'puzzle-solved.wav': puzzleSolved,
  'achievement.wav': achievement,
};

for (const [filename, samples] of Object.entries(sounds)) {
  const withFades = applyFades(Array.from(samples));
  const wav = createWav(withFades);
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, wav);
  console.log(`Created: ${filepath} (${(wav.length / 1024).toFixed(1)} KB)`);
}

console.log('\nAll sound files generated successfully!');
