import { clamp } from './motionMath';

export interface WordTiming {
  word: string;
  index: number;
  startSec: number;
  endSec: number;
}

const timingCache = new Map<string, WordTiming[]>();
const pendingDecodeSet = new Set<string>();

function makeCacheKey(audioDataUrl: string, text: string): string {
  const head = audioDataUrl.slice(0, 64);
  const tail = audioDataUrl.slice(-48);
  return `${audioDataUrl.length}:${head}:${tail}|${text.trim()}`;
}

function estimateWordWeights(word: string): {
  spokenWeight: number;
  pauseWeight: number;
} {
  const clean = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
  const vowelGroups = clean.match(/[aeiouyàáâäèéêëìíîïòóôöùúûü]+/gi);
  const syllables = Math.max(1, vowelGroups ? vowelGroups.length : 1);
  const charCount = Math.max(1, clean.length);
  const spokenWeight = syllables * 1.0 + charCount * 0.14;

  let pauseWeight = 0;
  if (/[.!?…]+["'”’)]*$/.test(word)) {
    pauseWeight = 2.4;
  } else if (/[,;:]+["'”’)]*$/.test(word)) {
    pauseWeight = 1.25;
  } else if (/[—–-]+$/.test(word)) {
    pauseWeight = 0.85;
  }

  return { spokenWeight, pauseWeight };
}

/**
 * Fallback linguistic timing when no audio waveform is available.
 * Allocates duration proportionally by syllable count, character length, and punctuation pauses.
 */
export function computeSmartWordTimings(
  text: string,
  totalDurationSec: number
): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const dur = Math.max(0.4, totalDurationSec);
  const leadIn = Math.min(0.1, dur * 0.03);
  const tailOut = Math.min(0.25, dur * 0.08);
  const usable = Math.max(0.25, dur - leadIn - tailOut);

  const weights = words.map((w, i) => {
    const { spokenWeight, pauseWeight } = estimateWordWeights(w);
    return {
      spokenWeight,
      pauseWeight: i < words.length - 1 ? pauseWeight : 0,
    };
  });

  const totalWeight = Math.max(
    0.01,
    weights.reduce((acc, w) => acc + w.spokenWeight + w.pauseWeight, 0)
  );

  const result: WordTiming[] = [];
  let cursor = leadIn;

  for (let i = 0; i < words.length; i++) {
    const w = weights[i];
    const spokenDur = (w.spokenWeight / totalWeight) * usable;
    const pauseDur = (w.pauseWeight / totalWeight) * usable;
    const startSec = cursor;
    const endSec = Math.min(dur, cursor + Math.max(0.06, spokenDur));
    result.push({
      word: words[i],
      index: i,
      startSec,
      endSec,
    });
    cursor = endSec + pauseDur;
  }

  return result;
}

/**
 * Synchronous RIFF/WAVE PCM decoder for `data:audio/wav;base64,...` data URLs.
 * Works in both browser and Node/Bun without AudioContext.
 */
export function decodeWavPcmSamples(dataUrl: string): {
  samples: Float32Array;
  sampleRate: number;
  durationSec: number;
} | null {
  if (!dataUrl || !dataUrl.startsWith('data:audio/')) return null;
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return null;
  const header = dataUrl.slice(0, commaIdx).toLowerCase();
  if (!header.includes('wav') || !header.includes('base64')) return null;

  try {
    const b64 = dataUrl.slice(commaIdx + 1);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    if (bytes.length < 44) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (
      view.getUint32(0, false) !== 0x52494646 ||
      view.getUint32(8, false) !== 0x57415645
    ) {
      return null;
    }

    let offset = 12;
    let audioFormat = 1;
    let numChannels = 1;
    let sampleRate = 24000;
    let bitsPerSample = 16;
    let dataOffset = -1;
    let dataSize = 0;

    while (offset + 8 <= bytes.length) {
      const chunkId = view.getUint32(offset, false);
      const chunkSize = view.getUint32(offset + 4, true);
      if (chunkId === 0x666d7420) {
        audioFormat = view.getUint16(offset + 8, true);
        numChannels = Math.max(1, view.getUint16(offset + 10, true));
        sampleRate = Math.max(8000, view.getUint32(offset + 12, true));
        bitsPerSample = view.getUint16(offset + 22, true);
      } else if (chunkId === 0x64617461) {
        dataOffset = offset + 8;
        dataSize = Math.min(chunkSize, bytes.length - dataOffset);
        break;
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }

    if (dataOffset < 0 || dataSize <= 0) return null;

    const bytesPerSample = Math.max(1, bitsPerSample >> 3);
    const frameSize = bytesPerSample * numChannels;
    const totalFrames = Math.floor(dataSize / frameSize);
    if (totalFrames <= 0) return null;

    const samples = new Float32Array(totalFrames);
    for (let i = 0; i < totalFrames; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const pos = dataOffset + i * frameSize + ch * bytesPerSample;
        let val = 0;
        if (audioFormat === 3 && bitsPerSample === 32) {
          val = view.getFloat32(pos, true);
        } else if (bitsPerSample === 16) {
          val = view.getInt16(pos, true) / 32768;
        } else if (bitsPerSample === 8) {
          val = (bytes[pos] - 128) / 128;
        } else if (bitsPerSample === 24) {
          const b0 = bytes[pos];
          const b1 = bytes[pos + 1];
          const b2 = bytes[pos + 2];
          let raw = b0 | (b1 << 8) | (b2 << 16);
          if (raw & 0x800000) raw |= ~0xffffff;
          val = raw / 8388608;
        } else if (bitsPerSample === 32) {
          val = view.getInt32(pos, true) / 2147483648;
        }
        sum += val;
      }
      samples[i] = sum / numChannels;
    }

    return {
      samples,
      sampleRate,
      durationSec: totalFrames / sampleRate,
    };
  } catch {
    return null;
  }
}

/**
 * Aligns words to actual spoken audio energy envelope.
 * - Leading/trailing silence is skipped so words start/end when the voice actually speaks.
 * - Internal pauses (silence gaps) hold word progression until the voice resumes.
 * - Words spoken slowly (longer active vocal energy) get proportionally longer duration.
 */
export function alignWordsToPcm(
  samples: Float32Array,
  sampleRate: number,
  text: string
): WordTiming[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const durationSec = samples.length / Math.max(1, sampleRate);
  if (durationSec <= 0.05 || samples.length < 64) {
    return computeSmartWordTimings(text, Math.max(0.5, durationSec));
  }

  const frameSec = 0.02; // 20ms windows (50Hz)
  const hop = Math.max(1, Math.floor(sampleRate * frameSec));
  const numFrames = Math.max(1, Math.floor(samples.length / hop));

  const rms = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const start = f * hop;
    const end = Math.min(samples.length, start + hop);
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      const s = samples[i];
      sumSq += s * s;
    }
    rms[f] = Math.sqrt(sumSq / Math.max(1, end - start));
  }

  const smoothRms = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const prev = f > 0 ? rms[f - 1] : rms[f];
    const next = f + 1 < numFrames ? rms[f + 1] : rms[f];
    smoothRms[f] = (prev + rms[f] * 2 + next) * 0.25;
  }

  const sorted = Array.from(smoothRms).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const peakEnergy = sorted[Math.floor(sorted.length * 0.92)] ?? 0.05;
  if (peakEnergy <= 0.002) {
    return computeSmartWordTimings(text, durationSec);
  }

  const threshold = Math.max(0.006, noiseFloor + (peakEnergy - noiseFloor) * 0.085);

  const active = new Uint8Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    active[f] = smoothRms[f] >= threshold ? 1 : 0;
  }

  const maxGapFrames = 6; // 120ms
  let fIdx = 0;
  while (fIdx < numFrames) {
    if (active[fIdx] === 0) {
      let gapEnd = fIdx;
      while (gapEnd < numFrames && active[gapEnd] === 0) gapEnd++;
      if (fIdx > 0 && gapEnd < numFrames && gapEnd - fIdx <= maxGapFrames) {
        for (let k = fIdx; k < gapEnd; k++) active[k] = 1;
      }
      fIdx = gapEnd;
    } else {
      fIdx++;
    }
  }

  fIdx = 0;
  while (fIdx < numFrames) {
    if (active[fIdx] === 1) {
      let segEnd = fIdx;
      while (segEnd < numFrames && active[segEnd] === 1) segEnd++;
      if (segEnd - fIdx < 2) {
        for (let k = fIdx; k < segEnd; k++) active[k] = 0;
      }
      fIdx = segEnd;
    } else {
      fIdx++;
    }
  }

  const cumActivity = new Float64Array(numFrames + 1);
  for (let f = 0; f < numFrames; f++) {
    const val = active[f] ? Math.pow(Math.max(smoothRms[f], threshold * 0.6), 0.55) : 0;
    cumActivity[f + 1] = cumActivity[f] + val;
  }

  const totalActivity = cumActivity[numFrames];
  if (totalActivity <= 1e-6) {
    return computeSmartWordTimings(text, durationSec);
  }

  // Extract contiguous speech segments [startFrame, endFrame)
  const segments: Array<{ startFrame: number; endFrame: number; activity: number }> = [];
  let sIdx = 0;
  while (sIdx < numFrames) {
    if (active[sIdx] === 1) {
      let sEnd = sIdx;
      while (sEnd < numFrames && active[sEnd] === 1) sEnd++;
      const segAct = cumActivity[sEnd] - cumActivity[sIdx];
      if (segAct > 0) {
        segments.push({ startFrame: sIdx, endFrame: sEnd, activity: segAct });
      }
      sIdx = sEnd;
    } else {
      sIdx++;
    }
  }

  if (segments.length === 0) {
    return computeSmartWordTimings(text, durationSec);
  }

  const weights = words.map((w, i) => {
    const { spokenWeight, pauseWeight } = estimateWordWeights(w);
    return {
      spokenWeight,
      pauseWeight: i < words.length - 1 ? pauseWeight * 0.25 : 0,
    };
  });

  const activityToSecInRange = (
    targetAct: number,
    minFrame: number,
    maxFrame: number,
    biasEnd: boolean
  ): number => {
    const minAct = cumActivity[minFrame];
    const maxAct = cumActivity[maxFrame];
    const clamped = clamp(targetAct, minAct, maxAct);
    let lo = minFrame;
    let hi = maxFrame;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumActivity[mid] < clamped) lo = mid + 1;
      else hi = mid;
    }
    if (biasEnd) {
      const idx = clamp(lo - 1, minFrame, Math.max(minFrame, maxFrame - 1));
      const a0 = cumActivity[idx];
      const a1 = cumActivity[idx + 1] ?? a0;
      const frac = a1 > a0 ? (clamped - a0) / (a1 - a0) : 0;
      return clamp((idx + frac) * frameSec, 0, durationSec);
    }
    let startIdx = clamp(lo, minFrame, Math.max(minFrame, maxFrame - 1));
    while (startIdx < maxFrame - 1 && cumActivity[startIdx + 1] <= clamped + 1e-9) {
      startIdx++;
    }
    const a0 = cumActivity[startIdx];
    const a1 = cumActivity[startIdx + 1] ?? a0;
    const frac = a1 > a0 ? (clamped - a0) / (a1 - a0) : 0;
    return clamp((startIdx + frac) * frameSec, 0, durationSec);
  };

  // Partition words across speech segments when there are multiple segments & enough words
  const result: WordTiming[] = [];
  if (segments.length > 1 && words.length >= segments.length) {
    const segWordCounts = new Array<number>(segments.length).fill(1);
    let remaining = words.length - segments.length;

    if (remaining > 0) {
      const rawExtra = segments.map((seg) => (seg.activity / totalActivity) * remaining);
      const floors = rawExtra.map((v) => Math.floor(v));
      let used = 0;
      for (let i = 0; i < segments.length; i++) {
        segWordCounts[i] += floors[i];
        used += floors[i];
      }
      let leftover = remaining - used;
      const order = rawExtra
        .map((v, i) => ({ rem: v - floors[i], i }))
        .sort((a, b) => b.rem - a.rem);
      for (let k = 0; k < leftover; k++) {
        segWordCounts[order[k % order.length].i]++;
      }
    }

    let wordCursor = 0;
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si];
      const count = segWordCounts[si];
      const segWords = weights.slice(wordCursor, wordCursor + count);
      const segWeightSum = Math.max(
        0.01,
        segWords.reduce((acc, w, idx) => acc + w.spokenWeight + (idx < count - 1 ? w.pauseWeight : 0), 0)
      );

      let actCursor = cumActivity[seg.startFrame];
      for (let j = 0; j < count; j++) {
        const gi = wordCursor + j;
        const w = segWords[j];
        const startAct = actCursor;
        const spokenEndAct = startAct + (w.spokenWeight / segWeightSum) * seg.activity;
        const nextAct = spokenEndAct + ((j < count - 1 ? w.pauseWeight : 0) / segWeightSum) * seg.activity;

        const startSec = activityToSecInRange(startAct, seg.startFrame, seg.endFrame, false);
        const rawEndSec = activityToSecInRange(spokenEndAct, seg.startFrame, seg.endFrame, true);
        const endSec = Math.max(startSec + 0.05, Math.min(durationSec, rawEndSec));

        result.push({ word: words[gi], index: gi, startSec, endSec });
        actCursor = nextAct;
      }
      wordCursor += count;
    }
    return result;
  }

  // Single continuous speech segment (or fewer words than segments): map across totalActivity
  const totalWeight = Math.max(
    0.01,
    weights.reduce((acc, w) => acc + w.spokenWeight + w.pauseWeight, 0)
  );
  let actCursor = 0;
  for (let i = 0; i < words.length; i++) {
    const w = weights[i];
    const startAct = actCursor;
    const spokenEndAct = startAct + (w.spokenWeight / totalWeight) * totalActivity;
    const nextStartAct = spokenEndAct + (w.pauseWeight / totalWeight) * totalActivity;

    const startSec = activityToSecInRange(startAct, 0, numFrames, false);
    const rawEndSec = activityToSecInRange(spokenEndAct, 0, numFrames, true);
    const endSec = Math.max(startSec + 0.05, Math.min(durationSec, rawEndSec));

    result.push({ word: words[i], index: i, startSec, endSec });
    actCursor = nextStartAct;
  }

  return result;
}

