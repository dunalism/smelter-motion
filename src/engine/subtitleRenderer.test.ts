import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractAutoEmphasisKeywords,
  getSubtitleStyleDef,
  resolveSubtitleConfig,
  SUBTITLE_STYLES,
} from './subtitleConfig';
import {
  findEmphasisRanges,
  renderSubtitleOverlay,
  renderSubtitlePreviewFrame,
} from './subtitleRenderer';
import { VIDEO_STYLES } from '../data/videoStyles';
import type { SubtitleSettings } from '../types/studio';

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
      if (prop === 'filter') return 'none';
      return noop;
    },
    set() {
      return true;
    },
  });
}

test('All 15 curated subtitle styles render without errors across entrance, middle, and end frames', () => {
  const ctx = createMockCanvasContext();
  assert.equal(SUBTITLE_STYLES.length, 15);

  for (const styleDef of SUBTITLE_STYLES) {
    const settings: SubtitleSettings = {
      enabled: true,
      fontSize: 28,
      position: 'bottom',
      style: styleDef.id,
    };

    for (const t of [0.05, 0.4, 1.8, 3.4]) {
      assert.doesNotThrow(() => {
        renderSubtitleOverlay({
          ctx,
          width: 720,
          height: 1280,
          text: 'Kita bantu kamu bedah isi kepala, supaya langkah kamu ke depan jadi lebih jelas.',
          subtitles: settings,
          localTime: t,
          sceneDuration: 3.6,
          emphasis: 'bedah, isi kepala, lebih jelas',
        });
      });
    }
  }
});

test('Legacy subtitle style IDs map cleanly and preview frame renders for all video palettes', () => {
  const ctx = createMockCanvasContext();
  assert.equal(getSubtitleStyleDef('clean' as any).id, 'garis_bawah');
  assert.equal(getSubtitleStyleDef('boxed' as any).id, 'kotak_gelap');
  assert.equal(getSubtitleStyleDef('ivory-capsule' as any).id, 'kartu_selotip');

  const sample = 'Kita bantu kamu bedah isi kepala, supaya langkah kamu ke depan jadi lebih jelas.';
  const ranges = findEmphasisRanges(sample, 'bedah, isi kepala, lebih jelas');
  assert.equal(ranges.length, 3);

  for (const vs of VIDEO_STYLES) {
    const settings: SubtitleSettings = {
      enabled: true,
      fontSize: 30,
      position: 'lower-third',
      style: vs.subtitleDefaults.style,
    };
    const resolved = resolveSubtitleConfig(settings, vs.palette);
    assert.ok(resolved.styleDef.fontFamily.length > 0);

    assert.doesNotThrow(() => {
      renderSubtitlePreviewFrame(
        ctx,
        540,
        420,
        sample,
        settings,
        1.2,
        3.6,
        'bedah, isi kepala, lebih jelas',
        vs.palette
      );
    });
  }
});

test('extractAutoEmphasisKeywords filters stopwords and selects meaningful keywords', () => {
  const keywords = extractAutoEmphasisKeywords(
    'Kita bantu kamu bedah strategi pemasaran digital supaya konversi meningkat.',
    2
  );
  assert.equal(keywords.length, 2);
  assert.ok(!keywords.includes('kamu'));
  assert.ok(!keywords.includes('supaya'));
});
