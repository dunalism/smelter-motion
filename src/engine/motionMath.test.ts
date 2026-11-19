import test from 'node:test';
import assert from 'node:assert/strict';
import {
  at,
  buildMasterPrompt,
  buildPromptForScene,
  ease,
  evaluateCamera,
  formatTimecode,
  getStylePreset,
  inferSceneDurationFromCode,
  keys,
  lerp,
  PALETTE_PRESETS,
  rand,
  resolveSceneAtTime,
  splitMultiSceneCode,
  spring,
  stagger,
  wave,
} from './motionMath';
import { VIDEO_STYLES } from '../data/videoStyles';
import type { SceneItem } from '../types/studio';

test('spring returns 0 before startTime and settles at 1', () => {
  assert.equal(spring(0.05, 0.12, 'smooth'), 0);
  assert.equal(spring(0.12, 0.12, 'smooth'), 0);
  const mid = spring(0.35, 0.12, 'smooth');
  assert.ok(mid > 0 && mid < 1);
  assert.equal(spring(2.0, 0.12, 'smooth'), 1);
  assert.equal(spring(2.0, 0.12, 'heavy'), 1);
  assert.equal(spring(2.0, 0.12, 'snappy'), 1);
  assert.equal(spring(2.0, 0.12, 'bouncy'), 1);
  assert.equal(spring(2.0, 0.12, 'fast'), 1);
});

test('ease functions clamp and follow expected curves', () => {
  assert.equal(ease.linear(-0.5), 0);
  assert.equal(ease.linear(1.5), 1);
  assert.equal(ease.sharp(0), 0);
  assert.equal(ease.sharp(1), 1);
  assert.ok(ease.sharp(0.5) > 0.9);
  assert.equal(ease.back(0), 0);
  assert.equal(ease.back(1), 1);
  assert.ok(ease.back(0.65) > 1);
  assert.equal(ease.outBack(1), 1);
});

test('stagger offsets spring start times by index * step', () => {
  const s0 = stagger(0, 0, 0.5, 0.1);
  const s1 = stagger(0, 1, 0.5, 0.1);
  assert.equal(s0, 0);
  assert.equal(s1, 0);
  const a0 = stagger(0.65, 0, 0.5, 0.1);
  const a1 = stagger(0.65, 1, 0.5, 0.1);
  assert.ok(a0 > a1);
});

test('keys interpolates and clamps values across keyframes', () => {
  const kf: Array<[number, number]> = [
    [0.75, 0],
    [1.05, 1],
    [2.72, 1],
    [2.98, 0],
  ];
  assert.equal(keys(0.2, kf), 0);
  assert.ok(Math.abs(keys(0.9, kf) - 0.5) < 1e-6);
  assert.equal(keys(1.8, kf), 1);
  assert.ok(Math.abs(keys(2.85, kf) - 0.5) < 1e-6);
  assert.equal(keys(3.5, kf), 0);
});

test('evaluateCamera interpolates camera x, y, zoom smoothly', () => {
  const camFrames: Array<[number, number, number, number]> = [
    [0, 360, 620, 1],
    [2.0, 360, 445, 1.2],
  ];
  const start = evaluateCamera(0, camFrames);
  assert.deepEqual(start, { x: 360, y: 620, zoom: 1 });

  const mid = evaluateCamera(1.0, camFrames);
  assert.equal(mid.x, 360);
  assert.ok(Math.abs(mid.y - 532.5) < 1e-6);
  assert.ok(Math.abs(mid.zoom - 1.1) < 1e-6);

  const end = evaluateCamera(3.0, camFrames);
  assert.deepEqual(end, { x: 360, y: 445, zoom: 1.2 });
});

test('rand is deterministic for the same seed and within [0, 1)', () => {
  const a = rand(42);
  const b = rand(42);
  const c = rand(43);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok(a >= 0 && a < 1);
});

test('at, lerp, and wave behave deterministically', () => {
  assert.equal(lerp(100, 200, 0.25), 125);
  assert.equal(at(0.1, 0.3, 0.2), 0);
  assert.ok(Math.abs(at(0.4, 0.3, 0.2) - 0.5) < 1e-6);
  assert.equal(at(1.0, 0.3, 0.2), 1);
  assert.ok(Math.abs(wave(0, 1, 5)) < 1e-9);
});

