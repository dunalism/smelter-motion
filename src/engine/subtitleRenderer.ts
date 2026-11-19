import type {
  PalettePreset,
  SubtitleEasing,
  SubtitleSettings,
} from '../types/studio';
import { clamp, ease, lerp, rand, spring } from './motionMath';
import {
  extractAutoEmphasisKeywords,
  resolveSubtitleConfig,
  type ResolvedSubtitleConfig,
} from './subtitleConfig';

export interface SubtitleRenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  text: string;
  subtitles: SubtitleSettings;
  localTime: number;
  sceneDuration: number;
  emphasis?: string;
  palette?: PalettePreset;
}

/**
 * Finds character ranges [start, end] for emphasis words/phrases (comma-separated)
 * within a line of text, case-insensitively with word-boundary awareness.
 */
export function findEmphasisRanges(line: string, emphasis?: string): Array<[number, number]> {
  if (!emphasis || !emphasis.trim() || !line) return [];
  const needles = emphasis
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (needles.length === 0) return [];

  const haystack = line.toLowerCase();
  const ranges: Array<[number, number]> = [];

  for (const needle of needles) {
    let searchFrom = 0;
    let foundBoundary = false;
    while (searchFrom < haystack.length) {
      const idx = haystack.indexOf(needle, searchFrom);
      if (idx === -1) break;
      const end = idx + needle.length;
      const beforeChar = idx > 0 ? haystack[idx - 1] : ' ';
      const afterChar = end < haystack.length ? haystack[end] : ' ';
      if (!/[a-z0-9]/i.test(beforeChar) && !/[a-z0-9]/i.test(afterChar)) {
        ranges.push([idx, end]);
        foundBoundary = true;
      }
      searchFrom = end;
    }
    if (!foundBoundary) {
      const idx = haystack.indexOf(needle);
      if (idx !== -1) ranges.push([idx, idx + needle.length]);
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  return ranges;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
    }
  }
  return hex;
}

function applySubtitleEasing(u: number, easing: SubtitleEasing): number {
  const t = clamp(u, 0, 1);
  switch (easing) {
    case 'linear':
      return t;
    case 'easeInOut':
      return ease.inOut(t);
    case 'back':
      return ease.outBack(t);
    case 'spring':
      return spring(t * 0.65, 0, 'snappy');
    case 'bounce':
      return spring(t * 0.65, 0, 'bouncy');
    case 'easeOut':
    default:
      return ease.out(t);
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  } else {
    ctx.rect(x, y, w, h);
  }
}

interface WordToken {
  text: string;
  isEmphasis: boolean;
  globalIndex: number;
}

function buildLineTokens(
  lines: string[],
  effectiveEmphasis: string
): WordToken[][] {
  let globalIdx = 0;
  return lines.map((line) => {
    const ranges = findEmphasisRanges(line, effectiveEmphasis);
    const tokens: WordToken[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      const wStart = match.index;
      const wEnd = wStart + match[0].length;
      const isEmphasis = ranges.some(([rStart, rEnd]) => wStart < rEnd && wEnd > rStart);
      tokens.push({ text: match[0], isEmphasis, globalIndex: globalIdx++ });
    }
    return tokens;
  });
}

function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  layoutMode: 'standard' | 'split-editorial' | 'stacked-words'
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  if (layoutMode === 'stacked-words') {
    // Group 1-2 words per row for punchy vertical poster composition
    const rows: string[] = [];
    for (let i = 0; i < words.length; i += 2) {
      const pair = words.slice(i, i + 2).join(' ');
      if (ctx.measureText(pair).width > maxWidth && words[i + 1]) {
        rows.push(words[i], words[i + 1]);
      } else {
        rows.push(pair);
      }
    }
    return rows.slice(0, 4);
  }

  if (layoutMode === 'split-editorial' && words.length >= 4) {
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(' ');
    const l2 = words.slice(mid).join(' ');
    if (ctx.measureText(l1).width <= maxWidth && ctx.measureText(l2).width <= maxWidth) {
      return [l1, l2];
    }
  }

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
  return lines;
}

