import type {
  PalettePreset,
  SubtitleSettings,
} from '../types/studio';
import { clamp, ease, lerp, rand } from './motionMath';
import {
  extractAutoEmphasisKeywords,
  resolveSubtitleConfig,
  type ResolvedSubtitleConfig,
} from './subtitleConfig';
import { getWordTimings, type WordTiming } from './wordTiming';

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
  audioDataUrl?: string;
  audioDurationSec?: number;
}

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

interface PositionedWord {
  word: string;
  globalIndex: number;
  isEmphasis: boolean;
  timing: WordTiming;
  width: number;
  x: number; // left X relative to anchorX
  y: number; // center Y of line
  lineIndex: number;
}

interface WrappedLine {
  lineIndex: number;
  y: number;
  totalWidth: number;
  words: PositionedWord[];
}

function wrapWordsToLines(
  ctx: CanvasRenderingContext2D,
  timings: WordTiming[],
  transformedWords: string[],
  emphasisStr: string,
  maxWidth: number,
  lineHeight: number,
  baseY: number
): { lines: WrappedLine[]; widest: number } {
  const fullJoined = transformedWords.join(' ');
  const empRanges = findEmphasisRanges(fullJoined, emphasisStr);

  // Map each word index to its char range in fullJoined
  const isWordEmphasis: boolean[] = [];
  let charPos = 0;
  for (let i = 0; i < transformedWords.length; i++) {
    const w = transformedWords[i];
    const start = charPos;
    const end = charPos + w.length;
    const hit = empRanges.some(([rs, re]) => start < re && end > rs);
    isWordEmphasis.push(hit);
    charPos = end + 1;
  }

  const spaceW = ctx.measureText(' ').width;
  const rawLines: Array<{ indices: number[]; widths: number[]; totalW: number }> = [];
  let curIndices: number[] = [];
  let curWidths: number[] = [];
  let curW = 0;

  for (let i = 0; i < transformedWords.length; i++) {
    const wW = ctx.measureText(transformedWords[i]).width;
    const nextW = curIndices.length === 0 ? wW : curW + spaceW + wW;
    if (curIndices.length > 0 && nextW > maxWidth) {
      rawLines.push({ indices: curIndices, widths: curWidths, totalW: curW });
      curIndices = [i];
      curWidths = [wW];
      curW = wW;
    } else {
      curIndices.push(i);
      curWidths.push(wW);
      curW = nextW;
    }
  }
  if (curIndices.length > 0) {
    rawLines.push({ indices: curIndices, widths: curWidths, totalW: curW });
  }

  const totalH = rawLines.length * lineHeight;
  const lines: WrappedLine[] = [];
  let widest = 0;

  rawLines.forEach((rl, lineIdx) => {
    widest = Math.max(widest, rl.totalW);
    const lineY = baseY - totalH / 2 + lineIdx * lineHeight + lineHeight / 2;
    let cursorX = -rl.totalW / 2;
    const words: PositionedWord[] = rl.indices.map((gi, wi) => {
      const wW = rl.widths[wi];
      const pw: PositionedWord = {
        word: transformedWords[gi],
        globalIndex: gi,
        isEmphasis: isWordEmphasis[gi],
        timing: timings[gi],
        width: wW,
        x: cursorX,
        y: lineY,
        lineIndex: lineIdx,
      };
      cursorX += wW + spaceW;
      return pw;
    });
    lines.push({ lineIndex: lineIdx, y: lineY, totalWidth: rl.totalW, words });
  });

  return { lines, widest };
}

function getWordProgress(t: number, timing: WordTiming): {
  isRevealed: boolean;
  isActive: boolean;
  hasSpoken: boolean;
  progress: number;
  elapsed: number;
  wordDur: number;
} {
  const wordDur = Math.max(0.06, timing.endSec - timing.startSec);
  const elapsed = t - timing.startSec;
  const isRevealed = elapsed >= 0;
  const hasSpoken = t >= timing.endSec;
  const isActive = isRevealed && !hasSpoken;
  const progress = clamp(elapsed / wordDur, 0, 1);
  return { isRevealed, isActive, hasSpoken, progress, elapsed, wordDur };
}

