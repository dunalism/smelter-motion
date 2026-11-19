import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExportFileName,
  buildFfmpegMp4Args,
  ensureEvenDimension,
  hasProjectAudioSources,
  isMp4Buffer,
  pickMediaRecorderMimeType,
  sanitizeExportSlug,
  selectH264CodecCandidates,
} from './mp4ExportHelpers';

test('buildExportFileName always produces a clean .mp4 filename', () => {
  assert.equal(buildExportFileName('Kenapa Kita Sering Menunda?'), 'kenapa-kita-sering-menunda.mp4');
  assert.equal(buildExportFileName('   '), 'gerak-canvas-video.mp4');
  assert.equal(sanitizeExportSlug('AI & Motion 2026!'), 'ai-motion-2026');
});

test('ensureEvenDimension forces even pixel sizes >= 2 for H.264', () => {
  assert.equal(ensureEvenDimension(720), 720);
  assert.equal(ensureEvenDimension(721), 720);
  assert.equal(ensureEvenDimension(1), 2);
});

test('selectH264CodecCandidates picks High/Main Level 4.2 first for 60fps', () => {
  const c60 = selectH264CodecCandidates(720, 1280, 60);
  assert.equal(c60[0], 'avc1.4d002a');
  const c30 = selectH264CodecCandidates(720, 1280, 30);
  assert.equal(c30[0], 'avc1.4d0028');
});

test('pickMediaRecorderMimeType prefers mp4 first when supported, then webm for transcode', () => {
  assert.equal(
    pickMediaRecorderMimeType((m) => m === 'video/mp4;codecs=avc1,mp4a' || m === 'video/webm'),
    'video/mp4;codecs=avc1,mp4a'
  );
  assert.equal(
    pickMediaRecorderMimeType((m) => m.startsWith('video/webm')),
    'video/webm;codecs=vp9,opus'
  );
});

test('hasProjectAudioSources detects master audio, scene audio, or sfx calls', () => {
  const emptyProject = {
    masterAudioUrl: undefined,
    scenes: [
      {
        id: '1',
        index: 0,
        title: 'S1',
        narration: 'Tes',
        visualBrief: '',
        cameraHint: '',
        durationSec: 3,
        code: '',
        audio: { sourceType: 'none' as const },
      },
    ],
  };

  assert.equal(hasProjectAudioSources(emptyProject, [0]), false);
  assert.equal(hasProjectAudioSources(emptyProject, [2]), true);
  assert.equal(
    hasProjectAudioSources({ ...emptyProject, masterAudioUrl: 'data:audio/wav;base64,AAA' }, [0]),
    true
  );
  assert.equal(
    hasProjectAudioSources(
      {
        masterAudioUrl: undefined,
        scenes: [
          {
            ...emptyProject.scenes[0],
            audio: { sourceType: 'tts', dataUrl: 'data:audio/wav;base64,AAA' },
          },
        ],
      },
      [0]
    ),
    true
  );
});

test('buildFfmpegMp4Args builds libx264 + yuv420p + faststart args with/without audio', () => {
  const withAudio = buildFfmpegMp4Args({
    inputPath: '/tmp/in.webm',
    outputPath: '/tmp/out.mp4',
    fps: 60,
    includeAudio: true,
  });
  assert.ok(withAudio.includes('libx264'));
  assert.ok(withAudio.includes('yuv420p'));
  assert.ok(withAudio.includes('aac'));
  assert.ok(withAudio.includes('+faststart'));
  assert.equal(withAudio.includes('-an'), false);

  const withoutAudio = buildFfmpegMp4Args({
    inputPath: '/tmp/in.webm',
    outputPath: '/tmp/out.mp4',
    fps: 30,
    includeAudio: false,
  });
  assert.ok(withoutAudio.includes('-an'));
  assert.equal(withoutAudio.includes('aac'), false);
});

test('isMp4Buffer validates ISO BMFF ftyp signature', () => {
  const validMp4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const webmMagic = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0, 0, 0, 0]);
  assert.equal(isMp4Buffer(validMp4), true);
  assert.equal(isMp4Buffer(webmMagic), false);
  assert.equal(isMp4Buffer(new Uint8Array([1, 2, 3])), false);
});