test('splitMultiSceneCode separates // ===== SCENE X ===== blocks', () => {
  const sample = `
// ===== SCENE 4 =====
s.kamera([[0, 360, 620, 1], [4.16, 360, 445, 1.12]]);
s.text("OK", 0, 0);

// ===== SCENE 5 =====
s.kamera([[0, 360, 620, 1], [4.6, 455, 450, 1.12]]);
s.text("02", 0, 0);

// ===== SCENE 6 =====
s.kamera([[0, 360, 625, 1], [3.74, 360, 515, 1]]);
s.text("BUKTI: 0", 0, 0);
`;
  const parsed = splitMultiSceneCode(sample);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].sceneNumber, 4);
  assert.equal(parsed[1].sceneNumber, 5);
  assert.equal(parsed[2].sceneNumber, 6);
  assert.ok(parsed[0].code.includes('s.text("OK"'));
  assert.ok(parsed[1].code.includes('s.text("02"'));
  assert.ok(parsed[2].code.includes('s.text("BUKTI: 0"'));
});

test('inferSceneDurationFromCode extracts max camera keyframe timestamp', () => {
  const code = `s.kamera([[0, 360, 620, 1], [2.35, 360, 445, 1.12], [4.16, 360, 445, 1.12]]);`;
  assert.equal(inferSceneDurationFromCode(code, 5), 4.16);
  assert.equal(inferSceneDurationFromCode(`s.circle(10, 10, 5);`, 5), 5);
});

test('resolveSceneAtTime maps global time to local scene time', () => {
  const scenes: SceneItem[] = [
    {
      id: '1',
      index: 0,
      title: 'S1',
      narration: 'Satu',
      visualBrief: 'V1',
      cameraHint: 'C1',
      durationSec: 4,
      code: '',
      audio: { sourceType: 'none' },
    },
    {
      id: '2',
      index: 1,
      title: 'S2',
      narration: 'Dua',
      visualBrief: 'V2',
      cameraHint: 'C2',
      durationSec: 3,
      code: '',
      audio: { sourceType: 'none' },
    },
  ];
  const r1 = resolveSceneAtTime(scenes, 2.5);
  assert.equal(r1.sceneIndex, 0);
  assert.equal(r1.localTime, 2.5);

  const r2 = resolveSceneAtTime(scenes, 5.25);
  assert.equal(r2.sceneIndex, 1);
  assert.equal(r2.localTime, 1.25);
  assert.equal(formatTimecode(65.4), '01:05.4');
});

test('all 11 video styles are registered and embedded into prompts with faceless rule', () => {
  assert.equal(VIDEO_STYLES.length, 11);

  const scene: SceneItem = {
    id: 's1',
    index: 0,
    title: 'Uji Gaya',
    narration: 'Tahun 1945 menjadi tonggak penting sejarah.',
    visualBrief: 'Ilustrasi dokumen arsip dan tahun serif.',
    cameraHint: 'Zoom perlahan',
    durationSec: 4.0,
    code: '',
    audio: { sourceType: 'none' },
  };

  for (const style of VIDEO_STYLES) {
    const preset = getStylePreset(style.id);
    assert.equal(preset.id, style.id);
    assert.ok(PALETTE_PRESETS[style.id]);
    const prompt = buildPromptForScene(scene, PALETTE_PRESETS[style.id], '9:16');
    assert.ok(prompt.includes(style.name));
    assert.ok(prompt.toLowerCase().includes('faceless'));
  }

  const master = buildMasterPrompt('Demo Arsip', [scene], PALETTE_PRESETS['arsip-kuno'], '9:16');
  assert.ok(master.includes('Arsip Kuno'));
  assert.ok(master.includes('720x1280'));
  assert.ok(master.includes('LARANGAN SUBTITLE GANDA'));
  assert.ok(master.includes('Area Aman Anti-Terpotong'));

  const paperStyle = getStylePreset('paper-cutout');
  assert.ok(!paperStyle.sampleCode.includes('Math.floor(s.t * 7)'));
  assert.ok(paperStyle.animationCardPrompt.includes('RADIAN'));
});