function drawContainerBackground(
  ctx: CanvasRenderingContext2D,
  cfg: ResolvedSubtitleConfig,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): void {
  const decor = cfg.styleDef.decorMode;
  if (cfg.bgOpacity <= 0 && decor !== 'sketch-box' && decor !== 'stamp' && decor !== 'cutout') {
    return;
  }

  ctx.save();
  if (decor === 'cutout') {
    ctx.fillStyle = '#0F172A';
    drawRoundedRect(ctx, boxX + 5, boxY + 6, boxW, boxH, cfg.borderRadius);
    ctx.fill();
    ctx.fillStyle = hexToRgba(cfg.bgColor, cfg.bgOpacity);
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cfg.borderRadius);
    ctx.fill();
    ctx.strokeStyle = cfg.styleDef.borderColor || '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (decor === 'sketch-box') {
    ctx.fillStyle = hexToRgba(cfg.bgColor, cfg.bgOpacity);
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cfg.borderRadius);
    ctx.fill();
    ctx.strokeStyle = cfg.styleDef.borderColor || '#334155';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(boxX - 2, boxY + 2, boxW + 3, boxH - 3);
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (decor === 'stamp') {
    ctx.fillStyle = hexToRgba(cfg.bgColor, cfg.bgOpacity);
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cfg.borderRadius);
    ctx.fill();
    ctx.strokeStyle = cfg.styleDef.borderColor || '#FCA5A5';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8);
    ctx.restore();
    return;
  }

  if (decor === 'floating-pill') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
  }

  ctx.fillStyle = hexToRgba(cfg.bgColor, cfg.bgOpacity);
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, cfg.borderRadius);
  ctx.fill();

  if (decor === 'capsule' || decor === 'floating-pill' || decor === 'glitch') {
    ctx.shadowBlur = 0;
    ctx.strokeStyle = cfg.styleDef.borderColor || '#C8B698';
    ctx.lineWidth = decor === 'capsule' ? 2 : 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function measureWordWithSpacing(
  ctx: CanvasRenderingContext2D,
  word: string,
  letterSpacing: number
): number {
  const base = ctx.measureText(word).width;
  if (!letterSpacing || word.length <= 1) return base;
  return base + letterSpacing * (word.length - 1);
}

function drawTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  mode: 'fill' | 'stroke'
): void {
  if (!letterSpacing || Math.abs(letterSpacing) < 0.05) {
    if (mode === 'stroke') ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  let cursor = x;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (mode === 'stroke') ctx.strokeText(ch, cursor, y);
    else ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + letterSpacing;
  }
}

