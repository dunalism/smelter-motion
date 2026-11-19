import type { ProjectState } from '../types/studio';

export function sanitizeExportSlug(title: string): string {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'gerak-canvas-video';
}

export function buildExportFileName(title: string): string {
  return `${sanitizeExportSlug(title)}.mp4`;
}

export function ensureEvenDimension(size: number): number {
  const floored = Math.max(2, Math.floor(size));
  return floored % 2 === 0 ? floored : floored - 1;
}

export function selectH264CodecCandidates(
  width: number,
  height: number,
  fps: number
): string[] {
  const pixels = width * height;
  if (pixels * fps > 1280 * 720 * 35) {
    return ['avc1.4d002a', 'avc1.64002a', 'avc1.42002a', 'avc1.4d0028', 'avc1.42001f'];
  }
  return ['avc1.4d0028', 'avc1.640028', 'avc1.420028', 'avc1.4d001f', 'avc1.42001f'];
}

export function pickMediaRecorderMimeType(
  isSupported: (mimeType: string) => boolean = (m) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
): string {
  const candidates = [
    'video/mp4;codecs=avc1,mp4a',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const mime of candidates) {
    if (isSupported(mime)) {
      return mime;
    }
  }
  return 'video/webm';
}

export function hasProjectAudioSources(
  project: Pick<ProjectState, 'masterAudioUrl' | 'scenes'>,
  sceneSfxCounts: number[]
): boolean {
  if (project.masterAudioUrl && project.masterAudioUrl.trim().length > 0) {
    return true;
  }
  if (project.scenes.some((sc) => Boolean(sc.audio?.dataUrl && sc.audio.dataUrl.trim().length > 0))) {
    return true;
  }
  return sceneSfxCounts.some((count) => count > 0);
}

export function buildFfmpegMp4Args(opts: {
  inputPath: string;
  outputPath: string;
  fps: number;
  includeAudio: boolean;
}): string[] {
  const safeFps = Math.max(15, Math.min(60, Math.round(Number(opts.fps) || 30)));
  return [
    '-y',
    '-i',
    opts.inputPath,
    '-vf',
    'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-r',
    String(safeFps),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    ...(opts.includeAudio ? ['-c:a', 'aac', '-b:a', '192k'] : ['-an']),
    '-movflags',
    '+faststart',
    opts.outputPath,
  ];
}

export function isMp4Buffer(bytes: Uint8Array): boolean {
  if (!bytes || bytes.length < 12) return false;
  // ISO Base Media File Format starts with box size (4 bytes) followed by 'ftyp'
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}
