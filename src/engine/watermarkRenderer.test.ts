import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWatermarkLayout,
  DEFAULT_WATERMARK_SETTINGS,
  normalizeWatermarkSettings,
  renderWatermarkOverlay,
  renderWatermarkPreviewFrame,
  WATERMARK_PLATFORMS,
} from './watermarkRenderer';
import { compileSceneCode, renderSceneFrame } from './canvasRenderer';
import { PALETTE_PRESETS } from './motionMath';
import { SCENE_4_CODE } from '../data/demoProject';
import type { WatermarkPosition, WatermarkSettings } from '../types/studio';

function createMockCanvasContext(): CanvasRenderingContext2D {
  const noop = () => {};
  return new Proxy(
    {
      canvas: { width: 720, height: 1280 },
      font: '16px sans-serif',
      fillStyle: '#fff',
      strokeStyle: '#000',
      lineWidth: 1,
      globalAlpha: 1,
      textAlign: 'left',
      textBaseline: 'alphabetic',
      measureText: (txt: string) => ({ width: txt.length * 8 } as TextMetrics),
      createLinearGradient: () =>
        ({
          addColorStop: noop,
        }) as unknown as CanvasGradient,
      createRadialGradient: () =>
        ({
          addColorStop: noop,
        }) as unknown as CanvasGradient,
    } as unknown as CanvasRenderingContext2D,
    {
      get(target, prop) {
        if (prop in target) {
          return (target as unknown as Record<string | symbol, unknown>)[prop];
        }
        return noop;
      },
      set(target, prop, value) {
        (target as unknown as Record<string | symbol, unknown>)[prop] = value;
        return true;
      },
    }
  );
}

test('watermarkRenderer defaults to bottom-left position and normalizes invalid values safely', () => {
  assert.equal(DEFAULT_WATERMARK_SETTINGS.position, 'bottom-left');

  const normalized = normalizeWatermarkSettings({
    enabled: true,
    platforms: ['instagram', 'youtube', 'instagram', 'tiktok'],
    opacity: 2.5,
    scale: 0.1,
    text: '   @gerakcanvas   ',
  });

  assert.equal(normalized.enabled, true);
  assert.equal(normalized.position, 'bottom-left');
  assert.deepEqual(normalized.platforms, ['instagram', 'youtube', 'tiktok']);
  assert.equal(normalized.opacity, 0.95);
  assert.equal(normalized.scale, 0.7);
  assert.equal(normalized.text, '@gerakcanvas');
});

test('watermarkRenderer places watermark strictly in corner safe zones without blocking center animation', () => {
  const dimensions = [
    { w: 720, h: 1280 }, // 9:16
    { w: 1280, h: 720 }, // 16:9
    { w: 1080, h: 1080 }, // 1:1
  ];
  const positions: WatermarkPosition[] = [
    'bottom-left',
    'bottom-right',
    'top-left',
    'top-right',
  ];

  for (const { w, h } of dimensions) {
    for (const pos of positions) {
      const settings: WatermarkSettings = {
        enabled: true,
        platforms: [...WATERMARK_PLATFORMS],
        position: pos,
        opacity: 0.65,
        scale: 1,
        text: '@studio',
      };
      const layout = computeWatermarkLayout(w, h, settings);

      // Must stay inside canvas bounds with safe margins
      assert.ok(layout.x >= layout.marginX);
      assert.ok(layout.y >= layout.marginY);
      assert.ok(layout.x + layout.boxWidth <= w - layout.marginX + 1);
      assert.ok(layout.y + layout.boxHeight <= h - layout.marginY + 1);

      // Must stay outside the center animation stage (25%..75% vertical)
      const centerStageTop = h * 0.25;
      const centerStageBottom = h * 0.75;
      const isAboveCenter = layout.y + layout.boxHeight <= centerStageTop;
      const isBelowCenter = layout.y >= centerStageBottom;
      assert.ok(isAboveCenter || isBelowCenter);

      if (pos === 'bottom-left') {
        assert.equal(layout.x, layout.marginX);
        assert.equal(layout.y, h - layout.marginY - layout.boxHeight);
      }
    }
  }
});

test('watermarkRenderer renders multiple social logos simultaneously across all palettes and in renderSceneFrame', () => {
  const ctx = createMockCanvasContext();
  const compiled = compileSceneCode(SCENE_4_CODE);
  assert.ok(compiled.fn);

  const settings: WatermarkSettings = {
    enabled: true,
    platforms: ['instagram', 'youtube', 'tiktok', 'facebook'],
    position: 'bottom-left',
    opacity: 0.65,
    scale: 1,
    text: '@gerakcanvas',
  };

  for (const palette of Object.values(PALETTE_PRESETS)) {
    assert.doesNotThrow(() => {
      renderWatermarkOverlay({
        ctx,
        width: 720,
        height: 1280,
        watermark: settings,
        palette,
      });
      renderWatermarkPreviewFrame(ctx, 230, 408, settings, palette);
    });

    const err = renderSceneFrame({
      ctx,
      width: 720,
      height: 1280,
      localTime: 1.2,
      compiledFn: compiled.fn,
      palette,
      watermark: settings,
    });
    assert.equal(err, null);
  }
});
