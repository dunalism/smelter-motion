import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import type { ProjectState } from '../types/studio';
import {
  getCanvasDimensions,
  getTotalDuration,
  PALETTE_PRESETS,
  resolveSceneAtTime,
} from './motionMath';
import { compileSceneCode, extractSfxCalls, renderSceneFrame } from './canvasRenderer';
import { triggerSfxAt } from './sfxSynthesizer';
import { preloadProjectAudioTimings } from './wordTiming';
import {
  ensureEvenDimension,
  hasProjectAudioSources,
  isMp4Buffer,
  pickMediaRecorderMimeType,
  selectH264CodecCandidates,
} from './mp4ExportHelpers';

export interface ExportProgress {
  phase: 'preparing' | 'recording' | 'converting' | 'finalizing';
  percent: number;
  currentSec: number;
  totalSec: number;
}

export interface ExportOptions {
  project: ProjectState;
  fps: number;
  includeAudio: boolean;
  onProgress: (p: ExportProgress) => void;
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  mimeType: 'video/mp4';
  extension: 'mp4';
  durationSec: number;
}

type CompiledSceneEntry = {
  scene: ProjectState['scenes'][number];
  compiled: ReturnType<typeof compileSceneCode>;
  sfxCalls: ReturnType<typeof extractSfxCalls>;
};

async function decodeAudioUrl(
  ctx: BaseAudioContext,
  url: string
): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    return await ctx.decodeAudioData(arr);
  } catch {
    return null;
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Ekspor video dibatalkan.');
  }
}

async function scheduleTimelineAudio(
  ctx: BaseAudioContext,
  destination: AudioNode,
  startAudioAt: number,
  project: ProjectState,
  compiledScenes: CompiledSceneEntry[]
): Promise<void> {
  if (project.masterAudioUrl) {
    const buf = await decodeAudioUrl(ctx, project.masterAudioUrl);
    if (buf) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(destination);
      src.start(startAudioAt);
    }
  }

  let cursorSec = 0;
  for (const item of compiledScenes) {
    if (item.scene.audio.dataUrl) {
      const buf = await decodeAudioUrl(ctx, item.scene.audio.dataUrl);
      if (buf) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(destination);
        src.start(startAudioAt + cursorSec);
      }
    }
    for (const sfx of item.sfxCalls) {
      if (sfx.time >= 0 && sfx.time <= item.scene.durationSec) {
        triggerSfxAt(
          ctx,
          destination,
          sfx.name,
          startAudioAt + cursorSec + sfx.time,
          sfx.volume,
          sfx.pitch
        );
      }
    }
    cursorSec += Math.max(0.5, item.scene.durationSec);
  }
}

async function findSupportedH264Codec(
  width: number,
  height: number,
  fps: number
): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return null;
  }
  const candidates = selectH264CodecCandidates(width, height, fps);
  for (const codec of candidates) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 8_000_000,
        framerate: fps,
        avc: { format: 'avc' },
      });
      if (support.supported) {
        return codec;
      }
    } catch {
      // Try next H.264 profile candidate
    }
  }
  return null;
}

async function isAacEncoderSupported(): Promise<boolean> {
  if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') {
    return false;
  }
  try {
    const support = await AudioEncoder.isConfigSupported({
      codec: 'mp4a.40.2',
      sampleRate: 48000,
      numberOfChannels: 2,
      bitrate: 128_000,
    });
    return Boolean(support.supported);
  } catch {
    return false;
  }
}

