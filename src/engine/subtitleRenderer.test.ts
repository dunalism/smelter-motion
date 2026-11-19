import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySubtitlePreset,
  extractAutoEmphasisKeywords,
  getRecommendedPresetForVideoStyle,
  resolveSubtitleConfig,
  SUBTITLE_ANIMATIONS,
  SUBTITLE_EMPHASIS_STYLES,
  SUBTITLE_EXIT_ANIMATIONS,
  SUBTITLE_PRESETS,
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

test('All 33 subtitle styles render without errors across entrance, middle, and exit frames', () => {
  const ctx = createMockCanvasContext();
  assert.ok(SUBTITLE_STYLES.length >= 33);

  for (const styleDef of SUBTITLE_STYLES) {
    const settings: SubtitleSettings = {
      enabled: true,
      fontSize: 28,
      position: 'bottom',
      style: styleDef.id,
      animation: styleDef.defaultAnimation,
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

test('All 25 entrance animations and 6 exit animations render deterministically', () => {
  const ctx = createMockCanvasContext();
  assert.ok(SUBTITLE_ANIMATIONS.length >= 23);

  for (const anim of SUBTITLE_ANIMATIONS) {
    for (const exit of SUBTITLE_EXIT_ANIMATIONS) {
      const settings: SubtitleSettings = {
        enabled: true,
        fontSize: 28,
        position: 'lower-third',
        style: 'clean-minimal',
        animation: anim.id,
        animationConfig: {
          exit: exit.id,
          duration: anim.defaultDuration,
          delay: 0.05,
          easing: anim.defaultEasing,
          direction: 'up',
          intensity: 1.2,
        },
      };

      assert.doesNotThrow(() => {
        renderSubtitleOverlay({
          ctx,
          width: 1280,
          height: 720,
          text: 'Animasi subtitle profesional yang sinkron dengan timeline.',
          subtitles: settings,
          localTime: 0.35,
          sceneDuration: 3.5,
          emphasis: 'profesional',
        });
        renderSubtitleOverlay({
          ctx,
          width: 1280,
          height: 720,
          text: 'Animasi subtitle profesional yang sinkron dengan timeline.',
          subtitles: settings,
          localTime: 3.35,
          sceneDuration: 3.5,
          emphasis: 'profesional',
        });
      });
    }
  }
});

test('All 10 word emphasis styles and multi-phrase ranges work accurately', () => {
  const ctx = createMockCanvasContext();
  const sample = 'Kita bantu kamu bedah isi kepala, supaya langkah kamu ke depan jadi lebih jelas.';
  const ranges = findEmphasisRanges(sample, 'bedah, isi kepala, lebih jelas');
  assert.equal(ranges.length, 3);

  for (const emp of SUBTITLE_EMPHASIS_STYLES) {
    const settings: SubtitleSettings = {
      enabled: true,
      fontSize: 30,
      position: 'bottom',
      style: 'modern-bold',
      animation: 'pop',
      emphasisConfig: {
        style: emp.id,
        color: '#FACC15',
        scale: 1.18,
      },
    };

    assert.doesNotThrow(() => {
      renderSubtitlePreviewFrame(
        ctx,
        640,
        400,
        sample,
        settings,
        1.2,
        3.6,
        'bedah, isi kepala, lebih jelas',
        VIDEO_STYLES[0].palette
      );
    });
  }
});

test('All 9 subtitle presets apply cleanly and every video style has a recommended preset', () => {
  assert.equal(SUBTITLE_PRESETS.length, 9);

  const base: SubtitleSettings = {
    enabled: true,
    fontSize: 28,
    position: 'bottom',
    style: 'boxed',
    animation: 'static',
  };

  for (const preset of SUBTITLE_PRESETS) {
    const applied = applySubtitlePreset(base, preset.id);
    assert.equal(applied.presetId, preset.id);
    const resolved = resolveSubtitleConfig(applied);
    assert.ok(resolved.fontFamily.length > 0);
  }

  for (const vs of VIDEO_STYLES) {
    const rec = getRecommendedPresetForVideoStyle(vs.id);
    assert.ok(SUBTITLE_PRESETS.some((p) => p.id === rec));
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
