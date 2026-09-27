// Writes Blockworld's outdoor sounds, made here (owner, prompt 86, Q3 a):
// birds for the day and crickets for the night, as WAV files that loop
// without a seam. Run from the repository root:
//
//   node examples/blockworld/tools/make-ambience.mjs
import { writeFileSync } from 'node:fs';

const RATE = 22050;

/** A seeded random number generator, so the files come out the same every time. */
function random(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 16-bit mono WAV from samples between -1 and 1. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii');
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8, 'ascii');
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); // PCM
  head.writeUInt16LE(1, 22); // mono
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 2, 28);
  head.writeUInt16LE(2, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36, 'ascii');
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** Adds a sound at a time, wrapping round the end so the loop has no seam. */
function mix(into, at, sound) {
  for (let i = 0; i < sound.length; i++) into[(at + i) % into.length] += sound[i];
}

/** A bird's chirp: a quick rising or falling whistle with a little warble. */
function chirp(rand) {
  const ms = 60 + rand() * 110;
  const n = Math.round((ms / 1000) * RATE);
  const f0 = 2600 + rand() * 2200;
  const f1 = f0 + (rand() - 0.4) * 2400;
  const warble = 18 + rand() * 30;
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = f0 + (f1 - f0) * t + Math.sin(i / RATE * warble * 2 * Math.PI) * 180;
    phase += (2 * Math.PI * f) / RATE;
    const envelope = Math.sin(Math.PI * t) ** 2;
    out[i] = envelope * (Math.sin(phase) + 0.18 * Math.sin(2 * phase)) * 0.22;
  }
  return out;
}

function birds() {
  const rand = random(7);
  const out = new Float32Array(RATE * 8);
  // Songs of a few chirps, from two or three birds near and far.
  for (let song = 0; song < 9; song++) {
    let at = Math.floor(rand() * out.length);
    const loud = 0.35 + rand() * 0.65;
    const notes = 2 + Math.floor(rand() * 5);
    for (let k = 0; k < notes; k++) {
      const c = chirp(rand).map((v) => v * loud);
      mix(out, at, c);
      at += c.length + Math.floor((0.04 + rand() * 0.09) * RATE);
    }
  }
  // A faint breeze under them.
  let b = 0;
  for (let i = 0; i < out.length; i++) {
    b = b * 0.995 + (rand() - 0.5) * 0.01;
    out[i] += b * 0.6;
  }
  return out;
}

function crickets() {
  const rand = random(11);
  const out = new Float32Array(RATE * 6);
  // Each cricket repeats a short trill of pulses on its own note and beat.
  for (let c = 0; c < 4; c++) {
    const f = 4200 + rand() * 900;
    const pulses = 3 + Math.floor(rand() * 3);
    const every = Math.round((0.45 + rand() * 0.35) * RATE);
    const loud = 0.05 + rand() * 0.06;
    const offset = Math.floor(rand() * every);
    for (let at = offset; at < out.length; at += every) {
      for (let p = 0; p < pulses; p++) {
        const n = Math.round(0.018 * RATE);
        const start = at + p * Math.round(0.03 * RATE);
        for (let i = 0; i < n; i++) {
          const env = Math.sin((Math.PI * i) / n);
          out[(start + i) % out.length] += env * Math.sin((2 * Math.PI * f * i) / RATE) * loud;
        }
      }
    }
  }
  return out;
}

for (const [name, samples] of [
  ['birds.wav', birds()],
  ['crickets.wav', crickets()],
]) {
  writeFileSync(new URL(`../sounds/${name}`, import.meta.url), wav(samples));
  console.log(`wrote sounds/${name}`);
}
