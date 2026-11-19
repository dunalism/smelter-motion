import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileSceneCode,
  extractSfxCalls,
  findEmphasisRanges,
  renderSceneFrame,
} from './canvasRenderer';
import { SCENE_4_CODE, SCENE_5_CODE, SCENE_6_CODE } from '../data/demoProject';
import { VIDEO_STYLES } from '../data/videoStyles';

function createMockCanvasContext(): CanvasRenderingContext2D {
  const noop = () => {};
  const fakeGrad = { addColorStop: noop };
  return new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      if (prop === 'canvas') return { width: 720, height: 1280 };
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return () => fakeGrad;
      }
      if (prop === 'measureText') {
        return (str: string) => ({ width: String(str).length * 14 });
      }
      if (prop === 'globalAlpha') return 1;
      return noop;
    },
    set() {
      return true;
    },
  });
}

test('Scene 4, 5, and 6 code blocks compile without syntax errors', () => {
  const r4 = compileSceneCode(SCENE_4_CODE);
  assert.equal(r4.error, null);
  assert.ok(typeof r4.fn === 'function');

  const r5 = compileSceneCode(SCENE_5_CODE);
  assert.equal(r5.error, null);
  assert.ok(typeof r5.fn === 'function');

  const r6 = compileSceneCode(SCENE_6_CODE);
  assert.equal(r6.error, null);
  assert.ok(typeof r6.fn === 'function');
});

test('compileSceneCode catches syntax errors gracefully', () => {
  const bad = compileSceneCode('const a = ;');
  assert.equal(bad.fn, null);
  assert.ok(typeof bad.error === 'string' && bad.error.length > 0);
});

test('extractSfxCalls collects scheduled SFX from scene code', () => {
  const sfx4 = extractSfxCalls(SCENE_4_CODE);
  assert.equal(sfx4.length, 3);
  assert.equal(sfx4[0].name, 'glitch');
  assert.equal(sfx4[0].time, 1.18);
  assert.equal(sfx4[2].name, 'ding');

  const sfx5 = extractSfxCalls(SCENE_5_CODE);
  assert.equal(sfx5.length, 3);
  assert.equal(sfx5[0].name, 'laser');

  const sfx6 = extractSfxCalls(SCENE_6_CODE);
  assert.equal(sfx6.length, 3);
  assert.equal(sfx6[2].name, 'sparkle');
});

test('All 11 video styles compile and render across timestamps with zero runtime errors', () => {
  const mockCtx = createMockCanvasContext();
  for (const style of VIDEO_STYLES) {
    const compiled = compileSceneCode(style.sampleCode);
    assert.equal(compiled.error, null, `Compile failed for style ${style.id}: ${compiled.error}`);
    assert.ok(compiled.fn, `Missing fn for style ${style.id}`);

    for (const t of [0.1, 1.2, 2.5]) {
      const runtimeErr = renderSceneFrame({
        ctx: mockCtx,
        width: 720,
        height: 1280,
        localTime: t,
        sceneDuration: 3.6,
        compiledFn: compiled.fn,
        palette: style.palette,
        narration: 'Contoh kalimat narasi dengan beberapa kata kunci.',
        subtitles: {
          enabled: true,
          fontSize: 28,
          position: 'bottom',
          style: style.subtitleDefaults.style,
          animation: style.subtitleDefaults.animation,
        },
      });
      assert.equal(runtimeErr, null, `Runtime error for style ${style.id} at t=${t}: ${runtimeErr}`);
    }
  }
});

test('findEmphasisRanges matches emphasis words case-insensitively with boundaries', () => {
  const line = 'Awalnya sinyal tampak kacau, lalu jadi stabil.';
  const ranges = findEmphasisRanges(line, 'kacau');
  assert.equal(ranges.length, 1);
  assert.equal(line.slice(ranges[0][0], ranges[0][1]), 'kacau');

  const multiRanges = findEmphasisRanges('Gunakan pemindai bukti aktif sekarang.', 'PEMINDAI BUKTI');
  assert.equal(multiRanges.length, 1);
  assert.equal(
    'Gunakan pemindai bukti aktif sekarang.'.slice(multiRanges[0][0], multiRanges[0][1]),
    'pemindai bukti'
  );

  assert.deepEqual(findEmphasisRanges(line, ''), []);
  assert.deepEqual(findEmphasisRanges(line, 'tidakada'), []);
});

test('renderSceneFrame renders subtitle with emphasis underline without runtime errors', () => {
  const mockCtx = createMockCanvasContext();
  const compiled = compileSceneCode(SCENE_4_CODE);
  assert.ok(compiled.fn);

  for (const style of ['clean', 'boxed', 'ivory-capsule'] as const) {
    for (const animation of ['static', 'typewriter', 'word-highlight'] as const) {
      const err = renderSceneFrame({
        ctx: mockCtx,
        width: 720,
        height: 1280,
        localTime: 1.5,
        sceneDuration: 4.16,
        compiledFn: compiled.fn,
        palette: VIDEO_STYLES[0].palette,
        narration: 'Awalnya sinyal tampak kacau dan penuh gangguan.',
        emphasis: 'kacau',
        subtitles: {
          enabled: true,
          fontSize: 28,
          position: 'bottom',
          style,
          animation,
        },
      });
      assert.equal(err, null);
    }
  }
});

