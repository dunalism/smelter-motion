import type { PalettePreset, SfxCall, SubtitleSettings } from '../types/studio';
import {
  at,
  clamp,
  ease,
  evaluateCamera,
  keys,
  lerp,
  rand,
  spring,
  stagger,
  wave,
  type KeyEasing,
  type SpringPreset,
} from './motionMath';

export type CompiledSceneFn = (s: MotionSceneContext, ctx: CanvasRenderingContext2D) => void;

export interface CompileResult {
  fn: CompiledSceneFn | null;
  error: string | null;
}

export interface HatchConfig {
  angle?: number;
  spacing?: number;
  color?: string;
  width?: number;
}

export interface CommonDrawOpts {
  fill?: string;
  stroke?: string;
  width?: number;
  alpha?: number;
  draw?: number;
  dash?: number[];
  wobble?: number;
  hatch?: boolean | HatchConfig;
}

export interface MotionSceneContext {
  t: number;
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
  ease: typeof ease;
  kamera: (keyframes: Array<[number, number, number, number]>) => void;
  sfx: (name: string, time: number, volume?: number, pitch?: number) => void;
  group: (
    opts: { x?: number; y?: number; scale?: number; rotate?: number; alpha?: number },
    fn: () => void
  ) => void;
  line: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opts?: CommonDrawOpts
  ) => void;
  polyline: (
    points: Array<[number, number]>,
    opts?: CommonDrawOpts & { close?: boolean }
  ) => void;
  rect: (
    x: number,
    y: number,
    w: number,
    h: number,
    opts?: CommonDrawOpts & { radius?: number }
  ) => void;
  circle: (
    x: number,
    y: number,
    r: number,
    opts?: CommonDrawOpts
  ) => void;
  ellipse: (
    x: number,
    y: number,
    rx: number,
    ry: number,
    opts?: CommonDrawOpts & { rotate?: number }
  ) => void;
  arc: (
    x: number,
    y: number,
    r: number,
    startAngle: number,
    endAngle: number,
    opts?: CommonDrawOpts
  ) => void;
  box3d: (
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    opts?: {
      fill?: string;
      shade?: string;
      top?: string;
      edges?: string;
      width?: number;
      alpha?: number;
      wobble?: number;
      hatch?: boolean | HatchConfig;
    }
  ) => void;
  text: (
    str: string,
    x: number,
    y: number,
    opts?: {
      size?: number;
      color?: string;
      fill?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
      alpha?: number;
      font?: string;
      weight?: string | number;
      maxWidth?: number;
    }
  ) => void;
  text3d: (
    str: string,
    x: number,
    y: number,
    opts?: {
      size?: number;
      color?: string;
      side?: string;
      depth?: number;
      serif?: boolean;
      condensed?: boolean;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
      alpha?: number;
      font?: string;
      weight?: string | number;
      maxWidth?: number;
    }
  ) => void;
  sparkle: (
    x: number,
    y: number,
    size: number,
    opts?: { stroke?: string; fill?: string; width?: number; alpha?: number }
  ) => void;
  burst: (
    x: number,
    y: number,
    radius: number,
    opts?: { draw?: number; count?: number; stroke?: string; width?: number; alpha?: number }
  ) => void;
  // Belah Warna helpers
  field: (a: number, b: number) => void;
  side: (x: number, y: number, a: number, b: number) => 'top' | 'bottom';
  both: (
    a: number,
    b: number,
    fn: (main: string, shade: string, back: string) => void
  ) => void;
  slab: (
    x: number,
    y: number,
    w: number,
    h: number,
    d: number,
    radius: number,
    main: string,
    shade: string
  ) => void;
  disc: (x: number, y: number, r: number, main: string, back?: string) => void;
  word: (str: string, x: number, y: number, size?: number, progress?: number) => void;

  spring: (startTime: number, preset?: SpringPreset) => number;
  stagger: (index: number, startTime: number, step?: number, preset?: SpringPreset) => number;
  keys: (keyframes: Array<[number, number]>, easing?: KeyEasing) => number;
  wave: (freq?: number, amp?: number, phase?: number) => number;
  at: (startTime: number, fadeDuration?: number) => number;
  lerp: (a: number, b: number, t: number) => number;
  rand: (seed: number) => number;
}

