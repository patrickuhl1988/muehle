/**
 * Convert Float32Array samples (mono, -1..1) to WAV file bytes.
 * 16-bit PCM, 44100 Hz. Returns Uint8Array for the full WAV file.
 */

const SAMPLE_RATE = 44100;

function floatTo16Bit(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? s * 0x8000 : s * 0x7fff;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += chars[a >> 2] + chars[((a & 3) << 4) | (b >> 4)] + chars[((b & 15) << 2) | (c >> 6)] + chars[c & 63];
  }
  const pad = bytes.length % 3;
  return result + (pad === 2 ? '=' : pad === 1 ? '==' : '');
}

export function float32ToWavBytes(samples: Float32Array, sampleRate: number = SAMPLE_RATE): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  function writeU32(v: number) {
    view.setUint32(offset, v, true);
    offset += 4;
  }
  function writeU16(v: number) {
    view.setUint16(offset, v, true);
    offset += 2;
  }

  // RIFF header
  view.setUint8(offset++, 0x52);
  view.setUint8(offset++, 0x49);
  view.setUint8(offset++, 0x46);
  view.setUint8(offset++, 0x46);
  writeU32(totalSize - 8);
  view.setUint8(offset++, 0x57);
  view.setUint8(offset++, 0x41);
  view.setUint8(offset++, 0x56);
  view.setUint8(offset++, 0x45);
  // fmt
  view.setUint8(offset++, 0x66);
  view.setUint8(offset++, 0x6d);
  view.setUint8(offset++, 0x74);
  view.setUint8(offset++, 0x20);
  writeU32(16);
  writeU16(1);
  writeU16(numChannels);
  writeU32(sampleRate);
  writeU32(byteRate);
  writeU16(blockAlign);
  writeU16(bitsPerSample);
  // data
  view.setUint8(offset++, 0x64);
  view.setUint8(offset++, 0x61);
  view.setUint8(offset++, 0x74);
  view.setUint8(offset++, 0x61);
  writeU32(dataSize);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, floatTo16Bit(samples[i]), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

export function wavBytesToBase64(wavBytes: Uint8Array): string {
  return uint8ArrayToBase64(wavBytes);
}
