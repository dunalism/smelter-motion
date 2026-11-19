import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSceneCode, extractSfxCalls, renderSceneFrame } from './canvasRenderer';
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