test('renderSceneFrame auto-fits oversized text, flips upside-down text, and suppresses duplicate bottom subtitles', () => {
  const drawnTexts: Array<{ text: string; font: string; rotatedPi: boolean }> = [];
  let currentFont = '';
  let currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const fakeGrad = { addColorStop: () => {} };

  const trackingCtx = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      if (prop === 'canvas') return { width: 720, height: 1280 };
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => fakeGrad;
      if (prop === 'measureText') {
        return (str: string) => {
          const match = /(\d+)px/.exec(currentFont);
          const px = match ? Number(match[1]) : 24;
          return { width: String(str).length * px * 0.55 };
        };
      }
      if (prop === 'getTransform') return () => currentTransform;
      if (prop === 'rotate') {
        return (angle: number) => {
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const { a, b, c, d, e, f } = currentTransform;
          currentTransform = {
            a: a * cos + c * sin,
            b: b * cos + d * sin,
            c: c * cos - a * sin,
            d: d * cos - b * sin,
            e,
            f,
          };
        };
      }
      if (prop === 'save' || prop === 'restore') {
        return () => {};
      }
      if (prop === 'fillText') {
        return (str: string) => {
          const angle = Math.atan2(currentTransform.b, currentTransform.a);
          drawnTexts.push({
            text: str,
            font: currentFont,
            rotatedPi: Math.abs(angle) > Math.PI * 0.55,
          });
        };
      }
      if (prop === 'globalAlpha') return 1;
      return () => {};
    },
    set(_target, prop, value) {
      if (prop === 'font') currentFont = String(value);
      return true;
    },
  });

  // 1. Oversized text in Kinetik HUD should shrink font size to fit within safe margin
  const longWordCode = `
    s.kamera([[0, 360, 620, 1], [1, 360, 620, 1]]);
    s.text3d("OVERTHINKING", 70, 400, { size: 120, condensed: true, align: "left" });
  `;
  const compiledLong = compileSceneCode(longWordCode);
  assert.ok(compiledLong.fn);
  renderSceneFrame({
    ctx: trackingCtx,
    width: 720,
    height: 1280,
    localTime: 0.5,
    compiledFn: compiledLong.fn,
    palette: VIDEO_STYLES.find((v) => v.id === 'kinetik-hud')!.palette,
  });
  assert.equal(drawnTexts.length, 1);
  const shrunkSize = Number(/(\d+)px/.exec(drawnTexts[0].font)?.[1] || 120);
  assert.ok(shrunkSize < 120, `Expected font size to shrink below 120, got ${shrunkSize}`);

  // 2. Duplicate subtitle at bottom should be suppressed when subtitles are enabled
  drawnTexts.length = 0;
  currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const dupSubCode = `
    s.text("JUDUL ATAS", 360, 300, { size: 32, align: "center" });
    s.text("Ini adalah kalimat narasi yang muncul di bawah.", 360, 1080, { size: 28, align: "center" });
  `;
  const compiledDup = compileSceneCode(dupSubCode);
  assert.ok(compiledDup.fn);
  renderSceneFrame({
    ctx: trackingCtx,
    width: 720,
    height: 1280,
    localTime: 0.5,
    compiledFn: compiledDup.fn,
    palette: VIDEO_STYLES[0].palette,
    narration: 'Ini adalah kalimat narasi yang muncul di bawah.',
    subtitles: { enabled: true, fontSize: 28, position: 'bottom', style: 'clean', animation: 'static' },
  });
  assert.ok(drawnTexts.some((d) => d.text === 'JUDUL ATAS'));
  const subtitleMatches = drawnTexts.filter((d) => d.text.includes('kalimat narasi'));
  assert.equal(subtitleMatches.length, 1, 'Should render only the official subtitle overlay, not double');

  // 3. Upside-down rotated text should be flipped right-side up
  drawnTexts.length = 0;
  currentTransform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  const upsideDownCode = `
    s.group({ x: 360, y: 500, rotate: 3.1 }, () => {
      s.text("TERBALIK", 0, 0, { size: 32, align: "center" });
    });
  `;
  const compiledUpsideDown = compileSceneCode(upsideDownCode);
  assert.ok(compiledUpsideDown.fn);
  renderSceneFrame({
    ctx: trackingCtx,
    width: 720,
    height: 1280,
    localTime: 0.5,
    compiledFn: compiledUpsideDown.fn,
    palette: VIDEO_STYLES[0].palette,
  });
  assert.equal(drawnTexts.length, 1);
  assert.equal(drawnTexts[0].rotatedPi, false, 'Upside-down text should be corrected upright');
});
