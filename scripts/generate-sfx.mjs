import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sampleRate = 44100;
const outputDirectory = resolve(import.meta.dirname, "../assets/audio/sfx");

function envelope(time, attack, release, duration) {
  if (time < attack) return time / attack;
  return Math.max(0, Math.min(1, (duration - time) / release));
}

function sine(frequency, time, phase = 0) {
  return Math.sin(Math.PI * 2 * frequency * time + phase);
}

function render(duration, sampler) {
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = sampler(index / sampleRate, index);
    samples[index] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  const normalizer = peak > 0 ? 0.9 / peak : 1;
  for (let index = 0; index < samples.length; index += 1) samples[index] *= normalizer;
  return samples;
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function encodeWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true));
  return Buffer.from(buffer);
}

const sounds = {
  "dialogue-thump.wav": render(0.24, (time) => {
    const body = sine(112 - time * 210, time) * Math.exp(-time * 18);
    const tap = sine(720, time) * Math.exp(-time * 42) * 0.22;
    return body + tap;
  }),
  "investigation-found.wav": render(0.36, (time) => {
    const first = sine(392, time) * envelope(time, 0.008, 0.3, 0.36) * 0.7;
    const secondTime = time - 0.085;
    const second = secondTime > 0 ? sine(587.33, secondTime) * envelope(secondTime, 0.008, 0.24, 0.275) * 0.55 : 0;
    return first + second;
  }),
  "evidence-acquired.wav": render(0.62, (time) => {
    const notes = [523.25, 659.25, 783.99];
    return notes.reduce((sum, frequency, index) => {
      const noteTime = time - index * 0.105;
      if (noteTime < 0) return sum;
      return sum + sine(frequency, noteTime) * envelope(noteTime, 0.008, 0.3, 0.41) * 0.58;
    }, 0);
  }),
  "phone-ring.wav": render(1.22, (time) => {
    const pulses = [0, 0.56];
    return pulses.reduce((sum, start) => {
      const pulseTime = time - start;
      if (pulseTime < 0 || pulseTime > 0.4) return sum;
      const env = envelope(pulseTime, 0.02, 0.1, 0.4);
      return sum + (sine(440, pulseTime) + sine(480, pulseTime)) * env * 0.42;
    }, 0);
  }),
};

await mkdir(outputDirectory, { recursive: true });
await Promise.all(Object.entries(sounds).map(([name, samples]) => writeFile(resolve(outputDirectory, name), encodeWav(samples))));