export function compileSceneCode(code: string): CompileResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return { fn: () => {}, error: null };
  }
  try {
    const fn = new Function('s', 'ctx', `"use strict";\n${trimmed}`) as CompiledSceneFn;
    return { fn, error: null };
  } catch (err) {
    return {
      fn: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function extractSfxCalls(code: string, width: number = 720, height: number = 1280): SfxCall[] {
  const { fn } = compileSceneCode(code);
  if (!fn) return [];
  const calls: SfxCall[] = [];
  const noop = () => {};

  const dummyCtx = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      if (prop === 'canvas') return { width, height };
      return noop;
    },
    set() {
      return true;
    },
  });

  const dryCtx: MotionSceneContext = {
    t: 0,
    width,
    height,
    ctx: dummyCtx,
    ease,
    kamera: noop,
    sfx: (name, time, volume = 0.5, pitch = 1) => {
      if (typeof name === 'string' && typeof time === 'number' && !Number.isNaN(time)) {
        calls.push({ name, time, volume, pitch });
      }
    },
    group: (_opts, inner) => {
      try {
        inner();
      } catch {
        // ignore dry-run error
      }
    },
    line: noop,
    polyline: noop,
    rect: noop,
    circle: noop,
    ellipse: noop,
    arc: noop,
    box3d: noop,
    text: noop,
    text3d: noop,
    sparkle: noop,
    burst: noop,
    field: noop,
    side: () => 'top',
    both: noop,
    slab: noop,
    disc: noop,
    word: noop,
    spring: (start, preset) => spring(0, start, preset),
    stagger: (i, start, step, preset) => stagger(0, i, start, step, preset),
    keys: (kf, easing) => keys(0, kf, easing),
    wave: (f, a, p) => wave(0, f, a, p),
    at: (start, dur) => at(0, start, dur),
    lerp,
    rand,
  };
  try {
    fn(dryCtx, dummyCtx);
  } catch {
    // ignore dry-run runtime error
  }
  return calls.sort((a, b) => a.time - b.time);
}

function isNoneColor(val?: string): boolean {
  return !val || val === 'none' || val === 'transparent';
}

function tracePolylineSegment(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  drawFraction: number,
  wobbleAmt: number = 0
): void {
  if (points.length < 2 || drawFraction <= 0) return;

  const wobblePt = (pt: [number, number], idx: number): [number, number] => {
    if (!wobbleAmt || wobbleAmt <= 0) return pt;
    const dx = (rand(idx * 17.3 + pt[0] * 0.1) - 0.5) * wobbleAmt * 2;
    const dy = (rand(idx * 29.7 + pt[1] * 0.1) - 0.5) * wobbleAmt * 2;
    return [pt[0] + dx, pt[1] + dy];
  };

  if (drawFraction >= 1) {
    const p0 = wobblePt(points[0], 0);
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 1; i < points.length; i++) {
      const pi = wobblePt(points[i], i);
      ctx.lineTo(pi[0], pi[1]);
    }
    return;
  }

  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen <= 0) return;
  let remaining = totalLen * clamp(drawFraction, 0, 1);

  const p0 = wobblePt(points[0], 0);
  ctx.moveTo(p0[0], p0[1]);
  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (remaining >= segLen) {
      const pi = wobblePt(points[i + 1], i + 1);
      ctx.lineTo(pi[0], pi[1]);
      remaining -= segLen;
    } else if (remaining > 0) {
      const ratio = remaining / segLen;
      const px = lerp(points[i][0], points[i + 1][0], ratio);
      const py = lerp(points[i][1], points[i + 1][1], ratio);
      ctx.lineTo(px, py);
      break;
    } else {
      break;
    }
  }
}