/**
 * Synchronous lookup for word timings:
 * 1. Returns cached audio-aligned timings if available.
 * 2. If audioDataUrl is WAV base64, decodes PCM & aligns synchronously on first call.
 * 3. Otherwise falls back to linguistic syllable/punctuation timing.
 */
export function getWordTimings(
  text: string,
  sceneDuration: number,
  audioDataUrl?: string,
  audioDurationSec?: number
): WordTiming[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (audioDataUrl) {
    const key = makeCacheKey(audioDataUrl, trimmed);
    const cached = timingCache.get(key);
    if (cached) return cached;

    const wav = decodeWavPcmSamples(audioDataUrl);
    if (wav) {
      const aligned = alignWordsToPcm(wav.samples, wav.sampleRate, trimmed);
      timingCache.set(key, aligned);
      return aligned;
    }
  }

  const effectiveDur =
    audioDurationSec && audioDurationSec > 0.2 ? audioDurationSec : sceneDuration;
  return computeSmartWordTimings(trimmed, effectiveDur);
}

/**
 * Async audio decoder for non-WAV formats (MP3, WebM, OGG, remote URLs).
 * Populates the timing cache so subsequent synchronous canvas renders are audio-aligned.
 */
export async function ensureAudioWordTimings(
  text: string,
  audioDataUrl?: string,
  fallbackDuration = 4.0
): Promise<WordTiming[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (!audioDataUrl) return computeSmartWordTimings(trimmed, fallbackDuration);

  const key = makeCacheKey(audioDataUrl, trimmed);
  const existing = timingCache.get(key);
  if (existing) return existing;

  const wav = decodeWavPcmSamples(audioDataUrl);
  if (wav) {
    const aligned = alignWordsToPcm(wav.samples, wav.sampleRate, trimmed);
    timingCache.set(key, aligned);
    return aligned;
  }

  if (pendingDecodeSet.has(key)) {
    return computeSmartWordTimings(trimmed, fallbackDuration);
  }

  if (typeof window === 'undefined' && typeof OfflineAudioContext === 'undefined') {
    return computeSmartWordTimings(trimmed, fallbackDuration);
  }

  pendingDecodeSet.add(key);
  try {
    const resp = await fetch(audioDataUrl);
    const arrBuf = await resp.arrayBuffer();
    const AudioCtx =
      typeof OfflineAudioContext !== 'undefined'
        ? OfflineAudioContext
        : (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);

    let decoded: AudioBuffer;
    if (AudioCtx === OfflineAudioContext) {
      const offline = new OfflineAudioContext(1, 44100, 44100);
      decoded = await offline.decodeAudioData(arrBuf);
    } else {
      const ctx = new (AudioCtx as typeof AudioContext)();
      decoded = await ctx.decodeAudioData(arrBuf);
      ctx.close().catch(() => {});
    }

    const ch0 = decoded.getChannelData(0);
    const aligned = alignWordsToPcm(ch0, decoded.sampleRate, trimmed);
    timingCache.set(key, aligned);
    return aligned;
  } catch {
    return computeSmartWordTimings(trimmed, fallbackDuration);
  } finally {
    pendingDecodeSet.delete(key);
  }
}

export async function preloadProjectAudioTimings(
  scenes: Array<{ narration: string; durationSec: number; audio?: { dataUrl?: string; durationSec?: number } }>
): Promise<void> {
  const tasks = scenes
    .filter((sc) => sc.audio?.dataUrl && sc.narration.trim().length > 0)
    .map((sc) =>
      ensureAudioWordTimings(
        sc.narration,
        sc.audio?.dataUrl,
        sc.audio?.durationSec || sc.durationSec
      )
    );
  await Promise.all(tasks);
}