export function renderSubtitleOverlay({
  ctx,
  width,
  height,
  text,
  subtitles,
  localTime,
  sceneDuration,
  emphasis,
  palette,
}: SubtitleRenderOptions): void {
  const rawTrimmed = text.trim();
  if (!rawTrimmed) return;

  const cfg = resolveSubtitleConfig(subtitles, palette);
  const transformedText =
    cfg.textTransform === 'uppercase'
      ? rawTrimmed.toUpperCase()
      : cfg.textTransform === 'lowercase'
        ? rawTrimmed.toLowerCase()
        : rawTrimmed;

  const effectiveEmphasis =
    emphasis && emphasis.trim()
      ? emphasis
      : cfg.autoHighlight
        ? extractAutoEmphasisKeywords(rawTrimmed, 2).join(', ')
        : '';

  const delay = Math.max(0, cfg.delay);
  const animTime = localTime - delay;
  if (animTime < 0) return;

  const dur = Math.max(0.12, cfg.duration);
  const rawEnter = cfg.entrance === 'static' ? 1 : clamp(animTime / dur, 0, 1);
  const enterProgress =
    cfg.entrance === 'static' ? 1 : applySubtitleEasing(rawEnter, cfg.easing);

  const exitDur = cfg.exit === 'none' ? 0 : Math.min(0.38, sceneDuration * 0.18);
  const exitStart = Math.max(delay + dur * 0.5, sceneDuration - exitDur);
  const exitProgress =
    exitDur > 0 && localTime > exitStart
      ? clamp((localTime - exitStart) / exitDur, 0, 1)
      : 0;
  const exitEase = ease.in(exitProgress);

  const speechProgress = clamp(
    animTime / Math.max(0.8, (sceneDuration - delay) * 0.82),
    0,
    1
  );

  const displaySource =
    cfg.entrance === 'typewriter'
      ? transformedText.slice(0, Math.max(1, Math.ceil(transformedText.length * speechProgress)))
      : cfg.entrance === 'letter-reveal'
        ? transformedText.slice(0, Math.max(1, Math.ceil(transformedText.length * clamp(rawEnter, 0, 1))))
        : transformedText;

  const maxWidth = clamp(
    width * (cfg.maxWidthPercent / 100),
    180,
    width - cfg.safeAreaMargin * 2
  );

  ctx.save();
  ctx.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
  ctx.textBaseline = 'middle';

  const lines = wrapTextToLines(ctx, displaySource, maxWidth, cfg.styleDef.layoutMode);
  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  const lineTokens = buildLineTokens(lines, effectiveEmphasis);
  const totalWords = Math.max(
    1,
    transformedText.split(/\s+/).filter(Boolean).length
  );
  const activeWordIdx = Math.min(
    totalWords - 1,
    Math.floor(speechProgress * totalWords)
  );

  const lineHeight = cfg.fontSize * cfg.lineHeight;
  const totalHeight = lines.length * lineHeight;
  const baseY = clamp(
    height * (cfg.verticalPercent / 100),
    cfg.safeAreaMargin + totalHeight / 2,
    height - cfg.safeAreaMargin - totalHeight / 2
  );
  const anchorX =
    cfg.horizontalAlign === 'left'
      ? cfg.safeAreaMargin + maxWidth / 2
      : cfg.horizontalAlign === 'right'
        ? width - cfg.safeAreaMargin - maxWidth / 2
        : width / 2;

  const intensity = cfg.intensity;
  let globalAlpha = 1;
  let offsetX = 0;
  let offsetY = 0;
  let scaleX = 1;
  let scaleY = 1;
  let rotateRad = cfg.styleDef.decorMode === 'stamp' ? -0.022 : 0;
  let blurPx = 0;

  switch (cfg.entrance) {
    case 'fade':
      globalAlpha *= rawEnter;
      break;
    case 'slide-up':
      globalAlpha *= clamp(rawEnter * 1.4, 0, 1);
      offsetY += lerp(28 * intensity, 0, enterProgress);
      break;
    case 'slide-down':
      globalAlpha *= clamp(rawEnter * 1.4, 0, 1);
      offsetY += lerp(-28 * intensity, 0, enterProgress);
      break;
    case 'slide-left':
      globalAlpha *= clamp(rawEnter * 1.4, 0, 1);
      offsetX += lerp(48 * intensity, 0, enterProgress);
      break;
    case 'slide-right':
      globalAlpha *= clamp(rawEnter * 1.4, 0, 1);
      offsetX += lerp(-48 * intensity, 0, enterProgress);
      break;
    case 'scale':
    case 'pop':
    case 'bounce':
    case 'elastic':
    case 'spring': {
      globalAlpha *= clamp(rawEnter * 1.6, 0, 1);
      const startScale = cfg.entrance === 'elastic' ? 0.68 : 0.82;
      const s = lerp(startScale, 1, enterProgress);
      scaleX *= s;
      scaleY *= s;
      break;
    }
    case 'rotate':
      globalAlpha *= clamp(rawEnter * 1.5, 0, 1);
      rotateRad += lerp(-0.08 * intensity, 0, enterProgress);
      scaleX *= lerp(0.9, 1, enterProgress);
      scaleY *= lerp(0.9, 1, enterProgress);
      break;
    case 'flip':
      globalAlpha *= clamp(rawEnter * 1.5, 0, 1);
      scaleY *= Math.max(0.08, enterProgress);
      break;
    case 'blur':
      globalAlpha *= rawEnter;
      blurPx = lerp(10 * intensity, 0, rawEnter);
      break;
    case 'glitch': {
      const glitchPhase = rawEnter < 1 ? 1 - rawEnter : 0;
      const f = Math.floor(localTime * 28);
      offsetX += (rand(f + 13) - 0.5) * 14 * glitchPhase * intensity;
      offsetY += (rand(f + 37) - 0.5) * 6 * glitchPhase * intensity;
      break;
    }
    default:
      break;
  }

  if (exitProgress > 0) {
    globalAlpha *= 1 - exitEase;
    if (cfg.exit === 'slide-down') offsetY += lerp(0, 22, exitEase);
    else if (cfg.exit === 'slide-up') offsetY += lerp(0, -22, exitEase);
    else if (cfg.exit === 'scale') {
      const es = lerp(1, 0.88, exitEase);
      scaleX *= es;
      scaleY *= es;
    } else if (cfg.exit === 'blur') {
      blurPx = Math.max(blurPx, lerp(0, 10, exitEase));
    }
  }

  if (globalAlpha <= 0.01) {
    ctx.restore();
    return;
  }

  ctx.globalAlpha = clamp(globalAlpha, 0, 1);
  ctx.translate(anchorX + offsetX, baseY + offsetY);
  if (rotateRad !== 0) ctx.rotate(rotateRad);
  if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
  if (blurPx > 0.2 && typeof ctx.filter === 'string') {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
  }

  const effectiveTracking =
    cfg.entrance === 'tracking-reveal'
      ? cfg.letterSpacing + lerp(8 * intensity, 0, enterProgress)
      : cfg.letterSpacing;

  const lineWidths = lines.map((l) =>
    measureWordWithSpacing(ctx, l, effectiveTracking)
  );
  const widest = Math.max(...lineWidths, 40);
  const boxW = widest + cfg.paddingX * 2;
  const boxH = totalHeight + cfg.paddingY * 2;

  if (cfg.entrance === 'mask-reveal' && rawEnter < 1) {
    if (typeof ctx.clip === 'function') {
      ctx.beginPath();
      const maskH = boxH * enterProgress;
      ctx.rect(-boxW / 2 - 20, boxH / 2 - maskH, boxW + 40, maskH + 8);
      ctx.clip();
    }
  }

  drawContainerBackground(ctx, cfg, -boxW / 2, -boxH / 2, boxW, boxH);
  const startY = -totalHeight / 2 + lineHeight / 2;

  lineTokens.forEach((tokens, lineIdx) => {
    const lineY = startY + lineIdx * lineHeight;
    const isSplitTop = cfg.styleDef.layoutMode === 'split-editorial' && lineIdx === 0;
    const lineScale = isSplitTop ? 0.82 : 1;
    const lineAlpha =
      cfg.entrance === 'line-reveal'
        ? clamp((rawEnter * lines.length - lineIdx) * 1.4, 0, 1)
        : 1;

    if (lineAlpha <= 0.01) return;

    ctx.save();
    ctx.globalAlpha *= lineAlpha;
    if (lineScale !== 1) ctx.scale(lineScale, lineScale);

    const spaceW = ctx.measureText(' ').width + effectiveTracking;
    const wordWidths = tokens.map((t) => {
      const fontWeight =
        t.isEmphasis && cfg.emphasisStyle === 'bold'
          ? Math.min(900, cfg.fontWeight + 200)
          : cfg.fontWeight;
      const fontFam =
        t.isEmphasis && cfg.emphasisStyle === 'font'
          ? '"Playfair Display", Georgia, serif'
          : cfg.fontFamily;
      ctx.font = `${fontWeight} ${cfg.fontSize}px ${fontFam}`;
      return measureWordWithSpacing(ctx, t.text, effectiveTracking);
    });

    const totalLineW =
      wordWidths.reduce((a, b) => a + b, 0) +
      Math.max(0, tokens.length - 1) * spaceW;

    let cursorX =
      cfg.textAlign === 'left'
        ? -widest / 2
        : cfg.textAlign === 'right'
          ? widest / 2 - totalLineW
          : -totalLineW / 2;

    const needsWordPass =
      effectiveTracking !== 0 ||
      cfg.entrance === 'word-stagger' ||
      cfg.entrance === 'word-highlight' ||
      cfg.entrance === 'highlight-sweep' ||
      cfg.styleDef.decorMode === 'focus-word' ||
      cfg.styleDef.decorMode === 'dynamic-capsule' ||
      cfg.styleDef.decorMode === 'minimal-underline' ||
      cfg.styleDef.decorMode === 'scribble-underline' ||
      cfg.styleDef.decorMode === 'marker' ||
      cfg.styleDef.decorMode === 'gradient' ||
      cfg.styleDef.decorMode === 'shadow-depth' ||
      cfg.styleDef.decorMode === 'glitch' ||
      tokens.some((t) => t.isEmphasis);

    if (!needsWordPass) {
      const lineText = lines[lineIdx];
      ctx.font = `${isSplitTop ? 500 : cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
      ctx.textAlign = cfg.textAlign;
      const drawX =
        cfg.textAlign === 'left'
          ? -widest / 2
          : cfg.textAlign === 'right'
            ? widest / 2
            : 0;
      if (cfg.outlineWidth > 0) {
        ctx.lineWidth = cfg.outlineWidth;
        ctx.strokeStyle = cfg.outlineColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(lineText, drawX, lineY);
      }
      if (cfg.textShadow > 0) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = cfg.textShadow;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = cfg.textColor;
      ctx.fillText(lineText, drawX, lineY);
      ctx.restore();
      return;
    }

    tokens.forEach((token, wi) => {
      const wW = wordWidths[wi];
      const wCenterX = cursorX + wW / 2;
      const isCurrent = token.globalIndex === activeWordIdx;

      let wordAlpha = 1;
      let wordY = 0;
      let wordScale = 1;
      if (cfg.entrance === 'word-stagger') {
        const wProg = clamp(
          rawEnter * Math.max(2, totalWords) - token.globalIndex * 0.65,
          0,
          1
        );
        const wEase = applySubtitleEasing(wProg, cfg.easing);
        wordAlpha = wProg;
        wordY = lerp(14 * intensity, 0, wEase);
      }

      if (token.isEmphasis) {
        if (cfg.emphasisStyle === 'scale') wordScale = cfg.emphasisScale;
        else if (cfg.emphasisStyle === 'pop') {
          const popT = clamp(animTime * 2.2 - token.globalIndex * 0.08, 0, 1);
          wordScale = lerp(1, cfg.emphasisScale, ease.outBack(popT));
        }
      }

      if (cfg.styleDef.decorMode === 'focus-word' && !isCurrent && !token.isEmphasis) {
        wordAlpha *= 0.45;
      }

      ctx.save();
      ctx.globalAlpha *= wordAlpha;
      ctx.translate(wCenterX, lineY + wordY);
      if (wordScale !== 1) ctx.scale(wordScale, wordScale);

      const fontWeight =
        token.isEmphasis && (cfg.emphasisStyle === 'bold' || cfg.emphasisStyle === 'scale')
          ? Math.min(900, cfg.fontWeight + 200)
          : isSplitTop
            ? 500
            : cfg.fontWeight;
      const fontFam =
        token.isEmphasis && cfg.emphasisStyle === 'font'
          ? '"Playfair Display", Georgia, serif'
          : cfg.fontFamily;
      ctx.font = `${fontWeight} ${cfg.fontSize}px ${fontFam}`;
      ctx.textAlign = 'left';

      const showDynamicPill =
        cfg.styleDef.decorMode === 'dynamic-capsule' && isCurrent;
      const showEmphasisBg =
        token.isEmphasis && cfg.emphasisStyle === 'bg-highlight';
      if (showDynamicPill || showEmphasisBg) {
        ctx.save();
        ctx.fillStyle = showEmphasisBg ? cfg.emphasisColor : cfg.highlightColor;
        drawRoundedRect(
          ctx,
          -wW / 2 - 8,
          -cfg.fontSize * 0.62,
          wW + 16,
          cfg.fontSize * 1.24,
          8
        );
        ctx.fill();
        ctx.restore();
      }

      if (
        (token.isEmphasis && cfg.emphasisStyle === 'marker') ||
        (cfg.styleDef.decorMode === 'marker' && (token.isEmphasis || isCurrent))
      ) {
        const drawProg =
          cfg.entrance === 'marker-draw' ? clamp(rawEnter * 1.3, 0, 1) : 1;
        ctx.save();
        ctx.rotate(-0.025);
        ctx.fillStyle = hexToRgba(cfg.emphasisColor, 0.78);
        ctx.fillRect(
          -wW / 2 - 5,
          -cfg.fontSize * 0.42,
          (wW + 10) * drawProg,
          cfg.fontSize * 0.88
        );
        ctx.restore();
      }

      if (cfg.styleDef.decorMode === 'shadow-depth') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        drawTextWithSpacing(ctx, token.text, -wW / 2 + 4, 4, effectiveTracking, 'fill');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        drawTextWithSpacing(ctx, token.text, -wW / 2 + 7, 7, effectiveTracking, 'fill');
      }

      if (cfg.styleDef.decorMode === 'glitch') {
        ctx.save();
        ctx.globalAlpha *= 0.65;
        ctx.fillStyle = '#29E7FF';
        drawTextWithSpacing(ctx, token.text, -wW / 2 - 2, 0, effectiveTracking, 'fill');
        ctx.fillStyle = '#FF3FD1';
        drawTextWithSpacing(ctx, token.text, -wW / 2 + 2, 0, effectiveTracking, 'fill');
        ctx.restore();
      }

      if (cfg.outlineWidth > 0) {
        ctx.lineWidth = cfg.outlineWidth;
        ctx.strokeStyle = cfg.outlineColor;
        ctx.lineJoin = 'round';
        drawTextWithSpacing(ctx, token.text, -wW / 2, 0, effectiveTracking, 'stroke');
      }

      if (token.isEmphasis && cfg.emphasisStyle === 'glow') {
        ctx.shadowColor = cfg.emphasisColor;
        ctx.shadowBlur = 16;
      } else if (cfg.textShadow > 0) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = cfg.textShadow;
        ctx.shadowOffsetY = 2;
      }

      let fillStyle: string | CanvasGradient = cfg.textColor;
      if (
        cfg.styleDef.decorMode === 'gradient' &&
        cfg.styleDef.gradientColors &&
        typeof ctx.createLinearGradient === 'function'
      ) {
        const grad = ctx.createLinearGradient(-wW / 2, 0, wW / 2, 0);
        grad.addColorStop(0, cfg.styleDef.gradientColors[0]);
        grad.addColorStop(1, cfg.styleDef.gradientColors[1]);
        fillStyle = grad;
      }
      if (
        (cfg.entrance === 'word-highlight' || cfg.entrance === 'highlight-sweep') &&
        isCurrent &&
        !showDynamicPill
      ) {
        fillStyle = cfg.highlightColor;
      }
      if (
        token.isEmphasis &&
        (cfg.emphasisStyle === 'color' ||
          cfg.emphasisStyle === 'accent' ||
          cfg.emphasisStyle === 'glow' ||
          cfg.emphasisStyle === 'pop')
      ) {
        fillStyle = cfg.emphasisColor;
      } else if (showDynamicPill || showEmphasisBg) {
        fillStyle = '#070A12';
      }

      ctx.fillStyle = fillStyle;
      drawTextWithSpacing(ctx, token.text, -wW / 2, 0, effectiveTracking, 'fill');

      const drawUnderline =
        (token.isEmphasis && cfg.emphasisStyle === 'underline') ||
        (cfg.styleDef.decorMode === 'minimal-underline' && (token.isEmphasis || isCurrent)) ||
        (cfg.styleDef.decorMode === 'scribble-underline' && (token.isEmphasis || isCurrent));

      if (drawUnderline) {
        const uProg =
          cfg.entrance === 'underline-draw' ? clamp(rawEnter * 1.25, 0, 1) : 1;
        const uY = cfg.fontSize * 0.54;
        const uWidth = Math.max(2.5, Math.round(cfg.fontSize * 0.095));
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = cfg.emphasisColor;
        ctx.lineWidth = uWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        if (cfg.styleDef.decorMode === 'scribble-underline') {
          const steps = 6;
          const segW = (wW * uProg) / steps;
          ctx.moveTo(-wW / 2, uY);
          for (let s = 1; s <= steps; s++) {
            const sx = -wW / 2 + s * segW;
            const sy = uY + (s % 2 === 0 ? -2.2 : 2.2);
            ctx.lineTo(sx, sy);
          }
        } else {
          ctx.moveTo(-wW / 2, uY);
          ctx.lineTo(-wW / 2 + wW * uProg, uY);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
      cursorX += wW + spaceW;
    });

    ctx.restore();
  });

  ctx.restore();
}

export function renderSubtitlePreviewFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  subtitles: SubtitleSettings,
  localTime: number,
  sceneDuration: number,
  emphasis?: string,
  palette?: PalettePreset
): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = palette?.bg || '#0B101B';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = palette?.isLight ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.08)';
  ctx.lineWidth = 1;
  const step = 48;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = step; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(20, 20, width - 40, height - 40);
  ctx.setLineDash([]);

  renderSubtitleOverlay({
    ctx,
    width,
    height,
    text,
    subtitles,
    localTime,
    sceneDuration,
    emphasis,
    palette,
  });
  ctx.restore();
}