function drawHatchPattern(
  ctx: CanvasRenderingContext2D,
  bounds: { x: number; y: number; w: number; h: number },
  hatch: boolean | HatchConfig | undefined,
  fallbackColor: string,
  buildClipPath?: () => void
): void {
  if (!hatch) return;
  const cfg: HatchConfig = typeof hatch === 'object' ? hatch : {};
  const angle = cfg.angle ?? -0.7;
  const spacing = Math.max(4, cfg.spacing ?? 9);
  const color = cfg.color ?? fallbackColor;
  const width = cfg.width ?? 1.2;

  ctx.save();
  if (buildClipPath) {
    ctx.beginPath();
    buildClipPath();
  }
  ctx.clip();
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const diag = Math.hypot(bounds.w, bounds.h) * 0.75;
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -diag; x <= diag; x += spacing) {
    ctx.moveTo(x, -diag);
    ctx.lineTo(x, diag);
  }
  ctx.stroke();
  ctx.restore();
}

export interface RenderFrameOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  localTime: number;
  sceneDuration?: number;
  compiledFn: CompiledSceneFn | null;
  palette: PalettePreset;
  narration?: string;
  subtitles?: SubtitleSettings;
}

export function renderSceneFrame({
  ctx,
  width,
  height,
  localTime,
  sceneDuration = 4.5,
  compiledFn,
  palette,
  narration,
  subtitles,
}: RenderFrameOptions): string | null {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  if (!palette.isLight) {
    const grad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.38,
      width * 0.1,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.85
    );
    grad.addColorStop(0, 'rgba(30, 48, 86, 0.16)');
    grad.addColorStop(1, 'rgba(3, 5, 11, 0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  let cameraApplied = false;
  let drawCount = 0;

  const ensureCameraDefault = () => {
    if (!cameraApplied) {
      cameraApplied = true;
      ctx.save();
    }
  };

  const applyStrokeAndFill = (
    opts: {
      fill?: string;
      stroke?: string;
      width?: number;
      alpha?: number;
      dash?: number[];
    },
    allowFill: boolean = true
  ) => {
    const strokeVal = opts.stroke;
    const fillVal = opts.fill;
    if (allowFill && !isNoneColor(fillVal)) {
      ctx.fillStyle = fillVal!;
      ctx.fill();
    }
    if (strokeVal !== 'none') {
      const effectiveStroke = strokeVal || palette.primary;
      if (!isNoneColor(effectiveStroke)) {
        ctx.strokeStyle = effectiveStroke;
        ctx.lineWidth = opts.width ?? 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (opts.dash && opts.dash.length > 0) {
          ctx.setLineDash(opts.dash);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      }
    }
  };

  const GREEN_BG = '#0d4a3c';
  const SALMON_BG = '#ff8c69';

  const s: MotionSceneContext = {
    t: localTime,
    width,
    height,
    ctx,
    ease,
    kamera: (keyframes) => {
      if (drawCount === 0 && !cameraApplied) {
        cameraApplied = true;
        ctx.save();
        const cam = evaluateCamera(localTime, keyframes, width, height);
        ctx.translate(width / 2, height / 2);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);
      }
    },
    sfx: () => {},
    group: (opts, fn) => {
      ensureCameraDefault();
      ctx.save();
      if (opts) {
        if (typeof opts.alpha === 'number') {
          ctx.globalAlpha = ctx.globalAlpha * clamp(opts.alpha, 0, 1);
        }
        if (typeof opts.x === 'number' || typeof opts.y === 'number') {
          ctx.translate(opts.x ?? 0, opts.y ?? 0);
        }
        if (typeof opts.rotate === 'number') {
          ctx.rotate(opts.rotate);
        }
        if (typeof opts.scale === 'number') {
          ctx.scale(opts.scale, opts.scale);
        }
      }
      fn();
      ctx.restore();
    },
    line: (x1, y1, x2, y2, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.beginPath();
      const ex = lerp(x1, x2, d);
      const ey = lerp(y1, y2, d);
      if (opts.wobble && opts.wobble > 0) {
        const steps = 6;
        const pts: Array<[number, number]> = [];
        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          pts.push([lerp(x1, ex, u), lerp(y1, ey, u)]);
        }
        tracePolylineSegment(ctx, pts, 1, opts.wobble);
      } else {
        ctx.moveTo(x1, y1);
        ctx.lineTo(ex, ey);
      }
      applyStrokeAndFill({ ...opts, fill: 'none' }, false);
      ctx.restore();
    },
    polyline: (points, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      if (!Array.isArray(points) || points.length < 2) return;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;
      const tracePoly = () => {
        ctx.beginPath();
        tracePolylineSegment(ctx, points, d, opts.wobble ?? 0);
        if (opts.close) ctx.closePath();
      };

      if (opts.hatch && d >= 0.99) {
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        drawHatchPattern(
          ctx,
          { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY },
          opts.hatch,
          opts.stroke || palette.primary,
          () => {
            tracePolylineSegment(ctx, points, 1, opts.wobble ?? 0);
            ctx.closePath();
          }
        );
      }

      tracePoly();
      applyStrokeAndFill(opts, d >= 0.99);
      ctx.restore();
    },
    rect: (x, y, w, h, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.abs(w);
      const rh = Math.abs(h);

      ctx.save();
      ctx.globalAlpha *= alpha;

      const traceRectPath = () => {
        ctx.beginPath();
        if (opts.radius && opts.radius > 0) {
          ctx.roundRect(rx, ry, rw, rh, opts.radius);
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
      };

      if (!isNoneColor(opts.fill)) {
        ctx.save();
        ctx.globalAlpha *= d;
        ctx.fillStyle = opts.fill!;
        traceRectPath();
        ctx.fill();
        ctx.restore();
      }

      if (opts.hatch) {
        drawHatchPattern(
          ctx,
          { x: rx, y: ry, w: rw, h: rh },
          opts.hatch,
          opts.stroke || palette.primary,
          () => {
            if (opts.radius && opts.radius > 0) {
              ctx.roundRect(rx, ry, rw, rh, opts.radius);
            } else {
              ctx.rect(rx, ry, rw, rh);
            }
          }
        );
      }

      if (opts.stroke !== 'none') {
        if (d >= 0.999 && !(opts.wobble && opts.wobble > 0)) {
          traceRectPath();
        } else {
          const corners: Array<[number, number]> = [
            [rx, ry],
            [rx + rw, ry],
            [rx + rw, ry + rh],
            [rx, ry + rh],
            [rx, ry],
          ];
          ctx.beginPath();
          tracePolylineSegment(ctx, corners, d, opts.wobble ?? 0);
        }
        applyStrokeAndFill({ ...opts, fill: 'none' }, false);
      }
      ctx.restore();
    },
    circle: (x, y, r, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0 || r <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;

      const traceCirclePath = (fullClosed: boolean) => {
        ctx.beginPath();
        if (opts.wobble && opts.wobble > 0) {
          const segs = 28;
          const pts: Array<[number, number]> = [];
          const frac = fullClosed ? 1 : d;
          for (let i = 0; i <= segs; i++) {
            const a = -Math.PI / 2 + (i / segs) * Math.PI * 2 * frac;
            const wr = r + (rand(i * 11.3) - 0.5) * opts.wobble * 2;
            pts.push([x + Math.cos(a) * wr, y + Math.sin(a) * wr]);
          }
          tracePolylineSegment(ctx, pts, 1, 0);
          if (fullClosed) ctx.closePath();
        } else if (fullClosed) {
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.closePath();
        } else {
          const startA = -Math.PI / 2;
          ctx.arc(x, y, r, startA, startA + Math.PI * 2 * d);
        }
      };

      if (opts.hatch && d >= 0.85) {
        drawHatchPattern(
          ctx,
          { x: x - r, y: y - r, w: r * 2, h: r * 2 },
          opts.hatch,
          opts.stroke || palette.primary,
          () => traceCirclePath(true)
        );
      }

      traceCirclePath(false);
      applyStrokeAndFill(opts, d >= 0.99);
      ctx.restore();
    },
    ellipse: (x, y, rx, ry, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0 || rx <= 0 || ry <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;

      const traceEllipsePath = (fullClosed: boolean) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, opts.rotate ?? 0, 0, Math.PI * 2 * (fullClosed ? 1 : d));
        if (fullClosed) ctx.closePath();
      };

      if (opts.hatch && d >= 0.85) {
        drawHatchPattern(
          ctx,
          { x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 },
          opts.hatch,
          opts.stroke || palette.primary,
          () => traceEllipsePath(true)
        );
      }

      traceEllipsePath(false);
      applyStrokeAndFill(opts, d >= 0.99);
      ctx.restore();
    },
    arc: (x, y, r, startAngle, endAngle, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 1 : clamp(opts.draw, 0, 1);
      if (d <= 0 || r <= 0) return;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, startAngle, lerp(startAngle, endAngle, d));
      applyStrokeAndFill(opts, false);
      ctx.restore();
    },
    box3d: (x, y, w, h, depth, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0) return;

      const dx = depth * 0.65;
      const dy = -depth * 0.52;
      const fill = opts.fill ?? palette.primary;
      const shade = opts.shade ?? palette.secondary;
      const top = opts.top ?? fill;
      const edges = opts.edges ?? palette.text;
      const strokeOpt = edges === 'none' ? 'none' : edges;

      ctx.save();
      ctx.globalAlpha *= alpha;

      // Top face
      s.polyline(
        [
          [x, y],
          [x + dx, y + dy],
          [x + w + dx, y + dy],
          [x + w, y],
        ],
        {
          fill: top,
          stroke: strokeOpt,
          width: opts.width ?? 2,
          wobble: opts.wobble,
          close: true,
        }
      );

      // Right side face
      s.polyline(
        [
          [x + w, y],
          [x + w + dx, y + dy],
          [x + w + dx, y + h + dy],
          [x + w, y + h],
        ],
        {
          fill: shade,
          stroke: strokeOpt,
          width: opts.width ?? 2,
          wobble: opts.wobble,
          hatch: opts.hatch,
          close: true,
        }
      );

      // Front face
      s.rect(x, y, w, h, {
        fill,
        stroke: strokeOpt,
        width: opts.width ?? 2,
        wobble: opts.wobble,
      });

      ctx.restore();
    },
    text: (str, x, y, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0 || str === undefined || str === null) return;

      const size = opts.size ?? 24;
      const weight = opts.weight ?? 600;
      const font = opts.font ?? 'Outfit, system-ui, sans-serif';
      const color = opts.color ?? opts.fill ?? palette.text;

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textAlign = opts.align ?? 'left';
      ctx.textBaseline = opts.baseline ?? 'middle';
      ctx.fillStyle = color;
      if (opts.maxWidth) {
        ctx.fillText(String(str), x, y, opts.maxWidth);
      } else {
        ctx.fillText(String(str), x, y);
      }
      ctx.restore();
    },
    text3d: (str, x, y, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0 || str === undefined || str === null) return;

      const size = opts.size ?? 72;
      const weight = opts.weight ?? 800;
      const family = opts.serif
        ? "'Playfair Display', Georgia, serif"
        : opts.condensed
          ? "'Barlow Condensed', Outfit, sans-serif"
          : opts.font ?? "'Barlow Condensed', Outfit, sans-serif";
      const color = opts.color ?? palette.text;
      const depth = Math.max(0, Math.round(opts.depth ?? 0));
      const sideColor = opts.side ?? '#333333';

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.font = `${weight} ${size}px ${family}`;
      ctx.textAlign = opts.align ?? 'center';
      ctx.textBaseline = opts.baseline ?? 'middle';

      if (depth > 0) {
        ctx.fillStyle = sideColor;
        for (let i = depth; i >= 1; i--) {
          ctx.fillText(String(str), x + i * 0.85, y + i * 0.85, opts.maxWidth);
        }
      }

      ctx.fillStyle = color;
      ctx.fillText(String(str), x, y, opts.maxWidth);
      ctx.restore();
    },
    sparkle: (x, y, size, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const alpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      if (alpha <= 0 || size <= 0) return;

      ctx.save();
      ctx.globalAlpha *= alpha;
      ctx.beginPath();
      const inner = size * 0.28;
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + inner * 0.4, y - inner * 0.4, x + size, y);
      ctx.quadraticCurveTo(x + inner * 0.4, y + inner * 0.4, x, y + size);
      ctx.quadraticCurveTo(x - inner * 0.4, y + inner * 0.4, x - size, y);
      ctx.quadraticCurveTo(x - inner * 0.4, y - inner * 0.4, x, y - size);
      ctx.closePath();

      applyStrokeAndFill(
        {
          stroke: opts.stroke ?? palette.primary,
          fill: opts.fill ?? 'none',
          width: opts.width ?? 1.8,
        },
        !isNoneColor(opts.fill)
      );
      ctx.restore();
    },
    burst: (x, y, radius, opts = {}) => {
      ensureCameraDefault();
      drawCount++;
      const d = opts.draw === undefined ? 0.5 : clamp(opts.draw, 0, 1);
      if (d <= 0.001 || d >= 0.999) return;
      const baseAlpha = opts.alpha === undefined ? 1 : clamp(opts.alpha, 0, 1);
      const envelope = Math.sin(d * Math.PI);
      const effectiveAlpha = baseAlpha * envelope;
      if (effectiveAlpha <= 0.01) return;

      const count = opts.count ?? 16;
      const stroke = opts.stroke ?? palette.primary;
      const innerR = lerp(radius * 0.12, radius * 0.72, d);
      const outerR = lerp(radius * 0.28, radius, d);

      ctx.save();
      ctx.globalAlpha *= effectiveAlpha;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = opts.width ?? 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        ctx.moveTo(x + Math.cos(a) * innerR, y + Math.sin(a) * innerR);
        ctx.lineTo(x + Math.cos(a) * outerR, y + Math.sin(a) * outerR);
      }
      ctx.stroke();
      ctx.restore();
    },

    // Belah Warna helpers
    field: (a, b) => {
      ensureCameraDefault();
      drawCount++;
      ctx.save();
      // Top bottle green
      ctx.fillStyle = GREEN_BG;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, b);
      ctx.lineTo(0, a);
      ctx.closePath();
      ctx.fill();

      // Bottom salmon
      ctx.fillStyle = SALMON_BG;
      ctx.beginPath();
      ctx.moveTo(0, a);
      ctx.lineTo(width, b);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    side: (x, y, a, b) => {
      const lineY = lerp(a, b, x / width);
      return y < lineY ? 'top' : 'bottom';
    },
    both: (a, b, fn) => {
      ensureCameraDefault();
      drawCount++;
      // Top region (objects are salmon with darker salmon shade, green back)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-200, -200);
      ctx.lineTo(width + 200, -200);
      ctx.lineTo(width + 200, b + (b - a) * (200 / width));
      ctx.lineTo(-200, a - (b - a) * (200 / width));
      ctx.closePath();
      ctx.clip();
      fn('#ff8c69', '#d96948', '#0d4a3c');
      ctx.restore();

      // Bottom region (objects are bottle green with darker green shade, salmon back)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-200, a - (b - a) * (200 / width));
      ctx.lineTo(width + 200, b + (b - a) * (200 / width));
      ctx.lineTo(width + 200, height + 200);
      ctx.lineTo(-200, height + 200);
      ctx.closePath();
      ctx.clip();
      fn('#0d4a3c', '#073127', '#ff8c69');
      ctx.restore();
    },
    slab: (x, y, w, h, d, radius, main, shade) => {
      ctx.save();
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.roundRect(x, y + d, w, h, radius);
      ctx.fill();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fill();
      ctx.restore();
    },
    disc: (x, y, r, main, back) => {
      ctx.save();
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (back) {
        ctx.fillStyle = back;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
    word: (str, x, y, size = 76, progress = 1) => {
      const p = clamp(progress, 0, 1.2);
      if (p <= 0.01) return;
      ctx.save();
      ctx.globalAlpha *= clamp(p, 0, 1);
      ctx.translate(x, y);
      const scale = lerp(0.75, 1, p);
      ctx.scale(scale, scale);
      ctx.font = `800 ${size}px Outfit, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff1dc';
      ctx.fillText(String(str).toUpperCase(), 0, 0);
      ctx.restore();
    },

    spring: (startTime, preset) => spring(localTime, startTime, preset),
    stagger: (index, startTime, step, preset) => stagger(localTime, index, startTime, step, preset),
    keys: (keyframes, easing) => keys(localTime, keyframes, easing),
    wave: (freq, amp, phase) => wave(localTime, freq, amp, phase),
    at: (startTime, fadeDuration) => at(localTime, startTime, fadeDuration),
    lerp,
    rand,
  };

  let runtimeError: string | null = null;
  if (compiledFn) {
    try {
      compiledFn(s, ctx);
    } catch (err) {
      runtimeError = err instanceof Error ? err.message : String(err);
    }
  }

  if (cameraApplied) {
    ctx.restore();
  }

  if (subtitles?.enabled && narration && narration.trim().length > 0) {
    renderSubtitleOverlay(
      ctx,
      width,
      height,
      narration.trim(),
      subtitles,
      localTime,
      sceneDuration
    );
  }

  ctx.restore();
  return runtimeError;
}

function renderSubtitleOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  subtitles: SubtitleSettings,
  localTime: number,
  sceneDuration: number
): void {
  const fontSize = subtitles.fontSize || 28;
  const maxWidth = width * 0.84;
  const animation = subtitles.animation || 'static';
  const progress = clamp(localTime / Math.max(0.8, sceneDuration * 0.82), 0, 1);

  const visibleText =
    animation === 'typewriter'
      ? text.slice(0, Math.max(1, Math.ceil(text.length * progress)))
      : text;

  ctx.save();
  ctx.font = `700 ${fontSize}px Outfit, DM Sans, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const words = visibleText.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  const lineHeight = fontSize * 1.32;
  const totalHeight = lines.length * lineHeight;
  const baseY = subtitles.position === 'lower-third' ? height * 0.78 : height * 0.86;
  const startY = baseY - totalHeight / 2 + lineHeight / 2;

  if (subtitles.style === 'boxed' || subtitles.style === 'ivory-capsule') {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const padX = 24;
    const padY = 14;
    ctx.beginPath();
    ctx.roundRect(
      width / 2 - widest / 2 - padX,
      baseY - totalHeight / 2 - padY,
      widest + padX * 2,
      totalHeight + padY * 2,
      subtitles.style === 'ivory-capsule' ? 20 : 12
    );
    if (subtitles.style === 'ivory-capsule') {
      ctx.fillStyle = 'rgba(250, 246, 236, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#C8B698';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(7, 10, 18, 0.78)';
      ctx.fill();
    }
  }

  const totalWords = text.split(/\s+/).filter(Boolean).length;
  const activeWordIdx = Math.min(totalWords - 1, Math.floor(progress * totalWords));
  let wordCounter = 0;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    if (animation === 'word-highlight') {
      const lineWords = line.split(/\s+/);
      const totalLineW = ctx.measureText(line).width;
      let cursorX = width / 2 - totalLineW / 2;
      ctx.textAlign = 'left';
      lineWords.forEach((w, wi) => {
        const isCurrent = wordCounter === activeWordIdx;
        const spaceW = wi < lineWords.length - 1 ? ctx.measureText(w + ' ').width : ctx.measureText(w).width;
        if (subtitles.style === 'clean') {
          ctx.lineWidth = 6;
          ctx.strokeStyle = 'rgba(5, 8, 16, 0.92)';
          ctx.lineJoin = 'round';
          ctx.strokeText(w, cursorX, y);
        }
        ctx.fillStyle = isCurrent
          ? subtitles.style === 'ivory-capsule'
            ? '#A6893A'
            : '#ffd166'
          : subtitles.style === 'ivory-capsule'
            ? '#2B2B2B'
            : '#ffffff';
        ctx.fillText(w, cursorX, y);
        cursorX += spaceW;
        wordCounter++;
      });
      ctx.textAlign = 'center';
    } else {
      if (subtitles.style === 'clean') {
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(5, 8, 16, 0.92)';
        ctx.lineJoin = 'round';
        ctx.strokeText(line, width / 2, y);
      }
      ctx.fillStyle = subtitles.style === 'ivory-capsule' ? '#2B2B2B' : '#ffffff';
      ctx.fillText(line, width / 2, y);
    }
  });

  ctx.restore();
}
