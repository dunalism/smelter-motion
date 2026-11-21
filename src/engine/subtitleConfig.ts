import type {
  PalettePreset,
  SubtitleSettings,
  SubtitleStyle,
} from '../types/studio';
import {
  SUBTITLE_STYLES_MAP,
  type SubtitleStyleDefinition,
} from './subtitleStylesData';

export {
  SUBTITLE_STYLES,
  SUBTITLE_STYLES_MAP,
  type SubtitleStyleDefinition,
} from './subtitleStylesData';

const LEGACY_STYLE_FALLBACK: Record<string, SubtitleStyle> = {
  clean: 'garis_bawah',
  boxed: 'kotak_gelap',
  'ivory-capsule': 'kartu_selotip',
  'clean-minimal': 'garis_bawah',
  'editorial-serif': 'elegan_atas',
  'cinematic-caption': 'elegan_atas',
  'minimal-underline': 'garis_bawah',
  'split-editorial': 'elegan_atas',
  'modern-bold': 'pop_tebal',
  'dynamic-capsule': 'sorot_kata',
  'gradient-typography': 'karaoke',
  'stacked-words': 'satu_kata',
  'floating-caption': 'kotak_gelap',
  'kinetic-pop': 'pop_tebal',
  'bounce-typography': 'pop_tebal',
  'staggered-text': 'kotak_putih',
  'scale-emphasis': 'pop_tebal',
  'vertical-reveal': 'panduan_atas',
  'directional-slide': 'sorot_kata',
  'letter-spacing-reveal': 'elegan_atas',
  handwritten: 'tulisan_tangan',
  'marker-highlight': 'kartu_selotip',
  'sketch-caption': 'tulisan_tangan',
  'text-stamp': 'stiker_kertas',
  'chalk-typography': 'tulisan_tangan',
  'cutout-typography': 'stiker_kertas',
  'scribble-underline': 'tulisan_tangan',
  'cinematic-fade': 'elegan_atas',
  'dramatic-reveal': 'kotak_gelap',
  'blur-reveal': 'elegan_atas',
  'glitch-typography': 'glitch',
  'shadow-depth': 'pop_tebal',
  'focus-word': 'kotak_gelap',
};

export function getSubtitleStyleDef(id?: SubtitleStyle | string): SubtitleStyleDefinition {
  if (id && id in SUBTITLE_STYLES_MAP) {
    return SUBTITLE_STYLES_MAP[id as SubtitleStyle];
  }
  if (id && id in LEGACY_STYLE_FALLBACK) {
    return SUBTITLE_STYLES_MAP[LEGACY_STYLE_FALLBACK[id]];
  }
  return SUBTITLE_STYLES_MAP.kotak_gelap;
}

export interface ResolvedSubtitleConfig {
  styleDef: SubtitleStyleDefinition;
  fontSize: number;
  verticalPercent: number;
  accentColor: string;
  textColor: string;
}

export function resolveSubtitleConfig(
  subtitles: SubtitleSettings,
  palette?: PalettePreset
): ResolvedSubtitleConfig {
  const styleDef = getSubtitleStyleDef(subtitles.style);

  const verticalPercent = styleDef.hasFixedPosition
    ? styleDef.defaultVerticalPercent
    : subtitles.position === 'lower-third'
      ? 77
      : styleDef.defaultVerticalPercent;

  const accentColor =
    subtitles.accentColor && subtitles.accentColor.trim()
      ? subtitles.accentColor.trim()
      : styleDef.accentColor;

  let textColor = styleDef.textColor;
  if (
    palette?.isLight &&
    (styleDef.id === 'garis_bawah' ||
      styleDef.id === 'tulisan_tangan' ||
      styleDef.id === 'elegan_atas' ||
      styleDef.id === 'panduan_atas' ||
      styleDef.id === 'pop_tebal' ||
      styleDef.id === 'karaoke' ||
      styleDef.id === 'sorot_kata' ||
      styleDef.id === 'satu_kata' ||
      styleDef.id === 'mesin_ketik')
  ) {
    textColor = palette.text || '#1E293B';
  }

  return {
    styleDef,
    fontSize: clampFontSize(subtitles.fontSize || 28),
    verticalPercent,
    accentColor,
    textColor,
  };
}

function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return 28;
  return Math.max(18, Math.min(48, size));
}

const STOPWORDS_ID_EN = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada',
  'adalah', 'akan', 'atau', 'juga', 'bisa', 'dapat', 'dalam', 'tidak', 'ada',
  'jadi', 'kamu', 'kita', 'saya', 'aku', 'mereka', 'dia', 'nya', 'saat', 'kalau',
  'jika', 'karena', 'supaya', 'agar', 'lebih', 'sangat', 'hanya', 'sudah', 'belum',
  'masih', 'bukan', 'semua', 'setiap', 'antara', 'seperti', 'lalu', 'kemudian',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you',
  'are', 'was', 'were', 'will', 'can', 'just', 'not', 'but', 'have', 'has',
]);

export function extractAutoEmphasisKeywords(narration: string, maxKeywords: number = 2): string[] {
  const words = narration
    .split(/\s+/)
    .map((w) => w.replace(/^[.,!?;:"'()[\]]+|[.,!?;:"'()[\]]+$/g, ''))
    .filter((w) => w.length >= 4);

  const scored: Array<{ word: string; score: number; idx: number }> = [];
  const seen = new Set<string>();

  words.forEach((word, idx) => {
    const lower = word.toLowerCase();
    if (seen.has(lower) || STOPWORDS_ID_EN.has(lower)) return;
    seen.add(lower);

    let score = word.length;
    if (/^[A-Z]/.test(word) && idx > 0) score += 4;
    if (/\d/.test(word)) score += 5;
    if (word.length >= 7) score += 2;
    scored.push({ word, score, idx });
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.slice(0, maxKeywords).map((s) => s.word);
}