async function tryExportWithWebCodecsMp4(params: {
  project: ProjectState;
  compiledScenes: CompiledSceneEntry[];
  width: number;
  height: number;
  fps: number;
  totalSec: number;
  includeAudio: boolean;
  hasAudio: boolean;
  onProgress: (p: ExportProgress) => void;
  signal?: AbortSignal;
}): Promise<ExportResult | null> {
  const {
    project,
    compiledScenes,
    width,
    height,
    fps,
    totalSec,
    includeAudio,
    hasAudio,
    onProgress,
    signal,
  } = params;

  const h264Codec = await findSupportedH264Codec(width, height, fps);
  if (!h264Codec) return null;

  const shouldEncodeAudio = includeAudio && hasAudio;
  if (shouldEncodeAudio) {
    const aacOk = await isAacEncoderSupported();
    if (!aacOk) return null;
    if (typeof OfflineAudioContext === 'undefined') return null;
  }

  throwIfAborted(signal);

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;

  const palette = PALETTE_PRESETS[project.paletteId] || PALETTE_PRESETS['cyber-hologram'];
  const sampleRate = 48000;

  let renderedAudio: AudioBuffer | null = null;
  if (shouldEncodeAudio) {
    const totalSamples = Math.max(1, Math.ceil(totalSec * sampleRate));
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    await scheduleTimelineAudio(offlineCtx, offlineCtx.destination, 0, project, compiledScenes);
    throwIfAborted(signal);
    renderedAudio = await offlineCtx.startRendering();
    throwIfAborted(signal);
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    audio: shouldEncodeAudio
      ? {
          codec: 'aac',
          numberOfChannels: 2,
          sampleRate,
        }
      : undefined,
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  let encoderError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encoderError = err instanceof Error ? err : new Error(String(err));
    },
  });

  let audioEncoder: AudioEncoder | null = null;

  try {
    videoEncoder.configure({
      codec: h264Codec,
      width,
      height,
      bitrate: 8_000_000,
      framerate: fps,
      avc: { format: 'avc' },
    });

    if (shouldEncodeAudio && renderedAudio) {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (err) => {
          encoderError = err instanceof Error ? err : new Error(String(err));
        },
      });
      audioEncoder.configure({
        codec: 'mp4a.40.2',
        sampleRate,
        numberOfChannels: 2,
        bitrate: 128_000,
      });

      const left = renderedAudio.getChannelData(0);
      const right =
        renderedAudio.numberOfChannels > 1 ? renderedAudio.getChannelData(1) : left;
      const chunkFrames = 1024;

      for (let offset = 0; offset < renderedAudio.length; offset += chunkFrames) {
        throwIfAborted(signal);
        if (encoderError) throw encoderError;

        const frames = Math.min(chunkFrames, renderedAudio.length - offset);
        const planar = new Float32Array(frames * 2);
        planar.set(left.subarray(offset, offset + frames), 0);
        planar.set(right.subarray(offset, offset + frames), frames);

        const audioData = new AudioData({
          format: 'f32-planar',
          sampleRate,
          numberOfFrames: frames,
          numberOfChannels: 2,
          timestamp: Math.round((offset * 1_000_000) / sampleRate),
          data: planar,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }
    }

    const totalFrames = Math.max(1, Math.ceil(totalSec * fps));
    const frameDurationUs = Math.round(1_000_000 / fps);

    for (let i = 0; i < totalFrames; i++) {
      throwIfAborted(signal);
      if (encoderError) throw encoderError;

      while (videoEncoder.encodeQueueSize > 8) {
        await new Promise((r) => setTimeout(r, 4));
        throwIfAborted(signal);
        if (encoderError) throw encoderError;
      }

      const currentSec = Math.min(totalSec, i / fps);
      const resolved = resolveSceneAtTime(project.scenes, currentSec);
      const compiledEntry =
        resolved.sceneIndex >= 0 ? compiledScenes[resolved.sceneIndex] : null;

      renderSceneFrame({
        ctx,
        width,
        height,
        localTime: resolved.localTime,
        sceneDuration: resolved.scene?.durationSec,
        compiledFn: compiledEntry?.compiled.fn ?? null,
        palette,
        narration: resolved.scene?.narration,
        emphasis: resolved.scene?.emphasis,
        subtitles: project.subtitles,
        watermark: project.watermark,
        audioDataUrl: resolved.scene?.audio.dataUrl,
        audioDurationSec: resolved.scene?.audio.durationSec,
      });

      const frame = new VideoFrame(offscreen, {
        timestamp: Math.round((i * 1_000_000) / fps),
        duration: frameDurationUs,
      });
      videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      const percent = 5 + Math.min(89, Math.round(((i + 1) / totalFrames) * 89));
      onProgress({
        phase: 'recording',
        percent,
        currentSec,
        totalSec,
      });

      if (i % 4 === 3) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    throwIfAborted(signal);
    onProgress({ phase: 'finalizing', percent: 96, currentSec: totalSec, totalSec });

    await videoEncoder.flush();
    if (audioEncoder) {
      await audioEncoder.flush();
    }
    if (encoderError) throw encoderError;

    muxer.finalize();
    const mp4Bytes = new Uint8Array(target.buffer);
    if (!isMp4Buffer(mp4Bytes)) {
      throw new Error('Berkas MP4 hasil muxer tidak valid.');
    }

    onProgress({ phase: 'finalizing', percent: 100, currentSec: totalSec, totalSec });
    return {
      blob: new Blob([mp4Bytes], { type: 'video/mp4' }),
      mimeType: 'video/mp4',
      extension: 'mp4',
      durationSec: totalSec,
    };
  } finally {
    try {
      if (videoEncoder.state !== 'closed') videoEncoder.close();
    } catch {
      // Ignore cleanup error
    }
    try {
      if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
    } catch {
      // Ignore cleanup error
    }
  }
}