function findActiveWordIndex(timings: WordTiming[], t: number): number {
  if (timings.length === 0) return 0;
  for (let i = 0; i < timings.length; i++) {
    if (t >= timings[i].startSec && t < timings[i].endSec) {
      return i;
    }
    if (i < timings.length - 1 && t >= timings[i].endSec && t < timings[i + 1].startSec) {
      // During a pause between words, stay on the word just spoken
      return i;
    }
  }
  if (t < timings[0].startSec) return -1;
  return timings.length - 1;
}

function drawHandwrittenScribble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  color: string,
  progress: number
): void {
  if (progress <= 0.02) return;
  const drawW = w * clamp(progress, 0, 1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const steps = Math.max(4, Math.floor(drawW / 7));
  for (let i = 0; i <= steps; i++) {
    const px = x + (drawW * i) / steps;
    const py = y + Math.sin(i * 1.45) * 1.9 + (i % 2 === 0 ? 0.6 : -0.5);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawInkCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  progress: number
): void {
  if (progress <= 0.02) return;
  const endAngle = -Math.PI * 0.65 + Math.PI * 2.15 * clamp(progress, 0, 1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const steps = 28;
  for (let i = 0; i <= steps; i++) {
    const a = lerp(-Math.PI * 0.65, endAngle, i / steps);
    const wobble = 1 + Math.sin(a * 3) * 0.04;
    const px = cx + Math.cos(a) * rx * wobble;
    const py = cy + Math.sin(a) * ry * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawYellowHighlighter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  progress: number
): void {
  if (progress <= 0.02) return;
  const drawW = w * clamp(progress, 0, 1);
  ctx.save();
  ctx.fillStyle = hexToRgba(color, 0.85);
  ctx.translate(x, y);
  ctx.rotate(-0.015);
  drawRoundedRect(ctx, -3, -h * 0.45, drawW + 6, h * 0.9, 4);
  ctx.fill();
  ctx.restore();
}

function drawSubtitleText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fillColor: string,
  options?: {
    outlineColor?: string;
    outlineWidth?: number;
    shadowBlur?: number;
    shadowColor?: string;
    align?: CanvasTextAlign;
  }
): void {
  ctx.save();
  ctx.textAlign = options?.align ?? 'left';
  if (options?.outlineWidth && options.outlineWidth > 0) {
    ctx.lineWidth = options.outlineWidth;
    ctx.strokeStyle = options.outlineColor || 'rgba(0,0,0,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  if (options?.shadowBlur && options.shadowBlur > 0) {
    ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = options.shadowBlur;
    ctx.shadowOffsetY = 2;
  }
  ctx.fillStyle = fillColor;
  ctx.fillText(text, x, y);
  ctx.restore();
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
  audioDataUrl,
  audioDurationSec,
}: SubtitleRenderOptions): void {
  const rawTrimmed = text.trim();
  if (!rawTrimmed) return;

  const cfg: ResolvedSubtitleConfig = resolveSubtitleConfig(subtitles, palette);
  const styleId = cfg.styleDef.id;

  const transformedText =
    cfg.styleDef.textTransform === 'uppercase'
      ? rawTrimmed.toUpperCase()
      : rawTrimmed;

  const rawWords = transformedText.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return;

  const timings = getWordTimings(
    rawTrimmed,
    sceneDuration,
    audioDataUrl,
    audioDurationSec
  );
  if (timings.length === 0) return;

  const effectiveEmphasis =
    emphasis && emphasis.trim()
      ? emphasis
      : extractAutoEmphasisKeywords(rawTrimmed, 2).join(', ');

  const effectiveFontSize =
    styleId === 'tulisan_tangan'
      ? Math.round(cfg.fontSize * 0.88)
      : styleId === 'pop_tebal'
        ? Math.round(cfg.fontSize * 1.18)
        : styleId === 'satu_kata'
          ? Math.round(cfg.fontSize * 1.65)
          : cfg.fontSize;

  const fontStylePrefix = cfg.styleDef.fontStyle === 'italic' ? 'italic ' : '';
  const baseFont = `${fontStylePrefix}${cfg.styleDef.fontWeight} ${effectiveFontSize}px ${cfg.styleDef.fontFamily}`;
  const lineHeight = effectiveFontSize * 1.32;
  const maxWidth = clamp(width * 0.84, 180, width - 56);
  const anchorX = width / 2;

  const activeIdx = findActiveWordIndex(timings, localTime);

  // Special layout: "satu_kata" — single big word in center, swaps with voice
  if (styleId === 'satu_kata') {
    const idx = activeIdx < 0 ? 0 : activeIdx;
    const timing = timings[idx];
    const wp = getWordProgress(localTime, timing);
    if (localTime < timings[0].startSec && timings[0].startSec > 0.08) return;

    const wordText = rawWords[idx] || '';
    const empRanges = findEmphasisRanges(transformedText, effectiveEmphasis);
    const fullJoined = rawWords.join(' ');
    let startChar = 0;
    for (let i = 0; i < idx; i++) startChar += rawWords[i].length + 1;
    const endChar = startChar + wordText.length;
    const isEmp = empRanges.some(([rs, re]) => startChar < re && endChar > rs);

    const popT = clamp(wp.elapsed / Math.min(0.22, wp.wordDur * 0.65), 0, 1);
    const scale = lerp(0.84, 1, ease.outBack(popT));
    const centerY = height * (cfg.verticalPercent / 100);

    ctx.save();
    ctx.translate(anchorX, centerY);
    ctx.scale(scale, scale);
    ctx.font = baseFont;
    ctx.textBaseline = 'middle';
    drawSubtitleText(ctx, wordText, 0, 0, isEmp ? cfg.accentColor : cfg.textColor, {
      align: 'center',
      outlineWidth: 6,
      outlineColor: 'rgba(6, 9, 19, 0.92)',
      shadowBlur: 16,
      shadowColor: 'rgba(0, 0, 0, 0.7)',
    });
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.font = baseFont;
  ctx.textBaseline = 'middle';

  const baseY = clamp(
    height * (cfg.verticalPercent / 100),
    effectiveFontSize * 1.5 + 24,
    height - effectiveFontSize * 1.5 - 24
  );

  const { lines, widest } = wrapWordsToLines(
    ctx,
    timings,
    rawWords,
    effectiveEmphasis,
    maxWidth,
    lineHeight,
    baseY
  );
  if (lines.length === 0) {
    ctx.restore();
    return;
  }

  ctx.translate(anchorX, 0);

  const totalH = lines.length * lineHeight;
  const padX = 22;
  const padY = 12;
  const boxX = -widest / 2 - padX;
  const boxY = baseY - totalH / 2 - padY;
  const boxW = widest + padX * 2;
  const boxH = totalH + padY * 2;

  // Panel backgrounds for board/card styles
  if (styleId === 'kotak_gelap') {
    ctx.save();
    ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  } else if (styleId === 'neon') {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 11, 20, 0.88)';
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.shadowColor = cfg.accentColor;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = cfg.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else if (styleId === 'kartu_selotip') {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#FBF5E6';
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#D6C7A9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Yellow masking tape at top edge
    ctx.translate(0, boxY);
    ctx.rotate(-0.03);
    ctx.fillStyle = 'rgba(253, 224, 71, 0.82)';
    ctx.fillRect(-38, -9, 76, 18);
    ctx.restore();
  } else if (styleId === 'stiker_kertas') {
    lines.forEach((line, li) => {
      const lw = line.totalWidth + 28;
      const lh = effectiveFontSize * 1.24;
      const tilt = li % 2 === 0 ? -0.014 : 0.012;
      ctx.save();
      ctx.translate(0, line.y);
      ctx.rotate(tilt);
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#FAF6EC';
      drawRoundedRect(ctx, -lw / 2, -lh / 2, lw, lh, 4);
      ctx.fill();
      ctx.restore();
    });
  } else if (styleId === 'sorot_kata' && activeIdx >= 0) {
    // Smooth sliding orange/accent marker pill behind active word
    const allWords = lines.flatMap((l) => l.words);
    const curW = allWords[activeIdx];
    const prevW = activeIdx > 0 ? allWords[activeIdx - 1] : curW;
    if (curW && prevW) {
      const wp = getWordProgress(localTime, curW.timing);
      const slideT = ease.out(clamp(wp.elapsed / Math.min(0.18, wp.wordDur * 0.55), 0, 1));
      const sameLine = curW.lineIndex === prevW.lineIndex;
      const pillX = (sameLine ? lerp(prevW.x, curW.x, slideT) : curW.x) - 8;
      const pillW = (sameLine ? lerp(prevW.width, curW.width, slideT) : curW.width) + 16;
      const pillY = (sameLine ? curW.y : lerp(prevW.y, curW.y, slideT)) - effectiveFontSize * 0.62;
      const pillH = effectiveFontSize * 1.24;
      ctx.save();
      ctx.fillStyle = cfg.accentColor;
      drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
      ctx.fill();
      ctx.restore();
    }
  }

  // Render each word according to its style & audio-aligned WordTiming
  for (const line of lines) {
    const lineTilt =
      styleId === 'stiker_kertas' ? (line.lineIndex % 2 === 0 ? -0.014 : 0.012) : 0;

    for (const tok of line.words) {
      const wp = getWordProgress(localTime, tok.timing);
      const isCurrent = tok.globalIndex === activeIdx;

      const appearOneByOne =
        styleId === 'tulisan_tangan' ||
        styleId === 'mesin_ketik' ||
        styleId === 'pop_tebal' ||
        styleId === 'kotak_putih' ||
        styleId === 'panduan_atas' ||
        styleId === 'elegan_atas';

      if (appearOneByOne && !wp.isRevealed) {
        continue;
      }

      ctx.save();
      if (lineTilt !== 0) {
        ctx.translate(0, line.y);
        ctx.rotate(lineTilt);
        ctx.translate(tok.x, 0);
      } else {
        ctx.translate(tok.x, line.y);
      }

      let wordWeight = cfg.styleDef.fontWeight;
      if (styleId === 'panduan_atas' && isCurrent) wordWeight = 800;
      else if (styleId === 'elegan_atas' && tok.isEmphasis) wordWeight = 700;
      else if (styleId === 'garis_bawah' && tok.isEmphasis) wordWeight = 900;
      ctx.font = `${fontStylePrefix}${wordWeight} ${effectiveFontSize}px ${cfg.styleDef.fontFamily}`;

      // 1. TULISAN TANGAN: pen write clip + scribble underline on keyword
      if (styleId === 'tulisan_tangan') {
        const writeFrac = wp.hasSpoken ? 1 : clamp(wp.progress * 1.05, 0.08, 1);
        ctx.save();
        ctx.beginPath();
        ctx.rect(-4, -effectiveFontSize, tok.width * writeFrac + 8, effectiveFontSize * 2);
        ctx.clip();
        drawSubtitleText(ctx, tok.word, 0, 0, cfg.textColor, {
          shadowBlur: 6,
          shadowColor: 'rgba(0,0,0,0.75)',
        });
        ctx.restore();
        if (tok.isEmphasis) {
          drawHandwrittenScribble(
            ctx,
            0,
            effectiveFontSize * 0.48,
            tok.width,
            cfg.accentColor,
            writeFrac
          );
        }
        ctx.restore();
        continue;
      }

      // 2. MESIN KETIK: char-by-char synced to wordProgress + blinking cursor
      if (styleId === 'mesin_ketik') {
        const charCount = wp.hasSpoken
          ? tok.word.length
          : Math.max(1, Math.ceil(tok.word.length * wp.progress));
        const shown = tok.word.slice(0, charCount);
        drawSubtitleText(ctx, shown, 0, 0, cfg.textColor, {
          outlineWidth: 3.5,
          outlineColor: 'rgba(6,9,19,0.85)',
        });
        if (isCurrent && Math.floor(localTime * 3.5) % 2 === 0) {
          const caretX = ctx.measureText(shown).width + 2;
          ctx.fillStyle = cfg.accentColor;
          ctx.fillRect(caretX, -effectiveFontSize * 0.45, 3, effectiveFontSize * 0.9);
        }
        ctx.restore();
        continue;
      }

      // 3. POP TEBAL: punchy pop per word
      if (styleId === 'pop_tebal') {
        const popT = clamp(wp.elapsed / Math.min(0.24, wp.wordDur * 0.65), 0, 1);
        const sc = lerp(0.55, 1, ease.outBack(popT));
        ctx.translate(tok.width / 2, 0);
        ctx.scale(sc, sc);
        ctx.translate(-tok.width / 2, 0);
        const col = isCurrent || tok.isEmphasis ? cfg.accentColor : cfg.textColor;
        drawSubtitleText(ctx, tok.word, 0, 0, col, {
          outlineWidth: 6,
          outlineColor: 'rgba(6,9,19,0.94)',
          shadowBlur: 12,
        });
        ctx.restore();
        continue;
      }

      // 4. KOTAK PUTIH (TikTok style): white box grows per word, black text
      if (styleId === 'kotak_putih') {
        const growT = clamp(wp.elapsed / Math.min(0.2, wp.wordDur * 0.6), 0, 1);
        const sc = lerp(0.75, 1, ease.outBack(growT));
        ctx.translate(tok.width / 2, 0);
        ctx.scale(sc, sc);
        ctx.translate(-tok.width / 2, 0);
        ctx.fillStyle = '#FFFFFF';
        drawRoundedRect(
          ctx,
          -6,
          -effectiveFontSize * 0.58,
          tok.width + 12,
          effectiveFontSize * 1.16,
          7
        );
        ctx.fill();
        drawSubtitleText(
          ctx,
          tok.word,
          0,
          0,
          tok.isEmphasis ? cfg.accentColor : cfg.textColor
        );
        ctx.restore();
        continue;
      }

      // 5. KARAOKE: dim full sentence, fills smoothly left-to-right per word
      if (styleId === 'karaoke') {
        drawSubtitleText(ctx, tok.word, 0, 0, hexToRgba(cfg.textColor, 0.34), {
          outlineWidth: 4,
          outlineColor: 'rgba(0,0,0,0.65)',
        });
        const fillFrac = wp.hasSpoken ? 1 : wp.isActive ? wp.progress : 0;
        if (fillFrac > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(-2, -effectiveFontSize, (tok.width + 4) * fillFrac, effectiveFontSize * 2);
          ctx.clip();
          drawSubtitleText(
            ctx,
            tok.word,
            0,
            0,
            tok.isEmphasis ? cfg.accentColor : cfg.textColor,
            {
              outlineWidth: 4,
              outlineColor: 'rgba(0,0,0,0.85)',
            }
          );
          ctx.restore();
        }
        ctx.restore();
        continue;
      }

      // 6. KOTAK GELAP: muted before spoken, bright white when spoken/active, accent on keyword
      if (styleId === 'kotak_gelap') {
        const col = tok.isEmphasis
          ? wp.isRevealed
            ? cfg.accentColor
            : hexToRgba(cfg.accentColor, 0.45)
          : wp.isRevealed
            ? cfg.textColor
            : 'rgba(226, 232, 240, 0.36)';
        drawSubtitleText(ctx, tok.word, 0, 0, col);
        ctx.restore();
        continue;
      }

      // 7. GLITCH: cyan & magenta vibrating shadows when word appears
      if (styleId === 'glitch') {
        const isGlitching = wp.isRevealed && wp.elapsed < 0.24;
        const jx = isGlitching ? (rand(Math.floor(localTime * 45) + tok.globalIndex * 7) - 0.5) * 8 : 1.5;
        const jy = isGlitching ? (rand(Math.floor(localTime * 45) + tok.globalIndex * 13) - 0.5) * 4 : 0;
        ctx.globalAlpha *= wp.isRevealed ? 1 : 0.35;
        ctx.fillStyle = '#22D3EE';
        ctx.fillText(tok.word, -2.5 - jx, -jy);
        ctx.fillStyle = '#F43F5E';
        ctx.fillText(tok.word, 2.5 + jx, jy);
        drawSubtitleText(ctx, tok.word, 0, 0, cfg.textColor, {
          outlineWidth: 2,
          outlineColor: 'rgba(0,0,0,0.7)',
        });
        ctx.restore();
        continue;
      }

      // 8. PANDUAN ATAS: top screen, words appear 1 by 1, current bold white, keyword yellow box
      if (styleId === 'panduan_atas') {
        if (tok.isEmphasis) {
          ctx.strokeStyle = cfg.accentColor;
          ctx.lineWidth = 2;
          drawRoundedRect(
            ctx,
            -5,
            -effectiveFontSize * 0.56,
            tok.width + 10,
            effectiveFontSize * 1.12,
            6
          );
          ctx.stroke();
        }
        const col = isCurrent ? '#FFFFFF' : 'rgba(241, 245, 249, 0.72)';
        drawSubtitleText(ctx, tok.word, 0, 0, col, {
          outlineWidth: 3.5,
          outlineColor: 'rgba(0,0,0,0.8)',
        });
        ctx.restore();
        continue;
      }

      // 9. ELEGAN ATAS: top screen, thin italic serif, keyword bold, slow gentle fade
      if (styleId === 'elegan_atas') {
        const fadeT = clamp(wp.elapsed / Math.min(0.45, wp.wordDur * 0.85), 0, 1);
        ctx.globalAlpha *= ease.out(fadeT);
        drawSubtitleText(
          ctx,
          tok.word,
          0,
          0,
          tok.isEmphasis ? cfg.accentColor : cfg.textColor,
          { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.85)' }
        );
        ctx.restore();
        continue;
      }

      // 10. NEON: dark board, glowing words with brief flicker on appear
      if (styleId === 'neon') {
        let flicker = 1;
        if (wp.isRevealed && wp.elapsed < 0.2) {
          flicker = Math.floor(wp.elapsed * 32) % 2 === 0 ? 0.45 : 1;
        }
        ctx.globalAlpha *= wp.isRevealed ? flicker : 0.28;
        const glowColor = tok.isEmphasis ? '#F472B6' : cfg.accentColor;
        drawSubtitleText(ctx, tok.word, 0, 0, wp.isRevealed ? '#FFFFFF' : '#94A3B8', {
          shadowBlur: wp.isRevealed ? 16 : 0,
          shadowColor: glowColor,
        });
        ctx.restore();
        continue;
      }

      // 11. KARTU SELOTIP: cream card with yellow tape, keyword highlighted yellow
      if (styleId === 'kartu_selotip') {
        if (tok.isEmphasis) {
          const prog = wp.isRevealed ? clamp(wp.progress * 1.4, 0.2, 1) : 0.25;
          drawYellowHighlighter(
            ctx,
            0,
            0,
            tok.width,
            effectiveFontSize * 1.05,
            cfg.accentColor,
            prog
          );
        }
        ctx.globalAlpha *= wp.isRevealed ? 1 : 0.55;
        drawSubtitleText(ctx, tok.word, 0, 0, cfg.textColor);
        ctx.restore();
        continue;
      }

      // 12. STIKER KERTAS: paper strip per line, keyword circled in ink
      if (styleId === 'stiker_kertas') {
        ctx.globalAlpha *= wp.isRevealed ? 1 : 0.6;
        drawSubtitleText(ctx, tok.word, 0, 0, cfg.textColor);
        if (tok.isEmphasis) {
          const prog = wp.isRevealed ? clamp(wp.progress * 1.3, 0.3, 1) : 0.3;
          drawInkCircle(
            ctx,
            tok.width / 2,
            0,
            tok.width * 0.58 + 5,
            effectiveFontSize * 0.62,
            cfg.accentColor,
            prog
          );
        }
        ctx.restore();
        continue;
      }

      // 13. GARIS BAWAH: clean uppercase no panel, keyword bolder with accent underline
      if (styleId === 'garis_bawah') {
        ctx.globalAlpha *= wp.isRevealed ? 1 : 0.62;
        drawSubtitleText(
          ctx,
          tok.word,
          0,
          0,
          tok.isEmphasis ? cfg.accentColor : cfg.textColor,
          {
            outlineWidth: 4.5,
            outlineColor: 'rgba(6, 9, 19, 0.85)',
            shadowBlur: 8,
          }
        );
        if (tok.isEmphasis) {
          ctx.fillStyle = cfg.accentColor;
          ctx.fillRect(0, effectiveFontSize * 0.48, tok.width, 3);
        }
        ctx.restore();
        continue;
      }

      // 14. SOROT KATA: clean text over the sliding pill
      drawSubtitleText(ctx, tok.word, 0, 0, cfg.textColor, {
        outlineWidth: 4,
        outlineColor: 'rgba(0,0,0,0.78)',
      });
      ctx.restore();
    }
  }

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
  palette?: PalettePreset,
  audioDataUrl?: string,
  audioDurationSec?: number
): void {
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  if (palette?.isLight) {
    bg.addColorStop(0, palette.bg);
    bg.addColorStop(1, palette.secondary || '#E2E8F0');
  } else {
    bg.addColorStop(0, palette?.bg || '#0B0E14');
    bg.addColorStop(1, '#131B2E');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = palette?.primary || '#38BDF8';
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.42, Math.min(width, height) * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.setLineDash([5, 5]);
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
    audioDataUrl,
    audioDurationSec,
  });

  ctx.restore();
}


