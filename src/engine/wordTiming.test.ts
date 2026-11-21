import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alignWordsToPcm,
  computeSmartWordTimings,
  decodeWavPcmSamples,
  getWordTimings,
} from './wordTiming';

function buildWavDataUrl(samples: Float32Array, sampleRate = 16000): string {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(bin)}`;
}

test('computeSmartWordTimings allocates longer duration to multi-syllable words than short words', () => {
  const timings = computeSmartWordTimings('di persimpangan', 3.0);
  assert.equal(timings.length, 2);
  const shortDur = timings[0].endSec - timings[0].startSec;
  const longDur = timings[1].endSec - timings[1].startSec;
  assert.ok(longDur > shortDur * 2, `Expected "${timings[1].word}" (${longDur.toFixed(2)}s) > 2x "${timings[0].word}" (${shortDur.toFixed(2)}s)`);
});

test('alignWordsToPcm respects leading silence, mid-sentence pause, and slow stretched speech', () => {
  const sr = 16000;
  // 4.0s audio:
  // 0.00 - 0.60s: silence
  // 0.60 - 0.90s: fast word 1 ("Satu")
  // 0.90 - 1.70s: long pause (silence)
  // 1.70 - 3.60s: slow stretched word 2 ("pelan-pelan")
  // 3.60 - 4.00s: trailing silence
  const samples = new Float32Array(sr * 4);
  for (let i = Math.floor(0.6 * sr); i < Math.floor(0.9 * sr); i++) {
    samples[i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / sr);
  }
  for (let i = Math.floor(1.7 * sr); i < Math.floor(3.6 * sr); i++) {
    samples[i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / sr);
  }

  const timings = alignWordsToPcm(samples, sr, 'Satu pelan');
  assert.equal(timings.length, 2);

  // Word 0 starts near 0.60s (after leading silence)
  assert.ok(timings[0].startSec >= 0.5, `Expected start >= 0.5s, got ${timings[0].startSec}`);
  // Word 1 ("pelan") stretches across the long vocal segment (much longer than word 0)
  const w0Dur = timings[0].endSec - timings[0].startSec;
  const w1Dur = timings[1].endSec - timings[1].startSec;
  assert.ok(w1Dur > w0Dur * 2, `Expected slow word (${w1Dur.toFixed(2)}s) > 2x fast word (${w0Dur.toFixed(2)}s)`);

  // Also verify WAV data URL round-trip through decodeWavPcmSamples & getWordTimings
  const wavUrl = buildWavDataUrl(samples, sr);
  const decoded = decodeWavPcmSamples(wavUrl);
  assert.ok(decoded !== null);
  assert.equal(decoded.sampleRate, sr);

  const synced = getWordTimings('Satu pelan', 4.0, wavUrl, 4.0);
  assert.equal(synced.length, 2);
  assert.ok(synced[0].startSec >= 0.5);
});