async function convertRecordedVideoToMp4(params: {
  recordedBlob: Blob;
  recordedMimeType: string;
  fps: number;
  includeAudio: boolean;
  signal?: AbortSignal;
}): Promise<Blob> {
  const { recordedBlob, recordedMimeType, fps, includeAudio, signal } = params;
  const inputExt = recordedMimeType.includes('mp4') ? 'mp4' : 'webm';

  const res = await fetch('/api/convert-mp4', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-Input-Ext': inputExt,
      'X-Video-Fps': String(fps),
      'X-Include-Audio': String(includeAudio),
    },
    body: recordedBlob,
    signal,
  });

  if (!res.ok) {
    let errMsg = `Konversi ke MP4 gagal (HTTP ${res.status}).`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) errMsg = json.error;
    } catch {
      // Use default error message
    }
    throw new Error(errMsg);
  }

  const mp4ArrayBuffer = await res.arrayBuffer();
  const mp4Bytes = new Uint8Array(mp4ArrayBuffer);
  if (!isMp4Buffer(mp4Bytes)) {
    throw new Error('Server tidak mengembalikan berkas MP4 yang valid.');
  }
  return new Blob([mp4Bytes], { type: 'video/mp4' });
}

async function exportWithMediaRecorderAndFfmpeg(params: {
  project: ProjectState;
  compiledScenes: CompiledSceneEntry[];
  width: number;
  height: number;
  fps: number;
  totalSec: number;
  includeAudio: boolean;
  hasAudio: boolean;
  onProgress: (p: ExportProgress) => void;
  signal?: AbortSignal;
}): Promise<ExportResult> {
  const {
    project,
    compiledScenes,
    width,
    height,
    fps,
    totalSec,
    includeAudio,
    hasAudio,
    onProgress,
    signal,
  } = params;

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) {
    throw new Error('Tidak dapat menginisialisasi Canvas 2D untuk ekspor video.');
  }

  const palette = PALETTE_PRESETS[project.paletteId] || PALETTE_PRESETS['cyber-hologram'];

  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  const stream = offscreen.captureStream(fps);
  const useAudio = includeAudio && hasAudio;

  if (useAudio) {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => {});
    }
    audioDest = audioCtx.createMediaStreamDestination();
    const startAudioAt = audioCtx.currentTime + 0.08;
    await scheduleTimelineAudio(audioCtx, audioDest, startAudioAt, project, compiledScenes);
    for (const track of audioDest.stream.getAudioTracks()) {
      stream.addTrack(track);
    }
  }

  const recorderMimeType = pickMediaRecorderMimeType();
  const recorder = new MediaRecorder(stream, {
    mimeType: recorderMimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      chunks.push(ev.data);
    }
  };

  const recordedBlob = await new Promise<Blob>((resolve, reject) => {
    let rafId = 0;
    let aborted = false;

    const cleanup = () => {
      if (rafId) cancelAnimationFrame(rafId);
      stream.getTracks().forEach((t) => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };

    const handleAbort = () => {
      aborted = true;
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
      cleanup();
      reject(new Error('Ekspor video dibatalkan.'));
    };

    if (signal) {
      if (signal.aborted) {
        handleAbort();
        return;
      }
      signal.addEventListener('abort', handleAbort, { once: true });
    }

    recorder.onerror = () => {
      cleanup();
      reject(new Error('Terjadi kesalahan saat merekam video.'));
    };

    recorder.onstop = () => {
      if (signal) signal.removeEventListener('abort', handleAbort);
      cleanup();
      if (aborted) return;
      resolve(new Blob(chunks, { type: recorderMimeType }));
    };

    const startPerf = performance.now();
    recorder.start(150);

    const stepFrame = () => {
      if (aborted) return;
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const clampedTime = Math.min(elapsedSec, totalSec);

      const resolved = resolveSceneAtTime(project.scenes, clampedTime);
      const compiledEntry =
        resolved.sceneIndex >= 0 ? compiledScenes[resolved.sceneIndex] : null;

      renderSceneFrame({
        ctx,
        width,
        height,
        localTime: resolved.localTime,
        sceneDuration: resolved.scene?.durationSec,
        compiledFn: compiledEntry?.compiled.fn ?? null,
        palette,
        narration: resolved.scene?.narration,
        emphasis: resolved.scene?.emphasis,
        subtitles: project.subtitles,
        watermark: project.watermark,
        audioDataUrl: resolved.scene?.audio.dataUrl,
        audioDurationSec: resolved.scene?.audio.durationSec,
      });

      const percent = 4 + Math.min(78, Math.round((clampedTime / totalSec) * 78));
      onProgress({
        phase: 'recording',
        percent,
        currentSec: clampedTime,
        totalSec,
      });

      if (elapsedSec >= totalSec) {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
        return;
      }
      rafId = requestAnimationFrame(stepFrame);
    };

    rafId = requestAnimationFrame(stepFrame);
  });

  throwIfAborted(signal);
  onProgress({
    phase: 'converting',
    percent: 88,
    currentSec: totalSec,
    totalSec,
  });

  let finalMp4Blob: Blob;
  try {
    finalMp4Blob = await convertRecordedVideoToMp4({
      recordedBlob,
      recordedMimeType: recorderMimeType,
      fps,
      includeAudio: useAudio,
      signal,
    });
  } catch (err) {
    if (signal?.aborted) {
      throw new Error('Ekspor video dibatalkan.');
    }
    if (recorderMimeType.includes('mp4')) {
      const head = new Uint8Array(await recordedBlob.slice(0, 16).arrayBuffer());
      if (isMp4Buffer(head)) {
        finalMp4Blob = new Blob([recordedBlob], { type: 'video/mp4' });
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  onProgress({ phase: 'finalizing', percent: 100, currentSec: totalSec, totalSec });
  return {
    blob: finalMp4Blob,
    mimeType: 'video/mp4',
    extension: 'mp4',
    durationSec: totalSec,
  };
}

export async function exportProjectVideo({
  project,
  fps,
  includeAudio,
  onProgress,
  signal,
}: ExportOptions): Promise<ExportResult> {
  const rawDims = getCanvasDimensions(project.aspectRatio);
  const width = ensureEvenDimension(rawDims.width);
  const height = ensureEvenDimension(rawDims.height);
  const totalSec = Math.max(0.5, getTotalDuration(project.scenes));

  onProgress({ phase: 'preparing', percent: 2, currentSec: 0, totalSec });
  await preloadProjectAudioTimings(project.scenes).catch(() => {});

  const compiledScenes: CompiledSceneEntry[] = project.scenes.map((sc) => ({
    scene: sc,
    compiled: compileSceneCode(sc.code),
    sfxCalls: extractSfxCalls(sc.code, width, height),
  }));

  const hasAudio = hasProjectAudioSources(
    project,
    compiledScenes.map((c) => c.sfxCalls.length)
  );

  // Tier 1: Deterministic frame-by-frame WebCodecs (H.264 + AAC) -> MP4 via mp4-muxer
  try {
    const webCodecsResult = await tryExportWithWebCodecsMp4({
      project,
      compiledScenes,
      width,
      height,
      fps,
      totalSec,
      includeAudio,
      hasAudio,
      onProgress,
      signal,
    });
    if (webCodecsResult) {
      return webCodecsResult;
    }
  } catch (err) {
    if (signal?.aborted) {
      throw new Error('Ekspor video dibatalkan.');
    }
    console.warn('WebCodecs MP4 export fallback to MediaRecorder+FFmpeg:', err);
  }

  // Tier 2: Guaranteed MP4 via MediaRecorder + FFmpeg (/api/convert-mp4)
  return await exportWithMediaRecorderAndFfmpeg({
    project,
    compiledScenes,
    width,
    height,
    fps,
    totalSec,
    includeAudio,
    hasAudio,
    onProgress,
    signal,
  });
}
